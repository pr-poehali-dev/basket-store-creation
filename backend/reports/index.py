"""
API ежедневных отчётов сотрудников и склада FABRICA. v1
GET  ?type=report&staff_id=N&date=YYYY-MM-DD  — отчёт сотрудника за дату
GET  ?type=reports&staff_id=N&from=YYYY-MM-DD&to=YYYY-MM-DD  — отчёты за период
GET  ?type=warehouse  — остатки склада
GET  ?type=warehouse_log&catalog_name=X  — история по позиции
GET  ?type=vacation&staff_id=N  — отпускные сотрудника
POST { type, ...data }  — создать/обновить отчёт, добавить движение склада, отпускные
"""
import os, json
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
        rec_type = params.get('type', 'report')

        # ── GET ──────────────────────────────────────────────────────────────
        if method == 'GET':
            with conn.cursor(cursor_factory=RealDictCursor) as cur:

                if rec_type == 'report':
                    staff_id = params.get('staff_id')
                    date = params.get('date')
                    if not staff_id or not date:
                        return {'statusCode': 400, 'headers': cors(),
                                'body': json.dumps({'error': 'staff_id and date required'})}
                    cur.execute(
                        "SELECT * FROM staff_reports WHERE staff_id=%s AND report_date=%s",
                        (int(staff_id), date)
                    )
                    row = cur.fetchone()
                    if not row:
                        return {'statusCode': 200, 'headers': cors(),
                                'body': json.dumps({'report': None})}
                    return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'report': {
                        'id': row['id'],
                        'staff_id': row['staff_id'],
                        'report_date': row['report_date'].isoformat(),
                        'positions': row['positions'] or [],
                        'total_rub': to_float(row['total_rub']),
                        'hours': to_float(row['hours']),
                        'time_start': row['time_start'].strftime('%H:%M') if row.get('time_start') else '',
                        'time_end': row['time_end'].strftime('%H:%M') if row.get('time_end') else '',
                        'locked': bool(row['locked']),
                    }})}

                if rec_type == 'salary':
                    # Зарплатная сводка за период: план, заработок, корректировки
                    year  = int(params.get('year'))
                    month = int(params.get('month'))
                    half  = int(params.get('half', 1))
                    d_from = f"{year:04d}-{month:02d}-{1 if half == 1 else 16:02d}"
                    last = 15 if half == 1 else 31
                    import calendar as _cal
                    if half == 2:
                        last = _cal.monthrange(year, month)[1]
                    d_to = f"{year:04d}-{month:02d}-{last:02d}"

                    cur.execute("""SELECT s.id, s.full_name,
                          COALESCE(sp.daily_plan_rub, 0) AS daily_plan_rub
                        FROM staff s LEFT JOIN staff_plans sp ON sp.staff_id = s.id
                        WHERE s.is_active = TRUE ORDER BY s.full_name""")
                    staff_rows = cur.fetchall()

                    cur.execute("""SELECT staff_id, report_date, total_rub, hours
                        FROM staff_reports WHERE report_date BETWEEN %s AND %s
                        ORDER BY report_date""", (d_from, d_to))
                    rep_rows = cur.fetchall()

                    cur.execute("""SELECT * FROM salary_periods
                        WHERE year=%s AND month=%s AND half=%s""", (year, month, half))
                    adj = {r['staff_id']: r for r in cur.fetchall()}

                    by_staff = {}
                    for r in rep_rows:
                        by_staff.setdefault(r['staff_id'], []).append({
                            'date': r['report_date'].isoformat(),
                            'total_rub': to_float(r['total_rub']),
                            'hours': to_float(r['hours']),
                        })

                    result = []
                    for s_row in staff_rows:
                        days = by_staff.get(s_row['id'], [])
                        earned = sum(d['total_rub'] for d in days)
                        a = adj.get(s_row['id'])
                        daily = to_float(s_row['daily_plan_rub'])
                        plan_total = daily * len(days) if days else 0
                        result.append({
                            'staff_id': s_row['id'],
                            'full_name': s_row['full_name'],
                            'daily_plan_rub': daily,
                            'earned': earned,
                            'plan_pct': round(earned / plan_total * 100) if plan_total > 0 else 0,
                            'prev_balance': to_float(a['prev_balance']) if a else 0,
                            'defect': to_float(a['defect']) if a else 0,
                            'bonus': to_float(a['bonus']) if a else 0,
                            'motivation': to_float(a['motivation']) if a else 0,
                            'paid': to_float(a['paid']) if a else 0,
                            'days': days,
                        })
                    return {'statusCode': 200, 'headers': cors(),
                            'body': json.dumps({'rows': result, 'from': d_from, 'to': d_to})}

                if rec_type == 'reports':
                    staff_id = params.get('staff_id')
                    date_from = params.get('from', '')
                    date_to   = params.get('to', '')
                    query = "SELECT * FROM staff_reports WHERE 1=1"
                    args = []
                    if staff_id:
                        query += " AND staff_id=%s"; args.append(int(staff_id))
                    if date_from:
                        query += " AND report_date>=%s"; args.append(date_from)
                    if date_to:
                        query += " AND report_date<=%s"; args.append(date_to)
                    query += " ORDER BY report_date DESC"
                    cur.execute(query, args)
                    rows = cur.fetchall()
                    reports = [{
                        'id': r['id'],
                        'staff_id': r['staff_id'],
                        'report_date': r['report_date'].isoformat(),
                        'positions': r['positions'] or [],
                        'total_rub': to_float(r['total_rub']),
                        'hours': to_float(r['hours']),
                        'time_start': r['time_start'].strftime('%H:%M') if r.get('time_start') else '',
                        'time_end': r['time_end'].strftime('%H:%M') if r.get('time_end') else '',
                        'locked': bool(r['locked']),
                    } for r in rows]
                    return {'statusCode': 200, 'headers': cors(),
                            'body': json.dumps({'reports': reports})}

                if rec_type == 'warehouse':
                    cur.execute("SELECT * FROM warehouse ORDER BY catalog_name")
                    rows = cur.fetchall()
                    items = [{
                        'id': r['id'],
                        'catalog_name': r['catalog_name'],
                        'qty_full': r['qty_full'],
                        'qty_no_handle': r['qty_no_handle'],
                        'updated_at': r['updated_at'].isoformat() if r['updated_at'] else '',
                    } for r in rows]
                    return {'statusCode': 200, 'headers': cors(),
                            'body': json.dumps({'items': items})}

                if rec_type == 'warehouse_log':
                    catalog = params.get('catalog_name', '')
                    if catalog:
                        cur.execute(
                            "SELECT * FROM warehouse_log WHERE catalog_name=%s ORDER BY created_at DESC LIMIT 100",
                            (catalog,)
                        )
                    else:
                        cur.execute("SELECT * FROM warehouse_log ORDER BY created_at DESC LIMIT 200")
                    rows = cur.fetchall()
                    log = [{
                        'id': r['id'],
                        'catalog_name': r['catalog_name'],
                        'operation': r['operation'],
                        'qty_full': r['qty_full'],
                        'qty_no_handle': r['qty_no_handle'],
                        'comment': r['comment'] or '',
                        'created_by': r['created_by'] or '',
                        'created_at': r['created_at'].isoformat() if r['created_at'] else '',
                    } for r in rows]
                    return {'statusCode': 200, 'headers': cors(),
                            'body': json.dumps({'log': log})}

                if rec_type == 'vacation':
                    staff_id = params.get('staff_id')
                    if not staff_id:
                        return {'statusCode': 400, 'headers': cors(),
                                'body': json.dumps({'error': 'staff_id required'})}
                    cur.execute(
                        "SELECT * FROM vacation_fund WHERE staff_id=%s ORDER BY month DESC",
                        (int(staff_id),)
                    )
                    rows = cur.fetchall()
                    total = sum(to_float(r['amount']) for r in rows)
                    entries = [{
                        'id': r['id'],
                        'month': r['month'].isoformat()[:7],
                        'amount': to_float(r['amount']),
                        'comment': r['comment'] or '',
                    } for r in rows]
                    return {'statusCode': 200, 'headers': cors(),
                            'body': json.dumps({'total': total, 'entries': entries})}

            return {'statusCode': 400, 'headers': cors(),
                    'body': json.dumps({'error': 'unknown type'})}

        # ── POST ─────────────────────────────────────────────────────────────
        body = json.loads(event.get('body') or '{}')
        b_type = body.get('type', 'report')

        if method == 'POST':

            if b_type == 'report':
                staff_id    = int(body.get('staff_id'))
                report_date = body.get('report_date')
                positions   = json.dumps(body.get('positions', []), ensure_ascii=False)
                total_rub   = float(body.get('total_rub', 0))
                hours       = float(body.get('hours', 0))
                time_start  = body.get('time_start') or None
                time_end    = body.get('time_end') or None
                with conn.cursor() as cur:
                    cur.execute(
                        """INSERT INTO staff_reports (staff_id, report_date, positions, total_rub, hours, time_start, time_end)
                           VALUES (%s, %s, %s, %s, %s, %s, %s)
                           ON CONFLICT (staff_id, report_date)
                           DO UPDATE SET positions=%s, total_rub=%s, hours=%s, time_start=%s, time_end=%s, updated_at=NOW()
                           RETURNING id""",
                        (staff_id, report_date, positions, total_rub, hours, time_start, time_end,
                         positions, total_rub, hours, time_start, time_end)
                    )
                    report_id = cur.fetchone()[0]

                # Обновляем склад — перебираем позиции и суммируем по catalog_name
                positions_data = body.get('positions', [])
                # positions: [{position_id, catalog_name, category, qty}]
                warehouse_delta: dict = {}  # catalog_name -> {full, no_handle}
                for p in positions_data:
                    cname = p.get('catalog_name', '')
                    if not cname:
                        continue
                    cat = p.get('category', 'whole')
                    qty = int(p.get('qty', 0))
                    if cname not in warehouse_delta:
                        warehouse_delta[cname] = {'full': 0, 'no_handle': 0}
                    if cat == 'no_handle':
                        warehouse_delta[cname]['no_handle'] += qty
                    elif cat == 'handle':
                        # Ручка НЕ создаёт новую корзину: она превращает уже
                        # сплетённую корзину без ручки в корзину с ручкой.
                        warehouse_delta[cname]['handle'] = warehouse_delta[cname].get('handle', 0) + qty
                    else:
                        warehouse_delta[cname]['full'] += qty

                # Ручки «поглощают» корзины без ручки: без ручки + ручка = с ручкой
                for cname, d in warehouse_delta.items():
                    h = d.pop('handle', 0)
                    if h:
                        used = min(h, d['no_handle'])
                        d['no_handle'] -= used
                        d['full'] += h

                # Имя сотрудника для истории склада
                staff_name = str(staff_id)
                with conn.cursor() as cur:
                    cur.execute("SELECT full_name FROM staff WHERE id = %s", (staff_id,))
                    row = cur.fetchone()
                    if row and row[0]:
                        staff_name = row[0]

                for cname, delta in warehouse_delta.items():
                    with conn.cursor() as cur:
                        # ВАЖНО: приход от сотрудника попадает ТОЛЬКО в уже существующую
                        # позицию склада с точно совпадающим названием. Новые позиции
                        # склада отчётами сотрудников не создаются.
                        cur.execute(
                            """UPDATE warehouse SET
                                 qty_full = qty_full + %s,
                                 qty_no_handle = qty_no_handle + %s,
                                 updated_at = NOW()
                               WHERE catalog_name = %s""",
                            (delta['full'], delta['no_handle'], cname)
                        )
                        if cur.rowcount == 0:
                            continue  # позиции нет на складе — пропускаем
                        if delta['full'] > 0 or delta['no_handle'] > 0:
                            cur.execute(
                                """INSERT INTO warehouse_log
                                   (catalog_name, operation, qty_full, qty_no_handle, comment, created_by)
                                   VALUES (%s, 'income_staff', %s, %s, %s, %s)""",
                                (cname, delta['full'], delta['no_handle'],
                                 f"Отчёт за {report_date}", staff_name)
                            )

                return {'statusCode': 200, 'headers': cors(),
                        'body': json.dumps({'id': report_id})}

            if b_type == 'warehouse_consume':
                # Списание ГОТОВЫХ (с ручкой) корзин со склада под заказ (Производство)
                # delta > 0 — списываем со склада (при вводе "сделано"), delta < 0 — возвращаем на склад (отмена)
                catalog_name = body.get('catalog_name', '').strip()
                delta        = int(body.get('delta', 0))
                comment      = body.get('comment', '')
                created_by   = body.get('created_by', '')
                if not catalog_name or delta == 0:
                    return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'ok': True, 'skipped': True})}

                with conn.cursor() as cur:
                    cur.execute(
                        """INSERT INTO warehouse (catalog_name, qty_full, qty_no_handle)
                           VALUES (%s, %s, 0)
                           ON CONFLICT (catalog_name)
                           DO UPDATE SET
                             qty_full = GREATEST(0, warehouse.qty_full - %s),
                             updated_at = NOW()""",
                        (catalog_name, max(0, -delta), delta)
                    )
                    cur.execute(
                        """INSERT INTO warehouse_log
                           (catalog_name, operation, qty_full, qty_no_handle, comment, created_by)
                           VALUES (%s, 'order_consume', %s, 0, %s, %s)""",
                        (catalog_name, -delta, comment, created_by)
                    )
                return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'ok': True})}

            if b_type == 'salary_adj':
                # Сохранить корректировку по сотруднику за период
                sid   = int(body.get('staff_id'))
                year  = int(body.get('year')); month = int(body.get('month')); half = int(body.get('half'))
                field = body.get('field')
                if field not in ('prev_balance', 'defect', 'bonus', 'motivation', 'paid'):
                    return {'statusCode': 400, 'headers': cors(), 'body': json.dumps({'error': 'bad field'})}
                val = float(body.get('value') or 0)
                with conn.cursor() as cur:
                    cur.execute(f"""INSERT INTO salary_periods (staff_id, year, month, half, {field})
                        VALUES (%s,%s,%s,%s,%s)
                        ON CONFLICT (staff_id, year, month, half)
                        DO UPDATE SET {field} = %s, updated_at = NOW()""",
                        (sid, year, month, half, val, val))
                return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'ok': True})}

            if b_type == 'warehouse_cleanup':
                # Разовая чистка склада: схлопываем дубли вида «НАЗВАНИЕ (размер)»
                # в «НАЗВАНИЕ» и обнуляем остатки у всех позиций.
                import re as _re
                with conn.cursor() as cur:
                    cur.execute("SELECT id, catalog_name FROM warehouse")
                    rows = cur.fetchall()

                base_names = {_re.sub(r'\s*\([^)]*\)\s*$', '', n).strip() for _i, n in rows}
                merged, renamed = 0, 0
                for wid, name in rows:
                    base = _re.sub(r'\s*\([^)]*\)\s*$', '', name).strip()
                    if base == name:
                        continue
                    with conn.cursor() as cur:
                        if base in base_names and any(n == base for _i, n in rows):
                            # Такая позиция уже есть — просто удаляем дубль с размером
                            cur.execute("DELETE FROM warehouse WHERE id = %s", (wid,))
                            merged += 1
                        else:
                            # Базовой позиции нет — переименовываем, убирая размер
                            cur.execute("UPDATE warehouse SET catalog_name = %s WHERE id = %s", (base, wid))
                            renamed += 1

                with conn.cursor() as cur:
                    cur.execute("UPDATE warehouse SET qty_full = 0, qty_no_handle = 0, updated_at = NOW()")
                return {'statusCode': 200, 'headers': cors(),
                        'body': json.dumps({'ok': True, 'merged': merged, 'renamed': renamed})}

            if b_type == 'warehouse_sync':
                # Подтянуть новые позиции из каталога товаров на склад (с нулевым остатком).
                # Названия на складе — БЕЗ размера, чтобы совпадать с отчётами сотрудников.
                with conn.cursor() as cur:
                    cur.execute("SELECT DISTINCT name FROM products WHERE name IS NOT NULL AND name <> ''")
                    catalog_names = [r[0].strip() for r in cur.fetchall() if r[0] and r[0].strip()]
                    cur.execute("SELECT catalog_name FROM warehouse")
                    existing = {r[0] for r in cur.fetchall()}

                added = 0
                for name in catalog_names:
                    if name in existing:
                        continue
                    with conn.cursor() as cur:
                        cur.execute(
                            """INSERT INTO warehouse (catalog_name, qty_full, qty_no_handle)
                               VALUES (%s, 0, 0) ON CONFLICT (catalog_name) DO NOTHING""",
                            (name,)
                        )
                        added += cur.rowcount
                return {'statusCode': 200, 'headers': cors(),
                        'body': json.dumps({'ok': True, 'added': added})}

            if b_type == 'warehouse_manual':
                # Ручное добавление / списание / брак
                catalog_name = body.get('catalog_name', '').strip()
                operation    = body.get('operation', 'add')  # add | defect | write_off
                qty_full     = int(body.get('qty_full', 0))
                qty_no_handle = int(body.get('qty_no_handle', 0))
                comment      = body.get('comment', '')
                created_by   = body.get('created_by', '')
                if not catalog_name:
                    return {'statusCode': 400, 'headers': cors(),
                            'body': json.dumps({'error': 'catalog_name required'})}

                sign = 1 if operation == 'add' else -1
                with conn.cursor() as cur:
                    cur.execute(
                        """INSERT INTO warehouse (catalog_name, qty_full, qty_no_handle)
                           VALUES (%s, %s, %s)
                           ON CONFLICT (catalog_name)
                           DO UPDATE SET
                             qty_full = GREATEST(0, warehouse.qty_full + %s),
                             qty_no_handle = GREATEST(0, warehouse.qty_no_handle + %s),
                             updated_at = NOW()""",
                        (catalog_name, max(0, sign*qty_full), max(0, sign*qty_no_handle),
                         sign*qty_full, sign*qty_no_handle)
                    )
                    cur.execute(
                        """INSERT INTO warehouse_log
                           (catalog_name, operation, qty_full, qty_no_handle, comment, created_by)
                           VALUES (%s, %s, %s, %s, %s, %s)""",
                        (catalog_name, operation, qty_full, qty_no_handle, comment, created_by)
                    )
                return {'statusCode': 200, 'headers': cors(),
                        'body': json.dumps({'ok': True})}

            if b_type == 'vacation':
                staff_id = int(body.get('staff_id'))
                month    = body.get('month')  # YYYY-MM
                amount   = float(body.get('amount', 0))
                comment  = body.get('comment', '')
                with conn.cursor() as cur:
                    cur.execute(
                        """INSERT INTO vacation_fund (staff_id, month, amount, comment)
                           VALUES (%s, %s::date, %s, %s)
                           ON CONFLICT (staff_id, month)
                           DO UPDATE SET amount = vacation_fund.amount + %s, comment=%s""",
                        (staff_id, month + '-01', amount, comment, amount, comment)
                    )
                return {'statusCode': 200, 'headers': cors(),
                        'body': json.dumps({'ok': True})}

        # ── PUT ─────────────────────────────────────────────────────────────
        if method == 'PUT':
            p_type = body.get('type', 'report')
            if p_type == 'lock_report':
                report_id = int(body.get('id'))
                locked    = bool(body.get('locked', True))
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE staff_reports SET locked=%s, updated_at=NOW() WHERE id=%s",
                        (locked, report_id)
                    )
                return {'statusCode': 200, 'headers': cors(),
                        'body': json.dumps({'ok': True})}

            if p_type == 'report_admin':
                # Руководитель может редактировать любой отчёт
                report_id = int(body.get('id'))
                positions = json.dumps(body.get('positions', []), ensure_ascii=False)
                total_rub = float(body.get('total_rub', 0))
                hours     = float(body.get('hours', 0))
                with conn.cursor() as cur:
                    cur.execute(
                        """UPDATE staff_reports
                           SET positions=%s, total_rub=%s, hours=%s, updated_at=NOW()
                           WHERE id=%s""",
                        (positions, total_rub, hours, report_id)
                    )
                return {'statusCode': 200, 'headers': cors(),
                        'body': json.dumps({'ok': True})}

        return {'statusCode': 405, 'headers': cors(),
                'body': json.dumps({'error': 'method not allowed'})}
    finally:
        conn.close()