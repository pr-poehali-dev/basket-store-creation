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
                        'locked': bool(row['locked']),
                    }})}

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
                with conn.cursor() as cur:
                    cur.execute(
                        """INSERT INTO staff_reports (staff_id, report_date, positions, total_rub, hours)
                           VALUES (%s, %s, %s, %s, %s)
                           ON CONFLICT (staff_id, report_date)
                           DO UPDATE SET positions=%s, total_rub=%s, hours=%s, updated_at=NOW()
                           RETURNING id""",
                        (staff_id, report_date, positions, total_rub, hours,
                         positions, total_rub, hours)
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
                    else:
                        # whole и handle считаем как full корзина
                        warehouse_delta[cname]['full'] += qty

                for cname, delta in warehouse_delta.items():
                    with conn.cursor() as cur:
                        cur.execute(
                            """INSERT INTO warehouse (catalog_name, qty_full, qty_no_handle)
                               VALUES (%s, %s, %s)
                               ON CONFLICT (catalog_name)
                               DO UPDATE SET
                                 qty_full = warehouse.qty_full + %s,
                                 qty_no_handle = warehouse.qty_no_handle + %s,
                                 updated_at = NOW()""",
                            (cname, delta['full'], delta['no_handle'],
                             delta['full'], delta['no_handle'])
                        )
                        if delta['full'] > 0 or delta['no_handle'] > 0:
                            cur.execute(
                                """INSERT INTO warehouse_log
                                   (catalog_name, operation, qty_full, qty_no_handle, comment, created_by)
                                   VALUES (%s, 'income_staff', %s, %s, %s, %s)""",
                                (cname, delta['full'], delta['no_handle'],
                                 f"Отчёт сотрудника за {report_date}",
                                 str(staff_id))
                            )

                return {'statusCode': 200, 'headers': cors(),
                        'body': json.dumps({'id': report_id})}

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
