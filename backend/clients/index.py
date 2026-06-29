"""
API базы клиентов FABRICA. v1
GET  ?id=N           — один клиент + его заказы
GET                  — все клиенты
POST { type:'upsert_from_order', ...data }  — добавить/обновить клиента из заказа
POST { type:'client', ...data }  — добавить вручную
PUT  { id, ...fields }  — обновить клиента
DELETE ?id=N         — удалить клиента
"""
import os, json
import psycopg2
from psycopg2.extras import RealDictCursor
from decimal import Decimal


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    }


def to_float(v):
    if v is None: return 0.0
    return float(Decimal(str(v)))


def handler(event: dict, context) -> dict:
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors(), 'body': ''}

    conn = get_conn()
    conn.autocommit = True
    params = event.get('queryStringParameters') or {}

    try:
        if method == 'GET':
            client_id = params.get('id')
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if client_id:
                    # Клиент + его заказы
                    cur.execute("SELECT * FROM clients WHERE id = %s", (int(client_id),))
                    client = cur.fetchone()
                    if not client:
                        return {'statusCode': 404, 'headers': cors(), 'body': json.dumps({'error': 'not found'})}
                    # Заказы по телефону
                    cur.execute(
                        "SELECT id, order_number, stage, city, customer_name, total, discount, "
                        "items, created_at, due_date, notes "
                        "FROM orders WHERE phone = %s AND is_trashed = FALSE ORDER BY created_at DESC",
                        (client['phone'],)
                    )
                    orders = []
                    for r in cur.fetchall():
                        items = r['items'] if isinstance(r['items'], list) else []
                        orders.append({
                            'id': r['id'],
                            'order_number': r['order_number'],
                            'stage': r['stage'],
                            'city': r['city'] or '',
                            'customer_name': r['customer_name'] or '',
                            'total': r['total'],
                            'discount': r['discount'] or 0,
                            'items': items,
                            'created_at': r['created_at'].isoformat() if r['created_at'] else '',
                            'due_date': r['due_date'].isoformat() if r['due_date'] else '',
                            'notes': r['notes'] or '',
                        })
                    return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({
                        'client': {
                            'id': client['id'],
                            'full_name': client['full_name'],
                            'phone': client['phone'],
                            'email': client['email'] or '',
                            'city': client['city'] or '',
                            'created_at': client['created_at'].isoformat() if client['created_at'] else '',
                        },
                        'orders': orders,
                    })}
                else:
                    # Все клиенты + количество заказов
                    cur.execute("""
                        SELECT c.*, COUNT(o.id) as order_count,
                               COALESCE(SUM(o.total), 0) as total_sum
                        FROM clients c
                        LEFT JOIN orders o ON o.phone = c.phone AND o.is_trashed = FALSE
                        GROUP BY c.id
                        ORDER BY c.full_name
                    """)
                    rows = cur.fetchall()
                    clients = [{
                        'id': r['id'],
                        'full_name': r['full_name'],
                        'phone': r['phone'],
                        'email': r['email'] or '',
                        'city': r['city'] or '',
                        'order_count': r['order_count'],
                        'total_sum': int(r['total_sum']),
                        'created_at': r['created_at'].isoformat() if r['created_at'] else '',
                    } for r in rows]
                    return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'clients': clients})}

        body = json.loads(event.get('body') or '{}')

        if method == 'POST':
            b_type = body.get('type', 'client')

            if b_type == 'upsert_from_order':
                # Вызывается при поступлении нового заказа
                phone = (body.get('phone') or '').strip()
                if not phone:
                    return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'skipped': True})}

                full_name = body.get('full_name', '').strip()
                email     = body.get('email', '').strip()
                city      = body.get('city', '').strip()

                with conn.cursor() as cur:
                    cur.execute("SELECT id FROM clients WHERE phone = %s", (phone,))
                    existing = cur.fetchone()
                    if existing:
                        # Клиент уже есть — обновляем только если новые данные непустые
                        updates = []
                        vals    = []
                        if full_name: updates.append('full_name = %s'); vals.append(full_name)
                        if email:     updates.append('email = %s');     vals.append(email)
                        if city:      updates.append('city = %s');      vals.append(city)
                        if updates:
                            updates.append('updated_at = NOW()')
                            vals.append(existing[0])
                            cur.execute(f"UPDATE clients SET {', '.join(updates)} WHERE id = %s", vals)
                        return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'id': existing[0], 'new': False})}
                    else:
                        cur.execute(
                            "INSERT INTO clients (full_name, phone, email, city) VALUES (%s, %s, %s, %s) RETURNING id",
                            (full_name or phone, phone, email, city)
                        )
                        new_id = cur.fetchone()[0]
                        return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'id': new_id, 'new': True})}

            if b_type == 'client':
                phone     = (body.get('phone') or '').strip()
                full_name = body.get('full_name', '').strip()
                email     = body.get('email', '').strip()
                city      = body.get('city', '').strip()
                if not phone:
                    return {'statusCode': 400, 'headers': cors(), 'body': json.dumps({'error': 'phone required'})}
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO clients (full_name, phone, email, city) VALUES (%s, %s, %s, %s) "
                        "ON CONFLICT (phone) DO UPDATE SET full_name=EXCLUDED.full_name, email=EXCLUDED.email, city=EXCLUDED.city, updated_at=NOW() "
                        "RETURNING id",
                        (full_name or phone, phone, email, city)
                    )
                    new_id = cur.fetchone()[0]
                return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'id': new_id})}

        if method == 'PUT':
            client_id = int(body.get('id'))
            fields, vals = [], []
            for col in ('full_name', 'phone', 'email', 'city'):
                if col in body:
                    fields.append(f'{col} = %s'); vals.append(body[col])
            if fields:
                fields.append('updated_at = NOW()')
                vals.append(client_id)
                with conn.cursor() as cur:
                    cur.execute(f"UPDATE clients SET {', '.join(fields)} WHERE id = %s", vals)
            return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'ok': True})}

        if method == 'DELETE':
            client_id = int(params.get('id'))
            with conn.cursor() as cur:
                cur.execute("DELETE FROM clients WHERE id = %s", (client_id,))
            return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'ok': True})}

        return {'statusCode': 405, 'headers': cors(), 'body': json.dumps({'error': 'method not allowed'})}
    finally:
        conn.close()
