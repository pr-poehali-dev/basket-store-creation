"""
Перекраска корзины на фото: меняет оттенок плетёной корзины, сохраняя фон и руки.
Принимает URL оригинала и целевой цвет (HEX), возвращает URL перекрашенного фото в S3.
"""
import os
import io
import json
import uuid
import urllib.request
import boto3
import numpy as np
from PIL import Image, ImageFilter


def hex_to_hsv(hex_color: str):
    """Конвертирует HEX → (H 0-360, S 0-1, V 0-1)"""
    hex_color = hex_color.lstrip('#')
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    r_, g_, b_ = r / 255.0, g / 255.0, b / 255.0
    cmax = max(r_, g_, b_)
    cmin = min(r_, g_, b_)
    delta = cmax - cmin
    # Hue
    if delta == 0:
        h = 0
    elif cmax == r_:
        h = 60 * (((g_ - b_) / delta) % 6)
    elif cmax == g_:
        h = 60 * (((b_ - r_) / delta) + 2)
    else:
        h = 60 * (((r_ - g_) / delta) + 4)
    s = 0 if cmax == 0 else delta / cmax
    v = cmax
    return h, s, v


def recolor_basket(img_array: np.ndarray, target_hex: str) -> np.ndarray:
    """
    Перекрашивает плетёную корзину из натурального цвета в целевой.
    Стратегия:
    1. Определяем пиксели корзины по диапазону натурального цвета (тёплые бежевые тона).
    2. Меняем hue этих пикселей на целевой, сохраняя структуру плетения через value (яркость).
    """
    img_hsv = img_array.astype(np.float32) / 255.0

    # Конвертируем RGB → HSV вручную через numpy
    r = img_hsv[:, :, 0]
    g = img_hsv[:, :, 1]
    b = img_hsv[:, :, 2]

    cmax = np.maximum(np.maximum(r, g), b)
    cmin = np.minimum(np.minimum(r, g), b)
    delta = cmax - cmin

    # Value
    v = cmax

    # Saturation
    s = np.where(cmax > 0, delta / cmax, 0.0)

    # Hue
    h = np.zeros_like(r)
    mask_r = (cmax == r) & (delta > 0)
    mask_g = (cmax == g) & (delta > 0)
    mask_b = (cmax == b) & (delta > 0)
    h[mask_r] = (60 * ((g[mask_r] - b[mask_r]) / delta[mask_r])) % 360
    h[mask_g] = 60 * ((b[mask_g] - r[mask_g]) / delta[mask_g] + 2)
    h[mask_b] = 60 * ((r[mask_b] - g[mask_b]) / delta[mask_b] + 4)

    # Маска корзины: натуральная лоза имеет тёплый бежево-коричневый оттенок
    # H: 20-55 (жёлто-оранжевый диапазон), S > 0.05 (не серый), V > 0.25 (не чёрный)
    basket_mask = (
        (h >= 15) & (h <= 65) &
        (s >= 0.05) & (s <= 0.75) &
        (v >= 0.25)
    )

    # Расширяем маску чуть-чуть для захвата краёв
    from PIL import Image as PILImage
    mask_img = PILImage.fromarray((basket_mask * 255).astype(np.uint8))
    mask_img = mask_img.filter(ImageFilter.MaxFilter(3))
    basket_mask = np.array(mask_img) > 127

    # Целевой цвет
    target_h, target_s, target_v = hex_to_hsv(target_hex)

    # Специальная обработка для белого/молочного (низкая насыщенность)
    is_near_white = target_s < 0.15

    # Новый hue и saturation для пикселей корзины
    new_h = h.copy()
    new_s = s.copy()
    new_v = v.copy()

    if is_near_white:
        # Для белых/светлых цветов: убираем насыщенность, поднимаем яркость
        new_s[basket_mask] = s[basket_mask] * 0.1
        # Яркость: сохраняем структуру плетения, но поднимаем общий уровень
        brightness_boost = target_v - np.mean(v[basket_mask]) + 0.05
        new_v[basket_mask] = np.clip(v[basket_mask] + brightness_boost, 0.5, 1.0)
    else:
        # Меняем оттенок на целевой
        new_h[basket_mask] = target_h
        # Насыщенность: берём целевую, но сохраняем вариацию структуры плетения
        s_ratio = s[basket_mask] / (np.mean(s[basket_mask]) + 1e-6)
        new_s[basket_mask] = np.clip(target_s * s_ratio, 0.0, 1.0)
        # Яркость: сохраняем оригинальную структуру, корректируем под целевую яркость
        v_ratio = v[basket_mask] / (np.mean(v[basket_mask]) + 1e-6)
        new_v[basket_mask] = np.clip(target_v * v_ratio, 0.1, 1.0)

    # Конвертируем HSV → RGB
    h_60 = new_h / 60.0
    i = np.floor(h_60).astype(int) % 6
    f = h_60 - np.floor(h_60)
    p = new_v * (1 - new_s)
    q = new_v * (1 - f * new_s)
    t = new_v * (1 - (1 - f) * new_s)

    result = img_hsv.copy()

    for idx in range(6):
        m = (i == idx) & basket_mask
        if idx == 0:
            result[m, 0], result[m, 1], result[m, 2] = new_v[m], t[m], p[m]
        elif idx == 1:
            result[m, 0], result[m, 1], result[m, 2] = q[m], new_v[m], p[m]
        elif idx == 2:
            result[m, 0], result[m, 1], result[m, 2] = p[m], new_v[m], t[m]
        elif idx == 3:
            result[m, 0], result[m, 1], result[m, 2] = p[m], q[m], new_v[m]
        elif idx == 4:
            result[m, 0], result[m, 1], result[m, 2] = t[m], p[m], new_v[m]
        elif idx == 5:
            result[m, 0], result[m, 1], result[m, 2] = new_v[m], p[m], q[m]

    return (np.clip(result, 0, 1) * 255).astype(np.uint8)


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    image_url = body.get('image_url', '')
    target_hex = body.get('target_hex', '#ffffff')
    output_key = body.get('output_key', f'products/recolor_{uuid.uuid4().hex[:8]}.jpg')

    # Загружаем оригинал
    with urllib.request.urlopen(image_url) as resp:
        img_data = resp.read()

    img = Image.open(io.BytesIO(img_data)).convert('RGB')
    img_array = np.array(img)

    # Перекрашиваем
    recolored = recolor_basket(img_array, target_hex)
    result_img = Image.fromarray(recolored)

    # Сохраняем в S3
    buf = io.BytesIO()
    result_img.save(buf, format='JPEG', quality=92)
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
