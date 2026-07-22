"""
API справочника корзин FABRICA. v7
Столбцы позиции (без группы): catalog_name, set_catalog_names, set_staff_names,
staff_name, weave_type, sort_order, price_whole, price_no_handle, price_handle, price_ears

GET  ?type=positions|plans|staff|price_history|plans_month  — данные
POST { type, ...data }  — создать позицию/план/история цены/excel-импорт (mode=append|replace)
PUT  { type, id, ...fields }  — обновить
DELETE ?type=position&id=N  — деактивировать позицию

Excel-импорт читает колонки СТРОГО ПО ПОРЯДКУ (первая строка — заголовки, игнорируются):
1. Название в каталоге
2. Названия позиций для набора из каталога
3. Названия позиций для набора из зп
4. Название для зп (название корзины)
5. Вид плетения
6. Цена за готовую корзину
7. Цена за корзину без ручки
8. Цена за ручку
9. Цена за уши
10. Сортировка
"""
import os, json, base64, io
from decimal import Decimal
import psycopg2
from psycopg2.extras import RealDictCursor

PRICE_FIELDS = ('price_whole', 'price_no_handle', 'price_handle', 'price_ears')
# Поля позиции, редактируемые из админки (group_name больше не выставляется пользователем — заполняется автоматически)
POSITION_FIELDS = ('catalog_name', 'set_catalog_names', 'set_staff_names', 'staff_name', 'weave_type', 'sort_order', *PRICE_FIELDS)

EXCEL_COLUMN_ORDER = (
    'catalog_name', 'set_catalog_names', 'set_staff_names', 'staff_name',
    'weave_type', 'price_whole', 'price_no_handle', 'price_handle', 'price_ears', 'sort_order',
)


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


