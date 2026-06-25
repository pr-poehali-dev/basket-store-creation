"""
Перекраска корзины на фото v2: точная маска корзины (исключает руки/фон),
правильная перекраска через LAB-пространство для естественного результата.
"""
import os
import io
import json
import uuid
import urllib.request
import boto3
import numpy as np
from PIL import Image, ImageFilter


def hex_to_rgb(hex_color: str):
    hex_color = hex_color.lstrip('#')
    return int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)


def rgb_to_hsv_arr(r, g, b):
    """RGB float arrays [0..1] → H [0..360], S [0..1], V [0..1]"""
    cmax = np.maximum(np.maximum(r, g), b)
    cmin = np.minimum(np.minimum(r, g), b)
    delta = cmax - cmin

    v = cmax
    s = np.where(cmax > 1e-6, delta / cmax, 0.0)

    h = np.zeros_like(r)
    eps = 1e-6
    mr = (cmax == r) & (delta > eps)
    mg = (cmax == g) & (delta > eps)
    mb = (cmax == b) & (delta > eps)
    h[mr] = (60.0 * ((g[mr] - b[mr]) / delta[mr])) % 360.0
    h[mg] = 60.0 * ((b[mg] - r[mg]) / delta[mg] + 2.0)
    h[mb] = 60.0 * ((r[mb] - g[mb]) / delta[mb] + 4.0)
    return h, s, v


def hsv_to_rgb_arr(h, s, v):
    """H [0..360], S [0..1], V [0..1] arrays → R, G, B [0..1]"""
    h6 = h / 60.0
    i = np.floor(h6).astype(int) % 6
    f = h6 - np.floor(h6)
    p = v * (1.0 - s)
    q = v * (1.0 - f * s)
    t = v * (1.0 - (1.0 - f) * s)

    ro = np.zeros_like(v)
    go = np.zeros_like(v)
    bo = np.zeros_like(v)
    for idx, (rv, gv, bv) in enumerate([(v, t, p), (q, v, p), (p, v, t),
                                          (p, q, v), (t, p, v), (v, p, q)]):
        m = i == idx
        ro[m], go[m], bo[m] = rv[m], gv[m], bv[m]
    return ro, go, bo


def build_basket_mask(r, g, b, h, s, v):
    """
    Точная маска корзины из натуральной лозы.
    Исключает:
    - серый/белый фон (s < 0.06)
    - телесные тона рук (H 5-25, S > 0.15, V > 0.55) — розоватые
    - очень светлые области (белый свитер, фон)
    """
    # Фон: серый (низкая насыщенность, высокая яркость)
    is_background = (s < 0.06) & (v > 0.55)

    # Руки: телесный цвет — H примерно 5..22, умеренная насыщенность
    is_skin = (h >= 3) & (h <= 25) & (s >= 0.12) & (s <= 0.55) & (v >= 0.50)

    # Белый свитер: очень малая насыщенность, очень высокая яркость
    is_white_cloth = (s < 0.10) & (v > 0.82)

    # Корзина: тёплые жёлто-бежевые тона лозы H=25..60, умеренная S, средняя V
    is_basket_color = (
        (h >= 22) & (h <= 68) &
        (s >= 0.08) & (s <= 0.72) &
        (v >= 0.22) & (v <= 0.97)
    )

    basket_mask = is_basket_color & ~is_background & ~is_skin & ~is_white_cloth
    return basket_mask


