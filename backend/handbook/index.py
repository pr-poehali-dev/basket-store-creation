"""
API справочника позиций FABRICA. v3
GET  ?type=positions|plans|staff|price_history|plans_month  — данные
POST { type, ...data }  — создать позицию/план/история цены/excel-импорт
PUT  { type, id, ...fields }  — обновить
DELETE ?type=position&id=N  — деактивировать позицию
"""
import os, json, base64, io
from decimal import Decimal
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


def to_float(v):
    if v is None:
        return 0.0
    return float(Decimal(str(v)))


def handler(event: dict, context) -> dict:
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors(), 'body': ''}

    conn = get_conn()
    conn.autocommit = True

    try:
        params = event.get('queryStringParameters') or {}
        rec_type = params.get('type', 'positions')

        # ── GET ──────────────────────────────────────────────────────────────
        if method == 'GET':
            with conn.cursor(cursor_factory=RealDictCursor) as cur:

                if rec_type == 'positions':
                    show_all = params.get('all') == '1'
                    q = "SELECT * FROM handbook_positions"
                    if not show_all:
                        q += " WHERE is_active = TRUE"
                    q += " ORDER BY basket_group, category, staff_name"
                    cur.execute(q)
                    rows = cur.fetchall()
                    positions = [{
                        'id': r['id'],
                        'staff_name': r['staff_name'],
                        'category': r['category'],
                        'basket_group': r['basket_group'],
                        'catalog_name': r['catalog_name'] or '',
                        'price': to_float(r['price']),
                        'is_active': bool(r['is_active']),
                    } for r in rows]
                    return {'statusCode': 200, 'headers': cors(),
                            'body': json.dumps({'positions': positions})}

                if rec_type == 'price_history':
                    position_id = params.get('position_id')
                    if position_id:
                        cur.execute(
                            "SELECT ph.*, hp.staff_name FROM handbook_price_history ph "
                            "JOIN handbook_positions hp ON ph.position_id = hp.id "
                            "WHERE ph.position_id = %s ORDER BY ph.valid_from DESC",
                            (int(position_id),)
                        )
                    else:
                        cur.execute(
                            "SELECT ph.*, hp.staff_name FROM handbook_price_history ph "
                            "JOIN handbook_positions hp ON ph.position_id = hp.id "
                            "ORDER BY ph.valid_from DESC LIMIT 200"
                        )
                    rows = cur.fetchall()
                    history = [{
                        'id': r['id'],
                        'position_id': r['position_id'],
                        'staff_name': r['staff_name'],
                        'price': to_float(r['price']),
                        'valid_from': r['valid_from'].isoformat() if r['valid_from'] else '',
                        'created_at': r['created_at'].isoformat() if r['created_at'] else '',
                    } for r in rows]
                    return {'statusCode': 200, 'headers': cors(),
                            'body': json.dumps({'history': history})}

                if rec_type == 'plans':
                    staff_id = params.get('staff_id')
                    if staff_id:
                        cur.execute(
                            "SELECT DISTINCT ON (staff_id) sp.*, s.full_name "
                            "FROM staff_plans sp JOIN staff s ON sp.staff_id = s.id "
                            "WHERE sp.staff_id = %s ORDER BY staff_id, valid_from DESC",
                            (int(staff_id),)
                        )
                    else:
                        # Актуальные планы по всем сотрудникам из группы Сотрудники
                        cur.execute(
                            "SELECT DISTINCT ON (s.id) s.id as staff_id, s.full_name, "
                            "COALESCE(sp.id, 0) as plan_id, "
                            "COALESCE(sp.daily_plan_rub, 0) as daily_plan_rub, "
                            "COALESCE(sp.daily_plan_hours, 8) as daily_plan_hours, "
                            "sp.valid_from "
                            "FROM staff s "
                            "LEFT JOIN staff_plans sp ON sp.staff_id = s.id "
                            "WHERE s.is_active = TRUE AND s.group_name = 'Сотрудники' "
                            "ORDER BY s.id, sp.valid_from DESC NULLS LAST"
                        )
                    rows = cur.fetchall()
                    plans = [{
                        'id': r.get('plan_id') or 0,
                        'staff_id': r['staff_id'],
                        'full_name': r.get('full_name', ''),
                        'daily_plan_rub': to_float(r['daily_plan_rub']),
                        'daily_plan_hours': to_float(r.get('daily_plan_hours') or 8),
                        'valid_from': r['valid_from'].isoformat() if r.get('valid_from') else '',
                    } for r in rows]
                    return {'statusCode': 200, 'headers': cors(),
                            'body': json.dumps({'plans': plans})}

                if rec_type == 'plans_month':
                    # История планов за конкретный месяц
                    month = params.get('month', '')  # YYYY-MM
                    if month:
                        cur.execute(
                            "SELECT DISTINCT ON (staff_id) sp.*, s.full_name "
                            "FROM staff_plans sp JOIN staff s ON sp.staff_id = s.id "
                            "WHERE sp.valid_from <= %s::date + interval '1 month' - interval '1 day' "
                            "ORDER BY staff_id, valid_from DESC",
                            (month + '-01',)
                        )
                    else:
                        cur.execute(
                            "SELECT DISTINCT ON (staff_id) sp.*, s.full_name "
                            "FROM staff_plans sp JOIN staff s ON sp.staff_id = s.id "
                            "ORDER BY staff_id, valid_from DESC"
                        )
                    rows = cur.fetchall()
                    plans = [{
                        'id': r['id'],
                        'staff_id': r['staff_id'],
                        'full_name': r.get('full_name', ''),
                        'daily_plan_rub': to_float(r['daily_plan_rub']),
                        'daily_plan_hours': to_float(r.get('daily_plan_hours') or 8),
                        'valid_from': r['valid_from'].isoformat() if r['valid_from'] else '',
                    } for r in rows]
                    return {'statusCode': 200, 'headers': cors(),
                            'body': json.dumps({'plans': plans})}

                if rec_type == 'staff':
                    cur.execute(
                        "SELECT id, full_name, group_name FROM staff "
                        "WHERE is_active = TRUE ORDER BY full_name"
                    )
                    rows = cur.fetchall()
                    staff = [{'id': r['id'], 'full_name': r['full_name'],
                              'group_name': r['group_name']} for r in rows]
                    return {'statusCode': 200, 'headers': cors(),
                            'body': json.dumps({'staff': staff})}

            return {'statusCode': 400, 'headers': cors(),
                    'body': json.dumps({'error': 'unknown type'})}

        # ── POST ─────────────────────────────────────────────────────────────
        body = json.loads(event.get('body') or '{}')
        b_type = body.get('type', 'position')

        if method == 'POST':

            if b_type == 'position':
                staff_name   = body.get('staff_name', '').strip()
                category     = body.get('category', 'whole')
                basket_group = body.get('basket_group', '').strip()
                catalog_name = body.get('catalog_name', '').strip() or None
                price        = float(body.get('price', 0))
                valid_from   = body.get('valid_from') or None
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
                    # Записываем начальную цену в историю
                    cur.execute(
                        "INSERT INTO handbook_price_history (position_id, price, valid_from) "
                        "VALUES (%s, %s, COALESCE(%s::date, CURRENT_DATE))",
                        (new_id, price, valid_from)
                    )
                return {'statusCode': 200, 'headers': cors(),
                        'body': json.dumps({'id': new_id})}

            if b_type == 'price_change':
                # Изменение цены с определённой даты
                position_id = int(body.get('position_id'))
                price       = float(body.get('price'))
                valid_from  = body.get('valid_from') or None
                with conn.cursor() as cur:
                    # Обновляем текущую цену
                    cur.execute(
                        "UPDATE handbook_positions SET price=%s, updated_at=NOW() WHERE id=%s",
                        (price, position_id)
                    )
                    # Записываем в историю
                    cur.execute(
                        "INSERT INTO handbook_price_history (position_id, price, valid_from) "
                        "VALUES (%s, %s, COALESCE(%s::date, CURRENT_DATE))",
                        (position_id, price, valid_from)
                    )
                return {'statusCode': 200, 'headers': cors(),
                        'body': json.dumps({'ok': True})}

            if b_type == 'plan':
                staff_id       = int(body.get('staff_id'))
                daily_plan_rub = float(body.get('daily_plan_rub', 0))
                daily_plan_hours = float(body.get('daily_plan_hours', 8))
                valid_from     = body.get('valid_from') or None
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO staff_plans (staff_id, daily_plan_rub, daily_plan_hours, valid_from) "
                        "VALUES (%s, %s, %s, COALESCE(%s::date, CURRENT_DATE)) RETURNING id",
                        (staff_id, daily_plan_rub, daily_plan_hours, valid_from)
                    )
                    new_id = cur.fetchone()[0]
                return {'statusCode': 200, 'headers': cors(),
                        'body': json.dumps({'id': new_id})}

            if b_type == 'excel_positions':
                # Импорт позиций из Excel (base64)
                try:
                    import openpyxl
                    file_b64 = body.get('file', '')
                    data = base64.b64decode(file_b64)
                    wb = openpyxl.load_workbook(io.BytesIO(data))
                    ws = wb.active
                    headers = [str(c.value or '').strip().lower() for c in next(ws.iter_rows(min_row=1, max_row=1))]

                    def col(row, name):
                        try:
                            return row[headers.index(name)].value
                        except (ValueError, IndexError):
                            return None

                    created, updated = 0, 0
                    with conn.cursor() as cur:
                        for row in ws.iter_rows(min_row=2):
                            staff_name   = str(col(row, 'название') or col(row, 'staff_name') or '').strip()
                            basket_group = str(col(row, 'корзина') or col(row, 'basket_group') or '').strip()
                            category     = str(col(row, 'категория') or col(row, 'category') or 'whole').strip()
                            catalog_name = str(col(row, 'каталог') or col(row, 'catalog_name') or '').strip() or None
                            price_val    = col(row, 'цена') or col(row, 'price') or 0
                            try:
                                price = float(price_val)
                            except Exception:
                                price = 0.0
                            if not staff_name or not basket_group:
                                continue
                            # Upsert по staff_name + basket_group
                            cur.execute(
                                "SELECT id, price FROM handbook_positions WHERE staff_name=%s AND basket_group=%s LIMIT 1",
                                (staff_name, basket_group)
                            )
                            existing = cur.fetchone()
                            if existing:
                                old_price = float(existing[1])
                                cur.execute(
                                    "UPDATE handbook_positions SET category=%s, catalog_name=%s, price=%s, is_active=TRUE, updated_at=NOW() WHERE id=%s",
                                    (category, catalog_name, price, existing[0])
                                )
                                if price != old_price:
                                    cur.execute(
                                        "INSERT INTO handbook_price_history (position_id, price, valid_from) VALUES (%s, %s, CURRENT_DATE)",
                                        (existing[0], price)
                                    )
                                updated += 1
                            else:
                                cur.execute(
                                    "INSERT INTO handbook_positions (staff_name, category, basket_group, catalog_name, price) "
                                    "VALUES (%s, %s, %s, %s, %s) RETURNING id",
                                    (staff_name, category, basket_group, catalog_name, price)
                                )
                                new_id = cur.fetchone()[0]
                                cur.execute(
                                    "INSERT INTO handbook_price_history (position_id, price, valid_from) VALUES (%s, %s, CURRENT_DATE)",
                                    (new_id, price)
                                )
                                created += 1
                    return {'statusCode': 200, 'headers': cors(),
                            'body': json.dumps({'created': created, 'updated': updated})}
                except ImportError:
                    return {'statusCode': 500, 'headers': cors(),
                            'body': json.dumps({'error': 'openpyxl not installed'})}

        # ── PUT ─────────────────────────────────────────────────────────────
        if method == 'PUT':
            p_type = body.get('type', 'position')
            rec_id = int(body.get('id'))

            if p_type == 'position':
                fields, values = [], []
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
                        cur.execute(
                            f"UPDATE handbook_positions SET {', '.join(fields)} WHERE id = %s", values
                        )
            return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'ok': True})}

        # ── DELETE ───────────────────────────────────────────────────────────
        if method == 'DELETE':
            p_type = params.get('type', 'position')
            rec_id = int(params.get('id'))
            if p_type == 'position':
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE handbook_positions SET is_active=FALSE, updated_at=NOW() WHERE id=%s",
                        (rec_id,)
                    )
            return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'ok': True})}

        return {'statusCode': 405, 'headers': cors(), 'body': json.dumps({'error': 'method not allowed'})}
    finally:
        conn.close()
