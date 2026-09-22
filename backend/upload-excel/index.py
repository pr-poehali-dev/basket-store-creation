"""Загрузка товаров из Excel. При наличии артикула (sku) — обновляет существующий товар, иначе создаёт новый."""
import json
import os
import base64
import io
import re
import psycopg2
import openpyxl

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

VALID_SHAPES = ['Круглые', 'Овальные', 'Прямоугольные', 'Сердечки']

def get_size_category(size_str: str) -> str:
    if not size_str:
        return ''
    nums = re.findall(r'\d+', size_str.replace(',', '.'))
    if not nums:
        return ''
    first = int(nums[0])
    if first < 30:
        return 'до 30 см'
    elif first <= 50:
        return '30-50 см'
    else:
        return '50-120 см'

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")

def import_handbook(file_b64, mode='append'):
    """Импорт справочника позиций. mode='append' — обновление по id/названию, mode='replace' — полная замена: всё, чего нет в файле, удаляется."""
    wb = openpyxl.load_workbook(io.BytesIO(base64.b64decode(file_b64)))
    ws = wb.active
    # Шапка на 2-й строке (1-я — подсказка по столбцам)
    hdr = [str(c.value).strip().lower() if c.value else '' for c in next(ws.iter_rows(min_row=2, max_row=2))]

    def g(row, name):
        for i, h in enumerate(hdr):
            if h.startswith(name):
                return row[i].value if i < len(row) else None
        return None

    def num(v):
        try: return float(str(v).replace(',', '.')) if v not in (None, '') else 0
        except Exception: return 0

    conn = get_conn(); cur = conn.cursor()
    upd = ins = 0
    kept_ids = []

    # Существующие позиции для сопоставления по названию для зп
    cur.execute("SELECT id, LOWER(TRIM(staff_name)) FROM handbook_positions ORDER BY id")
    by_name = {}
    for r in cur.fetchall():
        by_name.setdefault(r[1], []).append(r[0])
    seen_names = {}
    dup_names = []

    for row in ws.iter_rows(min_row=3):
        staff_name = g(row, 'название для зп')
        if not staff_name or not str(staff_name).strip():
            continue
        sn = str(staff_name).strip()
        vals = (
            sn,
            str(g(row, 'подкатегория') or '').strip(),
            str(g(row, 'название на складе') or '').strip(),
            str(g(row, 'вид плетения') or '').strip(),
            num(g(row, 'цена с ручкой')), num(g(row, 'цена без ручки')),
            num(g(row, 'цена ручки')), num(g(row, 'цена ушей')), num(g(row, 'цена с ушами')),
            str(g(row, 'состав набора (склад)') or '').strip(),
            str(g(row, 'состав набора (зп)') or '').strip(),
            int(num(g(row, 'порядок'))),
            str(g(row, 'активна') or 'да').strip().lower() in ('да', 'true', '1', 'yes'),
        )
        rid = g(row, 'id')
        try:
            rid = int(rid) if rid not in (None, '') else None
        except Exception:
            rid = None
        key = sn.lower()
        cnt = seen_names.get(key, 0)
        seen_names[key] = cnt + 1
        if cnt:
            dup_names.append(sn)
        if rid is None:
            pool = by_name.get(key) or []
            rid = pool.pop(0) if pool else None

        if rid:
            cur.execute("""UPDATE handbook_positions SET staff_name=%s, position_group=%s,
                catalog_name=%s, weave_type=%s, price_whole=%s, price_no_handle=%s,
                price_handle=%s, price_ears=%s, price_whole_ears=%s, set_catalog_names=%s,
                set_staff_names=%s, sort_order=%s, is_active=%s, group_name=%s, price=%s, updated_at=NOW()
                WHERE id=%s""", vals + (sn, vals[4], rid))
            if cur.rowcount:
                upd += 1
                kept_ids.append(rid)
                continue
        cur.execute("""INSERT INTO handbook_positions (staff_name, position_group, catalog_name,
            weave_type, price_whole, price_no_handle, price_handle, price_ears, price_whole_ears,
            set_catalog_names, set_staff_names, sort_order, is_active, group_name, category, price)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'whole',%s) RETURNING id""", vals + (sn, vals[4]))
        kept_ids.append(cur.fetchone()[0])
        ins += 1

    deleted = 0
    if mode == 'replace':
        if kept_ids:
            ids = ','.join(str(i) for i in kept_ids)
            cur.execute(f"DELETE FROM handbook_price_history WHERE position_id NOT IN ({ids})")
            cur.execute(f"DELETE FROM handbook_positions WHERE id NOT IN ({ids})")
        else:
            cur.execute("DELETE FROM handbook_price_history")
            cur.execute("DELETE FROM handbook_positions")
        deleted = cur.rowcount

    cur.execute("SELECT COUNT(*) FROM handbook_positions")
    total = cur.fetchone()[0]
    conn.commit(); cur.close(); conn.close()
    res = {'ok': True, 'updated': upd, 'inserted': ins, 'deleted': deleted, 'total': total}
    if dup_names:
        res['duplicates'] = sorted(set(dup_names))[:20]
        res['duplicates_count'] = len(dup_names)
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(res, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    file_b64 = body.get('file')
    mode = body.get('mode', 'append')

    if body.get('type') == 'handbook' and file_b64:
        return import_handbook(file_b64, mode)

    if not file_b64:
        return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Файл не передан'})}

    file_bytes = base64.b64decode(file_b64)
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes))
    ws = wb.active

    headers = [str(c.value).strip().lower() if c.value else '' for c in next(ws.iter_rows(min_row=1, max_row=1))]

    def col(row, *names):
        for name in names:
            if name in headers:
                v = row[headers.index(name)].value
                return str(v).strip() if v is not None else ''
        return ''

    rows_data = []
    for row in ws.iter_rows(min_row=2):
        if not any(c.value for c in row):
            continue
        name = col(row, 'название', 'name')
        if not name:
            continue
        shape = col(row, 'форма', 'shape') or 'Круглые'
        if shape not in VALID_SHAPES:
            shape = 'Круглые'
        size = col(row, 'размер', 'size') or ''
        size_category = get_size_category(size)
        try:
            price = int(float(col(row, 'цена', 'price') or 0))
        except:
            price = 0
        sale_price_raw = col(row, 'цена по акции', 'sale_price', 'акция')
        try:
            sale_price = int(float(sale_price_raw)) if sale_price_raw else None
        except:
            sale_price = None
        priority_raw = col(row, 'приоритет', 'priority')
        try:
            priority = int(float(priority_raw)) if priority_raw else None
        except:
            priority = None

        rows_data.append({
            'sku': col(row, 'артикул', 'sku') or None,
            'name': name,
            'description': col(row, 'описание', 'description'),
            'shape': shape,
            'size': size,
            'size_category': size_category,
            'color': col(row, 'цвет', 'color'),
            'price': price,
            'sale_price': sale_price,
            'image_url': col(row, 'фото', 'image_url'),
            'group_id': col(row, 'группа', 'group_id') or None,
            'group_by': col(row, 'группировать по', 'group_by') or None,
            'split_by': col(row, 'разделить по', 'split_by') or None,
            'labels': col(row, 'метки', 'labels') or None,
            'priority': priority,
            'weave_type': col(row, 'вид плетения', 'weave_type') or None,
            'handles_count': col(row, 'кол-во ручек', 'handles_count') or None,
        })

    conn = get_conn()
    cur = conn.cursor()

    if mode == 'replace':
        cur.execute("DELETE FROM products")

    imported = 0
    for p in rows_data:
        if p['sku'] and mode != 'replace':
            # Upsert по артикулу
            cur.execute("SELECT id FROM products WHERE sku=%s", (p['sku'],))
            existing = cur.fetchone()
            if existing:
                cur.execute(
                    """UPDATE products SET name=%s, description=%s, shape=%s, size=%s, size_category=%s,
                       color=%s, price=%s, sale_price=%s, image_url=%s, group_id=%s, group_by=%s,
                       split_by=%s, labels=%s, priority=%s, weave_type=%s, handles_count=%s,
                       updated_at=NOW() WHERE id=%s""",
                    (p['name'], p['description'], p['shape'], p['size'], p['size_category'],
                     p['color'], p['price'], p['sale_price'], p['image_url'],
                     p['group_id'], p['group_by'], p['split_by'],
                     p['labels'], p['priority'], p['weave_type'], p['handles_count'], existing[0])
                )
                imported += 1
                continue
        cur.execute(
            """INSERT INTO products (sku, name, description, shape, size, size_category, color, price, sale_price,
               image_url, group_id, group_by, split_by, labels, priority, weave_type, handles_count)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (p['sku'], p['name'], p['description'], p['shape'], p['size'], p['size_category'],
             p['color'], p['price'], p['sale_price'], p['image_url'],
             p['group_id'], p['group_by'], p['split_by'],
             p['labels'], p['priority'], p['weave_type'], p['handles_count'])
        )
        imported += 1

    conn.commit()
    cur.close()
    conn.close()

    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'imported': imported})}