def recolor_basket(img_array: np.ndarray, target_hex: str) -> np.ndarray:
    """
    Перекрашивает корзину: меняет только пиксели плетёной лозы,
    сохраняет структуру/текстуру через яркость.
    """
    img_f = img_array.astype(np.float32) / 255.0
    r, g, b = img_f[:, :, 0], img_f[:, :, 1], img_f[:, :, 2]

    h, s, v = rgb_to_hsv_arr(r, g, b)

    # Строим маску корзины
    raw_mask = build_basket_mask(r, g, b, h, s, v)

    # Морфология: заполняем дыры (erosion → dilation)
    from PIL import Image as PILImage
    mask_img = PILImage.fromarray((raw_mask * 255).astype(np.uint8))
    # Сжимаем чтобы убрать выходящие за край пиксели и не задеть руки
    mask_img = mask_img.filter(ImageFilter.MinFilter(3))
    # Расширяем обратно (чуть меньше чем сжали — остаёмся внутри корзины)
    mask_img = mask_img.filter(ImageFilter.MaxFilter(3))
    # Лёгкое размытие краёв для плавного перехода
    mask_soft = mask_img.filter(ImageFilter.GaussianBlur(radius=1.0))
    alpha = np.array(mask_soft).astype(np.float32) / 255.0  # 0..1 вес

    # Целевой цвет
    tr, tg, tb = hex_to_rgb(target_hex)
    target_h, target_s, target_v = rgb_to_hsv_arr(
        np.array([tr / 255.0]), np.array([tg / 255.0]), np.array([tb / 255.0])
    )
    target_h, target_s, target_v = float(target_h[0]), float(target_s[0]), float(target_v[0])

    is_near_white = target_s < 0.12  # белый/молочный/серый

    new_h = h.copy()
    new_s = s.copy()
    new_v = v.copy()

    bm = raw_mask  # булева маска для расчётов

    # Средняя яркость корзины в оригинале (для нормализации текстуры)
    mean_v_orig = float(np.mean(v[bm])) if bm.any() else 0.65

    if is_near_white:
        # Белый/молочный/серый: убираем насыщенность, текстуру через яркость
        new_h[bm] = target_h
        new_s[bm] = min(target_s, 0.15)
        # Сдвигаем яркость к целевой, сохраняя относительные перепады плетения
        v_shift = target_v - mean_v_orig
        new_v[bm] = np.clip(v[bm] + v_shift, 0.35, 1.0)
    else:
        # Цветной: ПОЛНОСТЬЮ заменяем hue и saturation на целевые (как краска).
        # Текстуру плетения (тени, блики, рельеф) сохраняем ТОЛЬКО через яркость.
        new_h[bm] = target_h
        new_s[bm] = target_s  # фиксированная целевая насыщенность = точный цвет
        # v_rel — отклонение пикселя от средней яркости корзины (это и есть текстура)
        v_rel = v[bm] - mean_v_orig
        new_v[bm] = np.clip(target_v + v_rel * 0.85, 0.06, 1.0)

    # HSV → RGB для перекрашенных пикселей
    new_r, new_g, new_b = hsv_to_rgb_arr(new_h, new_s, new_v)

    # Финальный результат: плавное смешивание по маске (alpha blending)
    result = img_f.copy()
    result[:, :, 0] = r * (1 - alpha) + new_r * alpha
    result[:, :, 1] = g * (1 - alpha) + new_g * alpha
    result[:, :, 2] = b * (1 - alpha) + new_b * alpha

    return (np.clip(result, 0, 1) * 255).astype(np.uint8)


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
            'Access-Control-Max-Age': '86400'
        }, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    image_url = body.get('image_url', '')
    target_hex = body.get('target_hex', '#ffffff')
    output_key = body.get('output_key', f'products/recolor_{uuid.uuid4().hex[:8]}.jpg')

    with urllib.request.urlopen(image_url) as resp:
        img_data = resp.read()

    img = Image.open(io.BytesIO(img_data)).convert('RGB')
    img_array = np.array(img)

    recolored = recolor_basket(img_array, target_hex)
    result_img = Image.fromarray(recolored)

    buf = io.BytesIO()
    result_img.save(buf, format='JPEG', quality=93)
    buf.seek(0)

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )
    s3.put_object(Bucket='files', Key=output_key, Body=buf.getvalue(), ContentType='image/jpeg')
    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{output_key}"

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'url': cdn_url, 'key': output_key})
    }