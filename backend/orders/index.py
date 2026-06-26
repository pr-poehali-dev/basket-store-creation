"""
API заказов для канбан-доски админки FABRICA.
GET — список всех заказов; POST — создать заказ (из оформления на сайте);
PUT — обновить этап/порядок заказа (перетаскивание на канбане).
"""
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor


STAGES = ['Новый заказ', 'Согласование', 'Оплата', 'Плетение',
          'Малярка', 'Упаковка', 'Доставка', 'Отправили']


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
        'Access-Control-Max-Age': '86400',
    }


def handler(event: dict, context) -> dict:
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    conn = get_conn()
    conn.autocommit = True

    try:
        if method == 'GET':
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, order_number, stage, city, customer_name, phone, "
                    "total, delivery_label, payment_method, items, form, sort_order, "
                    "created_at, responsible, due_date, delivery_type, produced "
                    "FROM orders ORDER BY sort_order ASC, created_at DESC"
                )
                rows = cur.fetchall()
            orders = []
            for r in rows:
                orders.append({
                    'id': r['id'],
                    'order_number': r['order_number'],
                    'stage': r['stage'],
                    'city': r['city'] or '',
                    'customer_name': r['customer_name'] or '',
                    'phone': r['phone'] or '',
                    'total': r['total'],
                    'delivery_label': r['delivery_label'] or '',
                    'payment_method': r['payment_method'] or '',
                    'items': r['items'] or [],
                    'form': r['form'] or {},
                    'sort_order': r['sort_order'],
                    'created_at': r['created_at'].isoformat() if r['created_at'] else None,
                    'responsible': r['responsible'] or '',
                    'due_date': r['due_date'].isoformat() if r['due_date'] else '',
                    'delivery_type': r['delivery_type'] or '',
                    'produced': r['produced'] or {},
                })
            return {'statusCode': 200, 'headers': cors_headers(),
                    'body': json.dumps({'orders': orders})}

        body = json.loads(event.get('body') or '{}')

        if method == 'POST':
            order_number = str(body.get('order_number', ''))
            stage = body.get('stage', 'Новый заказ')
            if stage not in STAGES:
                stage = 'Новый заказ'
            city = body.get('city', '')
            customer_name = body.get('customer_name', '')
            phone = body.get('phone', '')
            total = int(body.get('total', 0) or 0)
            delivery_label = body.get('delivery_label', '')
            payment_method = body.get('payment_method', '')
            delivery_type = body.get('delivery_type', '')
            items = json.dumps(body.get('items', []), ensure_ascii=False)
            form = json.dumps(body.get('form', {}), ensure_ascii=False)

            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO orders (order_number, stage, city, customer_name, phone, "
                    "total, delivery_label, payment_method, delivery_type, items, form) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                    (order_number, stage, city, customer_name, phone, total,
                     delivery_label, payment_method, delivery_type, items, form)
                )
                new_id = cur.fetchone()[0]
            return {'statusCode': 200, 'headers': cors_headers(),
                    'body': json.dumps({'id': new_id, 'order_number': order_number})}

        if method == 'PUT':
            order_id = int(body.get('id'))
            fields = []
            values = []
            if 'stage' in body and body['stage'] in STAGES:
                fields.append('stage = %s')
                values.append(body['stage'])
            if 'sort_order' in body:
                fields.append('sort_order = %s')
                values.append(int(body['sort_order']))
            if 'responsible' in body:
                fields.append('responsible = %s')
                values.append(body['responsible'] or None)
            if 'due_date' in body:
                fields.append('due_date = %s')
                values.append(body['due_date'] or None)
            if 'delivery_type' in body:
                fields.append('delivery_type = %s')
                values.append(body['delivery_type'] or None)
            if 'produced' in body:
                fields.append('produced = %s')
                values.append(json.dumps(body['produced'], ensure_ascii=False))
            if not fields:
                return {'statusCode': 400, 'headers': cors_headers(),
                        'body': json.dumps({'error': 'nothing to update'})}
            fields.append('updated_at = NOW()')
            values.append(order_id)
            with conn.cursor() as cur:
                cur.execute(f"UPDATE orders SET {', '.join(fields)} WHERE id = %s", values)
            return {'statusCode': 200, 'headers': cors_headers(),
                    'body': json.dumps({'ok': True})}

        if method == 'DELETE':
            order_id = int(event.get('queryStringParameters', {}).get('id'))
            with conn.cursor() as cur:
                cur.execute("DELETE FROM orders WHERE id = %s", (order_id,))
            return {'statusCode': 200, 'headers': cors_headers(),
                    'body': json.dumps({'ok': True})}

        return {'statusCode': 405, 'headers': cors_headers(),
                'body': json.dumps({'error': 'method not allowed'})}
    finally:
        conn.close()