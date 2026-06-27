"""
API справочника позиций FABRICA. v1
GET  ?type=positions|plans|staff  — список позиций / планов / сотрудников
POST { type, ...data }            — создать позицию или план
PUT  { type, id, ...fields }      — обновить
DELETE ?type=positions&id=N       — деактивировать позицию
"""
import os, json
import psycopg2
from psycopg2.extras import RealDictCursor


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    }


def handler(event: dict, context) -> dict:
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors(), 'body': ''}

    conn = get_conn()
    conn.autocommit = True

    try:
        params = event.get('queryStringParameters') or {}
        rec_type = params.get('type', 'positions')

        if method == 'GET':
            with conn.cursor(cursor_factory=RealDictCursor) as cur:

                if rec_type == 'positions':
                    show_all = params.get('all') == '1'
                    if show_all:
                        cur.execute(
                            "SELECT * FROM handbook_positions ORDER BY basket_group, category, staff_name"
                        )
                    else:
                        cur.execute(
                            "SELECT * FROM handbook_positions WHERE is_active = TRUE "
                            "ORDER BY basket_group, category, staff_name"
                        )
                    rows = cur.fetchall()
                    positions = []
                    for r in rows:
                        positions.append({
                            'id': r['id'],
                            'staff_name': r['staff_name'],
                            'category': r['category'],
                            'basket_group': r['basket_group'],
                            'catalog_name': r['catalog_name'] or '',
                            'price': float(r['price']),
                            'is_active': bool(r['is_active']),
                        })
                    return {'statusCode': 200, 'headers': cors(),
                            'body': json.dumps({'positions': positions})}

                if rec_type == 'plans':
                    staff_id = params.get('staff_id')
                    if staff_id:
                        # Актуальный план для конкретного сотрудника
                        cur.execute(
                            "SELECT * FROM staff_plans WHERE staff_id = %s "
                            "ORDER BY valid_from DESC LIMIT 1",
                            (int(staff_id),)
                        )
                    else:
                        # Все актуальные планы
                        cur.execute(
                            "SELECT DISTINCT ON (staff_id) sp.*, s.full_name "
                            "FROM staff_plans sp JOIN staff s ON sp.staff_id = s.id "
                            "ORDER BY staff_id, valid_from DESC"
                        )
                    rows = cur.fetchall()
                    plans = []
                    for r in rows:
                        plans.append({
                            'id': r['id'],
                            'staff_id': r['staff_id'],
                            'full_name': r.get('full_name', ''),
                            'daily_plan_rub': float(r['daily_plan_rub']),
                            'daily_plan_hours': float(r['daily_plan_hours']),
                            'daily_plan_qty': r['daily_plan_qty'],
                            'valid_from': r['valid_from'].isoformat() if r['valid_from'] else '',
                        })
                    return {'statusCode': 200, 'headers': cors(),
                            'body': json.dumps({'plans': plans})}

                if rec_type == 'staff':
                    cur.execute(
                        "SELECT id, full_name, group_name, is_active FROM staff "
                        "WHERE is_active = TRUE ORDER BY full_name"
                    )
                    rows = cur.fetchall()
                    staff = [{'id': r['id'], 'full_name': r['full_name'],
                              'group_name': r['group_name']} for r in rows]
                    return {'statusCode': 200, 'headers': cors(),
                            'body': json.dumps({'staff': staff})}

            return {'statusCode': 400, 'headers': cors(),
                    'body': json.dumps({'error': 'unknown type'})}

        body = json.loads(event.get('body') or '{}')
        b_type = body.get('type', 'position')

        if method == 'POST':
            if b_type == 'position':
                staff_name   = body.get('staff_name', '').strip()
                category     = body.get('category', 'whole')
                basket_group = body.get('basket_group', '').strip()
                catalog_name = body.get('catalog_name', '').strip() or None
                price        = float(body.get('price', 0))
                if not staff_name or not basket_group:
                    return {'statusCode': 400, 'headers': cors(),
                            'body': json.dumps({'error': 'staff_name and basket_group required'})}
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO handbook_positions (staff_name, category, basket_group, catalog_name, price) "
                        "VALUES (%s, %s, %s, %s, %s) RETURNING id",
                        (staff_name, category, basket_group, catalog_name, price)
                    )
                    new_id = cur.fetchone()[0]
                return {'statusCode': 200, 'headers': cors(),
                        'body': json.dumps({'id': new_id})}

            if b_type == 'plan':
                staff_id       = int(body.get('staff_id'))
                daily_plan_rub = float(body.get('daily_plan_rub', 0))
                daily_plan_hours = float(body.get('daily_plan_hours', 8))
                daily_plan_qty = int(body.get('daily_plan_qty', 0))
                valid_from     = body.get('valid_from') or None
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO staff_plans (staff_id, daily_plan_rub, daily_plan_hours, daily_plan_qty, valid_from) "
                        "VALUES (%s, %s, %s, %s, COALESCE(%s::date, CURRENT_DATE)) RETURNING id",
                        (staff_id, daily_plan_rub, daily_plan_hours, daily_plan_qty, valid_from)
                    )
                    new_id = cur.fetchone()[0]
                return {'statusCode': 200, 'headers': cors(),
                        'body': json.dumps({'id': new_id})}

        if method == 'PUT':
            p_type = body.get('type', 'position')
            rec_id = int(body.get('id'))
            fields, values = [], []

            if p_type == 'position':
                for col in ('staff_name', 'category', 'basket_group', 'catalog_name', 'price'):
                    if col in body:
                        fields.append(f'{col} = %s')
                        values.append(body[col])
                if 'is_active' in body:
                    fields.append('is_active = %s')
                    values.append(bool(body['is_active']))
                if fields:
                    fields.append('updated_at = NOW()')
                    values.append(rec_id)
                    with conn.cursor() as cur:
                        cur.execute(f"UPDATE handbook_positions SET {', '.join(fields)} WHERE id = %s", values)

            return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'ok': True})}

        if method == 'DELETE':
            p_type = params.get('type', 'position')
            rec_id = int(params.get('id'))
            if p_type == 'position':
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE handbook_positions SET is_active = FALSE, updated_at = NOW() WHERE id = %s",
                        (rec_id,)
                    )
            return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'ok': True})}

        return {'statusCode': 405, 'headers': cors(), 'body': json.dumps({'error': 'method not allowed'})}
    finally:
        conn.close()
