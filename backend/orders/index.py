"""
API заказов для канбан-доски админки FABRICA. v2
GET — список всех заказов; POST — создать заказ;
PUT — обновить; DELETE — пометить удалённым.
"""
import os, json
import psycopg2
from psycopg2.extras import RealDictCursor


STAGES = ['Новый заказ', 'Согласование', 'Оплата', 'В очереди на плетение',
          'Плетение', 'Малярка', 'Упаковка', 'Доставка', 'Закрытые']


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
        'Access-Control-Max-Age': '86400',
    }


def row_to_order(r):
    return {
        'id': r['id'],
        'order_number': r['order_number'],
        'stage': r['stage'],
        'city': r['city'] or '',
        'customer_name': r['customer_name'] or '',
        'customer_phone': r['phone'] or '',
        'customer_email': r.get('customer_email') or '',
        'phone': r['phone'] or '',
        'total': r['total'],
        'discount': r.get('discount') or 0,
        'delivery_label': r.get('delivery_label') or '',
        'payment_method': r.get('payment_method') or '',
        'delivery_type': r.get('delivery_type') or '',
        'delivery_address': r.get('delivery_address') or '',
        'items': r['items'] or [],
        'form': r.get('form') or {},
        'sort_order': r.get('sort_order') or 0,
        'created_at': r['created_at'].isoformat() if r['created_at'] else None,
        'responsible': r.get('responsible') or '',
        'due_date': r['due_date'].isoformat() if r.get('due_date') else '',
        'due_weaving': r['due_weaving'].isoformat() if r.get('due_weaving') else '',
        'due_painting': r['due_painting'].isoformat() if r.get('due_painting') else '',
        'produced': r.get('produced') or {},
        'painted': r.get('painted') or {},
        'comment': r.get('comment') or '',
        'notes': r.get('notes') or '',
        'is_archived': bool(r.get('is_archived')),
        'is_trashed': bool(r.get('is_trashed')),
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
                    "total, discount, delivery_label, payment_method, items, form, sort_order, "
                    "created_at, responsible, due_date, delivery_type, delivery_address, produced, "
                    "due_weaving, due_painting, is_archived, is_trashed, painted, "
                    "comment, notes, customer_email "
                    "FROM orders ORDER BY sort_order ASC, created_at DESC"
                )
                rows = cur.fetchall()
            orders = [row_to_order(r) for r in rows]
            return {'statusCode': 200, 'headers': cors_headers(),
                    'body': json.dumps({'orders': orders})}

        body = json.loads(event.get('body') or '{}')

        if method == 'POST':
            order_number  = str(body.get('order_number', ''))
            stage         = body.get('stage', 'Новый заказ')
            if stage not in STAGES: stage = 'Новый заказ'
            city          = body.get('city', '')
            customer_name = body.get('customer_name', '')
            phone         = body.get('phone', '')
            customer_email = body.get('customer_email') or body.get('email', '')
            total         = int(body.get('total', 0) or 0)
            discount      = int(body.get('discount', 0) or 0)
            delivery_label = body.get('delivery_label', '')
            payment_method = body.get('payment_method', '')
            delivery_type  = body.get('delivery_type', '')
            delivery_address = body.get('delivery_address', '')
            comment       = body.get('comment', '')
            items = json.dumps(body.get('items', []), ensure_ascii=False)
            form  = json.dumps(body.get('form', {}), ensure_ascii=False)

            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO orders (order_number, stage, city, customer_name, phone, "
                    "customer_email, total, discount, delivery_label, payment_method, "
                    "delivery_type, delivery_address, comment, items, form) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                    (order_number, stage, city, customer_name, phone, customer_email,
                     total, discount, delivery_label, payment_method,
                     delivery_type, delivery_address, comment, items, form)
                )
                new_id = cur.fetchone()[0]

            return {'statusCode': 200, 'headers': cors_headers(),
                    'body': json.dumps({'id': new_id, 'order_number': order_number})}

        if method == 'PUT':
            order_id = int(body.get('id'))
            fields, values = [], []
            updatable = {
                'stage': lambda v: v if v in STAGES else None,
                'sort_order': int,
                'responsible': lambda v: v or None,
                'due_date': lambda v: v or None,
                'due_weaving': lambda v: v or None,
                'due_painting': lambda v: v or None,
                'delivery_type': lambda v: v or None,
                'delivery_address': str,
                'discount': int,
                'notes': str,
                'comment': str,
                'customer_email': str,
                'produced': lambda v: json.dumps(v, ensure_ascii=False),
                'painted':  lambda v: json.dumps(v, ensure_ascii=False),
                'is_archived': bool,
                'is_trashed': bool,
            }
            for key, converter in updatable.items():
                if key in body:
                    val = converter(body[key])
                    if val is not None or key in ('responsible','due_date','due_weaving','due_painting','delivery_type'):
                        fields.append(f'{key} = %s')
                        values.append(val)
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
                cur.execute("UPDATE orders SET is_trashed=TRUE, updated_at=NOW() WHERE id=%s", (order_id,))
            return {'statusCode': 200, 'headers': cors_headers(),
                    'body': json.dumps({'ok': True})}

        return {'statusCode': 405, 'headers': cors_headers(),
                'body': json.dumps({'error': 'method not allowed'})}
    finally:
        conn.close()