def row_to_position(r):
    return {
        'id': r['id'],
        'catalog_name': r['catalog_name'] or '',
        'set_catalog_names': r['set_catalog_names'] or '',
        'set_staff_names': r['set_staff_names'] or '',
        'staff_name': r['staff_name'],
        'weave_type': r['weave_type'] or '',
        'price_whole': to_float(r['price_whole']),
        'price_no_handle': to_float(r['price_no_handle']),
        'price_handle': to_float(r['price_handle']),
        'price_ears': to_float(r['price_ears']),
        'sort_order': r['sort_order'] if r['sort_order'] is not None else 0,
        'is_active': bool(r['is_active']),
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

        # ── GET ──────────────────────────────────────────────────────────────
        if method == 'GET':
            with conn.cursor(cursor_factory=RealDictCursor) as cur:

                if rec_type == 'positions':
                    show_all = params.get('all') == '1'
                    q = "SELECT * FROM handbook_positions"
                    if not show_all:
                        q += " WHERE is_active = TRUE"
                    q += " ORDER BY sort_order NULLS LAST, staff_name"
                    cur.execute(q)
                    positions = [row_to_position(r) for r in cur.fetchall()]
                    return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'positions': positions})}

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
                        'price_whole': to_float(r['price_whole']),
                        'price_no_handle': to_float(r['price_no_handle']),
                        'price_handle': to_float(r['price_handle']),
                        'price_ears': to_float(r['price_ears']),
                        'valid_from': r['valid_from'].isoformat() if r['valid_from'] else '',
                        'created_at': r['created_at'].isoformat() if r['created_at'] else '',
                    } for r in rows]
                    return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'history': history})}

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
                    return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'plans': plans})}

                if rec_type == 'plans_month':
                    month = params.get('month', '')
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
                    return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'plans': plans})}

                if rec_type == 'staff':
                    cur.execute(
                        "SELECT id, full_name, group_name FROM staff WHERE is_active = TRUE ORDER BY full_name"
                    )
                    staff = [{'id': r['id'], 'full_name': r['full_name'], 'group_name': r['group_name']} for r in cur.fetchall()]
                    return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'staff': staff})}

            return {'statusCode': 400, 'headers': cors(), 'body': json.dumps({'error': 'unknown type'})}

        # ── POST ─────────────────────────────────────────────────────────────
        body = json.loads(event.get('body') or '{}')
        b_type = body.get('type', 'position')

        if method == 'POST':

            if b_type == 'position':
                staff_name = body.get('staff_name', '').strip()
                if not staff_name:
                    return {'statusCode': 400, 'headers': cors(), 'body': json.dumps({'error': 'staff_name required'})}
                vals = {f: body.get(f) for f in POSITION_FIELDS}
                vals['staff_name'] = staff_name
                for f in ('catalog_name', 'set_catalog_names', 'set_staff_names', 'weave_type'):
                    vals[f] = (vals.get(f) or '').strip() or None
                for f in PRICE_FIELDS:
                    vals[f] = float(vals.get(f) or 0)
                vals['sort_order'] = int(vals.get('sort_order') or 0)
                valid_from = body.get('valid_from') or None
                # Legacy-колонки (category, group_name, price) остались NOT NULL в старой схеме — заполняем автоматически
                vals['category'] = 'whole'
                vals['group_name'] = staff_name
                vals['price'] = vals['price_whole']

                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO handbook_positions "
                        "(group_name, catalog_name, set_catalog_names, set_staff_names, staff_name, weave_type, sort_order, "
                        "price_whole, price_no_handle, price_handle, price_ears, category, price) "
                        "VALUES (%(group_name)s, %(catalog_name)s, %(set_catalog_names)s, %(set_staff_names)s, %(staff_name)s, %(weave_type)s, %(sort_order)s, "
                        "%(price_whole)s, %(price_no_handle)s, %(price_handle)s, %(price_ears)s, %(category)s, %(price)s) RETURNING id",
                        vals
                    )
                    new_id = cur.fetchone()[0]
                    cur.execute(
                        "INSERT INTO handbook_price_history (position_id, price_whole, price_no_handle, price_handle, price_ears, price, valid_from) "
                        "VALUES (%s, %s, %s, %s, %s, %s, COALESCE(%s::date, CURRENT_DATE))",
                        (new_id, vals['price_whole'], vals['price_no_handle'], vals['price_handle'], vals['price_ears'], vals['price_whole'], valid_from)
                    )
                return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'id': new_id})}

            if b_type == 'price_change':
                position_id = int(body.get('position_id'))
                price_whole = float(body.get('price_whole', 0))
                price_no_handle = float(body.get('price_no_handle', 0))
                price_handle = float(body.get('price_handle', 0))
                price_ears = float(body.get('price_ears', 0))
                valid_from = body.get('valid_from') or None
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE handbook_positions SET price_whole=%s, price_no_handle=%s, price_handle=%s, price_ears=%s, price=%s, updated_at=NOW() WHERE id=%s",
                        (price_whole, price_no_handle, price_handle, price_ears, price_whole, position_id)
                    )
                    cur.execute(
                        "INSERT INTO handbook_price_history (position_id, price_whole, price_no_handle, price_handle, price_ears, price, valid_from) "
                        "VALUES (%s, %s, %s, %s, %s, %s, COALESCE(%s::date, CURRENT_DATE))",
                        (position_id, price_whole, price_no_handle, price_handle, price_ears, price_whole, valid_from)
                    )
                return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'ok': True})}

            if b_type == 'plan':
                staff_id = int(body.get('staff_id'))
                daily_plan_rub = float(body.get('daily_plan_rub', 0))
                daily_plan_hours = float(body.get('daily_plan_hours', 8))
                valid_from = body.get('valid_from') or None
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO staff_plans (staff_id, daily_plan_rub, daily_plan_hours, valid_from) "
                        "VALUES (%s, %s, %s, COALESCE(%s::date, CURRENT_DATE)) RETURNING id",
                        (staff_id, daily_plan_rub, daily_plan_hours, valid_from)
                    )
                    new_id = cur.fetchone()[0]
                return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'id': new_id})}

            if b_type == 'excel_positions':
                # Импорт позиций из Excel (base64). mode: 'append' (по умолчанию) | 'replace'
                try:
                    import openpyxl
                    file_b64 = body.get('file', '')
                    mode = body.get('mode', 'append')
                    data = base64.b64decode(file_b64)
                    wb = openpyxl.load_workbook(io.BytesIO(data))
                    ws = wb.active

                    def cell_str(v):
                        return str(v).strip() if v is not None else ''

                    def num(v):
                        try:
                            return float(v)
                        except (TypeError, ValueError):
                            return 0.0

                    def num_int(v):
                        try:
                            return int(v)
                        except (TypeError, ValueError):
                            return None

                    parsed_rows = []
                    for i, row in enumerate(ws.iter_rows(min_row=2), start=2):
                        values = [c.value for c in row]
                        # Дополняем пустыми значениями, если строка короче ожидаемого набора колонок
                        while len(values) < len(EXCEL_COLUMN_ORDER):
                            values.append(None)
                        rec = dict(zip(EXCEL_COLUMN_ORDER, values))
                        staff_name = cell_str(rec.get('staff_name'))
                        if not staff_name:
                            continue
                        parsed_rows.append({
                            'row_num': i,
                            'staff_name': staff_name,
                            'catalog_name': cell_str(rec.get('catalog_name')) or None,
                            'set_catalog_names': cell_str(rec.get('set_catalog_names')) or None,
                            'set_staff_names': cell_str(rec.get('set_staff_names')) or None,
                            'weave_type': cell_str(rec.get('weave_type')) or None,
                            'price_whole': num(rec.get('price_whole')),
                            'price_no_handle': num(rec.get('price_no_handle')),
                            'price_handle': num(rec.get('price_handle')),
                            'price_ears': num(rec.get('price_ears')),
                            'sort_order': num_int(rec.get('sort_order')),
                        })

                    created, updated, errors = 0, 0, []
                    with conn.cursor() as cur:
                        if mode == 'replace':
                            cur.execute("DELETE FROM handbook_price_history")
                            cur.execute("DELETE FROM handbook_positions")

                        for pr in parsed_rows:
                            try:
                                staff_name = pr['staff_name']
                                existing = None
                                if mode != 'replace':
                                    cur.execute(
                                        "SELECT id, price_whole, price_no_handle, price_handle, price_ears "
                                        "FROM handbook_positions WHERE staff_name=%s LIMIT 1",
                                        (staff_name,)
                                    )
                                    existing = cur.fetchone()

                                if existing:
                                    pos_id = existing[0]
                                    price_changed = (
                                        (float(existing[1]), float(existing[2]), float(existing[3]), float(existing[4]))
                                        != (pr['price_whole'], pr['price_no_handle'], pr['price_handle'], pr['price_ears'])
                                    )
                                    cur.execute(
                                        "UPDATE handbook_positions SET group_name=%s, catalog_name=%s, set_catalog_names=%s, set_staff_names=%s, weave_type=%s, sort_order=%s, "
                                        "price_whole=%s, price_no_handle=%s, price_handle=%s, price_ears=%s, price=%s, is_active=TRUE, updated_at=NOW() WHERE id=%s",
                                        (staff_name, pr['catalog_name'], pr['set_catalog_names'], pr['set_staff_names'], pr['weave_type'], pr['sort_order'],
                                         pr['price_whole'], pr['price_no_handle'], pr['price_handle'], pr['price_ears'], pr['price_whole'], pos_id)
                                    )
                                    if price_changed:
                                        cur.execute(
                                            "INSERT INTO handbook_price_history (position_id, price_whole, price_no_handle, price_handle, price_ears, price, valid_from) "
                                            "VALUES (%s, %s, %s, %s, %s, %s, CURRENT_DATE)",
                                            (pos_id, pr['price_whole'], pr['price_no_handle'], pr['price_handle'], pr['price_ears'], pr['price_whole'])
                                        )
                                    updated += 1
                                else:
                                    cur.execute(
                                        "INSERT INTO handbook_positions (group_name, catalog_name, set_catalog_names, set_staff_names, staff_name, weave_type, sort_order, "
                                        "price_whole, price_no_handle, price_handle, price_ears, category, price) "
                                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                                        (staff_name, pr['catalog_name'], pr['set_catalog_names'], pr['set_staff_names'], staff_name, pr['weave_type'], pr['sort_order'],
                                         pr['price_whole'], pr['price_no_handle'], pr['price_handle'], pr['price_ears'], 'whole', pr['price_whole'])
                                    )
                                    new_id = cur.fetchone()[0]
                                    cur.execute(
                                        "INSERT INTO handbook_price_history (position_id, price_whole, price_no_handle, price_handle, price_ears, price, valid_from) "
                                        "VALUES (%s, %s, %s, %s, %s, %s, CURRENT_DATE)",
                                        (new_id, pr['price_whole'], pr['price_no_handle'], pr['price_handle'], pr['price_ears'], pr['price_whole'])
                                    )
                                    created += 1
                            except Exception as row_err:
                                errors.append(f"строка {pr['row_num']}: {row_err}")
                    result = {'created': created, 'updated': updated}
                    if errors:
                        result['row_errors'] = errors[:20]
                    return {'statusCode': 200, 'headers': cors(), 'body': json.dumps(result, ensure_ascii=False)}
                except ImportError:
                    return {'statusCode': 500, 'headers': cors(), 'body': json.dumps({'error': 'openpyxl not installed'})}
                except Exception as e:
                    return {'statusCode': 500, 'headers': cors(), 'body': json.dumps({'error': str(e)}, ensure_ascii=False)}

        # ── PUT ─────────────────────────────────────────────────────────────
        if method == 'PUT':
            p_type = body.get('type', 'position')
            rec_id = int(body.get('id'))

            if p_type == 'position':
                fields, values = [], []
                for f in POSITION_FIELDS:
                    if f in body:
                        fields.append(f'{f} = %s')
                        values.append(body[f])
                        if f == 'price_whole':
                            fields.append('price = %s')
                            values.append(body[f])
                        if f == 'staff_name':
                            fields.append('group_name = %s')
                            values.append(body[f])
                if 'is_active' in body:
                    fields.append('is_active = %s')
                    values.append(bool(body['is_active']))
                if fields:
                    fields.append('updated_at = NOW()')
                    values.append(rec_id)
                    with conn.cursor() as cur:
                        cur.execute(f"UPDATE handbook_positions SET {', '.join(fields)} WHERE id = %s", values)
            return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'ok': True})}

        # ── DELETE ───────────────────────────────────────────────────────────
        if method == 'DELETE':
            p_type = params.get('type', 'position')
            rec_id = int(params.get('id'))
            if p_type == 'position':
                with conn.cursor() as cur:
                    cur.execute("UPDATE handbook_positions SET is_active=FALSE, updated_at=NOW() WHERE id=%s", (rec_id,))
            return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'ok': True})}

        return {'statusCode': 405, 'headers': cors(), 'body': json.dumps({'error': 'method not allowed'})}
    finally:
        conn.close()
