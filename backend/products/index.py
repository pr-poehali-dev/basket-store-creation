"""API для управления товарами каталога: получение, создание, обновление, удаление."""
import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")

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
            cur.execute("SELECT id, name, description, shape, size, color, price, sale_price, image_url FROM products ORDER BY id")
            rows = cur.fetchall()
            products = [
                {'id': r[0], 'name': r[1], 'description': r[2], 'shape': r[3],
                 'size': r[4], 'color': r[5], 'price': r[6], 'sale_price': r[7], 'image_url': r[8]}
                for r in rows
            ]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'products': products})}

        elif method == 'POST':
            sale_price = body.get('sale_price') or None
            cur.execute(
                "INSERT INTO products (name, description, shape, size, color, price, sale_price, image_url) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (body.get('name',''), body.get('description',''), body.get('shape','Круглые'),
                 body.get('size','Средние'), body.get('color',''), body.get('price',0), sale_price, body.get('image_url',''))
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'id': new_id})}

        elif method == 'PUT':
            pid = body.get('id')
            sale_price = body.get('sale_price') or None
            cur.execute(
                "UPDATE products SET name=%s, description=%s, shape=%s, size=%s, color=%s, price=%s, sale_price=%s, image_url=%s, updated_at=NOW() WHERE id=%s",
                (body.get('name',''), body.get('description',''), body.get('shape','Круглые'),
                 body.get('size','Средние'), body.get('color',''), body.get('price',0), sale_price, body.get('image_url',''), pid)
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
