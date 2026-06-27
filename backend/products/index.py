"""API для управления товарами каталога: получение (с группировкой), создание, обновление, удаление."""
import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

FIELD_MAP = {
    'размер': 'size',
    'цвет': 'color',
    'набор': 'набор',
}

def parse_fields(s):
    if not s:
        return []
    result = []
    for part in s.split(';'):
        key = part.strip().lower()
        if key:
            result.append(FIELD_MAP.get(key, key))
    return result

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")

def row_to_dict(r):
    images = r[19] if r[19] else []
    if isinstance(images, str):
        try: images = json.loads(images)
        except: images = []
    # Первое фото берём из images[0] или из image_url для обратной совместимости
    image_url = r[8] or ''
    if images and not image_url:
        image_url = images[0]
    return {
        'id': r[0], 'name': r[1], 'description': r[2], 'shape': r[3],
        'size': r[4], 'color': r[5], 'price': r[6], 'sale_price': r[7],
        'image_url': image_url, 'group_id': r[9], 'group_by': r[10], 'split_by': r[11],
        'набор': r[12], 'size_category': r[13],
        'labels': r[14], 'priority': r[15], 'weave_type': r[16], 'handles_count': r[17],
        'sku': r[18],
        'images': images,
        'video_url': r[20] or '',
    }

def build_cards(rows):
    ungrouped = [p for p in rows if not p['group_id']]
    grouped_map = {}
    for p in rows:
        if p['group_id']:
            grouped_map.setdefault(p['group_id'], []).append(p)

    cards = []
    for p in ungrouped:
        cards.append({'type': 'single', 'variants': [p]})

    for gid, items in grouped_map.items():
        first = items[0]
        split_fields = parse_fields(first['split_by'])
        if not split_fields:
            cards.append({'type': 'group', 'group_id': gid, 'variants': items})
        else:
            sub_groups = {}
            for item in items:
                key_parts = [str(item.get(f) or '') for f in split_fields]
                key_parts.append(str(item.get('name') or ''))
                key = '|||'.join(key_parts)
                sub_groups.setdefault(key, []).append(item)
            for key, sub_items in sub_groups.items():
                cards.append({'type': 'group', 'group_id': gid, 'variants': sub_items})

    cards.sort(key=lambda c: (c['variants'][0].get('priority') is None, c['variants'][0].get('priority') or 0))
    return cards

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    body = json.loads(event.get('body') or '{}')
    params = event.get('queryStringParameters') or {}

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == 'GET':
            raw = params.get('raw') == '1'
            cur.execute("""
                SELECT id, name, description, shape, size, color, price, sale_price,
                       image_url, group_id, group_by, split_by, набор, size_category,
                       labels, priority, weave_type, handles_count, sku,
                       images, video_url
                FROM products ORDER BY priority NULLS LAST, id
            """)
            rows = [row_to_dict(r) for r in cur.fetchall()]

            if raw:
                return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'products': rows}, ensure_ascii=False)}

            cards = build_cards(rows)
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'cards': cards}, ensure_ascii=False)}

        elif method == 'POST':
            sale_price = body.get('sale_price') or None
            priority = body.get('priority') or None
            sku = body.get('sku') or None
            images = body.get('images', [])
            image_url = body.get('image_url') or (images[0] if images else '')
            cur.execute(
                """INSERT INTO products (name, description, shape, size, color, price, sale_price,
                   image_url, group_id, group_by, split_by, labels, priority, weave_type, handles_count, sku, images, video_url)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                (body.get('name',''), body.get('description',''), body.get('shape','Круглые'),
                 body.get('size','Средние'), body.get('color',''), body.get('price',0), sale_price,
                 image_url, body.get('group_id') or None,
                 body.get('group_by') or None, body.get('split_by') or None,
                 body.get('labels') or None, priority,
                 body.get('weave_type') or None, body.get('handles_count') or None, sku,
                 json.dumps(images, ensure_ascii=False), body.get('video_url') or '')
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'id': new_id})}

        elif method == 'PUT':
            pid = body.get('id')
            sale_price = body.get('sale_price') or None
            priority = body.get('priority') or None
            sku = body.get('sku') or None
            images = body.get('images', [])
            image_url = body.get('image_url') or (images[0] if images else '')
            cur.execute(
                """UPDATE products SET name=%s, description=%s, shape=%s, size=%s, color=%s,
                   price=%s, sale_price=%s, image_url=%s, group_id=%s, group_by=%s, split_by=%s,
                   labels=%s, priority=%s, weave_type=%s, handles_count=%s, sku=%s,
                   images=%s, video_url=%s, updated_at=NOW() WHERE id=%s""",
                (body.get('name',''), body.get('description',''), body.get('shape','Круглые'),
                 body.get('size','Средние'), body.get('color',''), body.get('price',0), sale_price,
                 image_url, body.get('group_id') or None,
                 body.get('group_by') or None, body.get('split_by') or None,
                 body.get('labels') or None, priority,
                 body.get('weave_type') or None, body.get('handles_count') or None, sku,
                 json.dumps(images, ensure_ascii=False), body.get('video_url') or '', pid)
            )
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        elif method == 'DELETE':
            pid = params.get('id') or body.get('id')
            cur.execute("DELETE FROM products WHERE id=%s", (pid,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    finally:
        cur.close()
        conn.close()

    return {'statusCode': 405, 'headers': CORS, 'body': json.dumps({'error': 'Method not allowed'})}