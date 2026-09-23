"""
API заказов для канбан-доски админки FABRICA. v3
GET — список всех заказов; POST — создать заказ;
PUT — обновить; DELETE — пометить удалённым.

При создании заказа и смене stage/responsible также создаёт задачи-уведомления
сотрудникам напрямую в таблице tasks (см. notify_* ниже), с защитой от дублей:
- Новый заказ → уведомление группе «Администрация»
- Назначен ответственный (на этапе «Согласование») → уведомление лично ему
- Переход на «Согласование» → задача Валере Акимову на простановку даты готовности
- Переход в «В очереди на плетение» → задача Дарье Фоминой (срок плетения)
  и Владу Кадышеву (срок окраски, только если в заказе есть цветные позиции)
- Переход в «Упаковка» с доставкой «ати» → задача ответственному на «Поставить АТИ»
"""
import os, json
import psycopg2
from psycopg2.extras import RealDictCursor


STAGES = ['Новый заказ', 'Согласование', 'Оплата', 'В очереди на плетение',
          'Плетение', 'Малярка', 'Упаковка', 'Доставка', 'Закрытые']

# Фиксированные исполнители по имени (full_name из staff)
STAFF_NAME_DUE_DATE     = 'Валера Акимов'
STAFF_NAME_DUE_WEAVING  = 'Дарья Фомина'
STAFF_NAME_DUE_PAINTING = 'Влад Кадышев'


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


def fmt_money(n):
    try:
        return f"{int(n):,}".replace(',', ' ') + ' руб'
    except Exception:
        return f"{n} руб"


def order_label(city, customer_name, total):
    parts = [p for p in [city, customer_name] if p]
    return f"«{' '.join(parts)} {fmt_money(total)}»"


def order_needs_painting(items):
    for it in (items or []):
        color = (it.get('color') or '').lower().strip()
        if color and color != 'натуральный':
            return True
    return False


def get_active_staff(conn):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id, full_name, group_name FROM staff WHERE is_active = TRUE")
        return cur.fetchall()


def find_staff_by_name(staff, full_name):
    return next((s for s in staff if s['full_name'] == full_name), None)


def find_staff_by_partial_name(staff, name_part):
    if not name_part:
        return None
    return next((s for s in staff if name_part in s['full_name']), None)


def create_task_if_new(conn, title, description, assigned_to, order_id, priority='high'):
    """Создаёт задачу, если для этого исполнителя+заказа+заголовка ещё нет активной задачи."""
    if not assigned_to:
        return
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "SELECT id FROM tasks WHERE assigned_to = %s AND order_id = %s AND title = %s "
            "AND status NOT IN ('done', 'cancelled') LIMIT 1",
            (assigned_to, order_id, title)
        )
        if cur.fetchone():
            return
        cur.execute(
            "INSERT INTO tasks (title, description, assigned_to, assigned_by_name, priority, status, order_id) "
            "VALUES (%s, %s, %s, %s, %s, 'pending', %s)",
            (title, description, assigned_to, 'Система', priority, order_id)
        )


# ── 1. Новый заказ → уведомление группе «Администрация» ────────────────────────
def notify_new_order(conn, order_id, city, customer_name, total):
    staff = get_active_staff(conn)
    label = order_label(city, customer_name, total)
    for s in staff:
        if s['group_name'] == 'Администрация':
            create_task_if_new(conn, f'Поступил новый заказ {label}', '', s['id'], order_id)


# ── 2.1 Назначен ответственный на «Согласование» → уведомление лично ему ───────
def notify_responsible_assigned(conn, order_id, city, customer_name, total, responsible_name):
    staff = get_active_staff(conn)
    label = order_label(city, customer_name, total)
    target = find_staff_by_partial_name(staff, responsible_name)
    if target:
        create_task_if_new(conn, f'Вы назначены ответственным по заказу {label}', '', target['id'], order_id)


# ── 2.2 Переход на «Согласование» → задача Валере на дату готовности ───────────
def notify_due_date_task(conn, order_id, city, customer_name, total):
    staff = get_active_staff(conn)
    target = find_staff_by_name(staff, STAFF_NAME_DUE_DATE)
    if target:
        create_task_if_new(
            conn, f'Срок готовности: {city} {customer_name}',
            order_label(city, customer_name, total), target['id'], order_id
        )


# ── 3.1 / 3.2 Переход в очередь на плетение → задачи Дарье / Владу ─────────────
def notify_queue_tasks(conn, order_id, city, customer_name, total, items):
    staff = get_active_staff(conn)
    weaver = find_staff_by_name(staff, STAFF_NAME_DUE_WEAVING)
    if weaver:
        create_task_if_new(
            conn, f'Срок плетения: {city} {customer_name}',
            order_label(city, customer_name, total), weaver['id'], order_id
        )
    if order_needs_painting(items):
        painter = find_staff_by_name(staff, STAFF_NAME_DUE_PAINTING)
        if painter:
            create_task_if_new(
                conn, f'Срок окраски: {city} {customer_name}',
                order_label(city, customer_name, total), painter['id'], order_id
            )


# ── 4. Упаковка + доставка «ати» → задача ответственному «Поставить АТИ» ───────
def notify_ati_packing(conn, order_id, city, customer_name, total, responsible_name, delivery_address):
    staff = get_active_staff(conn)
    label = order_label(city, customer_name, total)
    title = f'Поставить АТИ по заказу {label} - {delivery_address}'
    target = find_staff_by_partial_name(staff, responsible_name)
    if target:
        create_task_if_new(conn, title, '', target['id'], order_id)
        return
    # Ответственный не назначен/не найден — уведомляем всю Администрацию
    for s in staff:
        if s['group_name'] == 'Администрация':
            create_task_if_new(conn, title, '', s['id'], order_id)


def handler(event: dict, context) -> dict:
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers(), 'body': ''}

    conn = get_conn()
    conn.autocommit = True

    try:
        params = event.get('queryStringParameters') or {}

        # ── Чат комментариев к заказу ──────────────────────────────────────────
        if method == 'GET' and params.get('type') == 'comments':
            oid = params.get('order_id')
            if not oid:
                return {'statusCode': 400, 'headers': cors_headers(),
                        'body': json.dumps({'error': 'order_id required'})}
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, order_id, author_staff_id, author_name, comment, "
                    "attachment_url, attachment_name, created_at "
                    "FROM order_comments WHERE order_id = %s ORDER BY created_at ASC",
                    (int(oid),)
                )
                rows = cur.fetchall()
            comments = [{
                'id': r['id'],
                'order_id': r['order_id'],
                'author_staff_id': r['author_staff_id'],
                'author_name': r['author_name'] or '',
                'comment': r['comment'] or '',
                'attachment_url': r['attachment_url'] or '',
                'attachment_name': r['attachment_name'] or '',
                'created_at': r['created_at'].isoformat() if r['created_at'] else '',
            } for r in rows]
            return {'statusCode': 200, 'headers': cors_headers(),
                    'body': json.dumps({'comments': comments})}

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

        # Добавить комментарий в чат заказа
        if method == 'POST' and body.get('action') == 'comment':
            oid = body.get('order_id')
            if not oid:
                return {'statusCode': 400, 'headers': cors_headers(),
                        'body': json.dumps({'error': 'order_id required'})}
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO order_comments (order_id, author_staff_id, author_name, comment, "
                    "attachment_url, attachment_name) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id",
                    (int(oid), body.get('author_staff_id'), body.get('author_name', ''),
                     body.get('comment', ''), body.get('attachment_url') or None,
                     body.get('attachment_name') or None)
                )
                new_cid = cur.fetchone()[0]
            return {'statusCode': 200, 'headers': cors_headers(),
                    'body': json.dumps({'id': new_cid})}

        if method == 'POST' and body.get('type') == 'import_orders':
            # Импорт исторических заказов из Excel. Цены берём из файла как есть,
            # справочник товаров и склад не трогаем.
            import io, base64 as _b64
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(_b64.b64decode(body.get('file', ''))), data_only=True)
            ws = wb.active
            groups = {}
            order_seq = []
            for r in ws.iter_rows(min_row=2, values_only=True):
                if not r or not r[1]:
                    continue
                date = str(r[0] or '')[:10]
                callsign = str(r[1]).strip()
                key = (date, callsign)
                if key not in groups:
                    groups[key] = {'discount': 0, 'items': [], 'total': 0}
                    order_seq.append(key)
                g = groups[key]
                try:
                    disc = int(float(str(r[2]).replace('%', '').replace(',', '.'))) if r[2] else 0
                except Exception:
                    disc = 0
                if disc:
                    g['discount'] = disc
                try:
                    qty = int(float(str(r[5]).replace(',', '.'))) if r[5] else 0
                except Exception:
                    qty = 0
                try:
                    price = int(round(float(str(r[6]).replace(',', '.')))) if r[6] else 0
                except Exception:
                    price = 0
                try:
                    summ = int(round(float(str(r[7]).replace(',', '.')))) if r[7] else qty * price
                except Exception:
                    summ = qty * price
                name = str(r[3] or '').strip()
                if not name:
                    continue
                g['items'].append({'name': name, 'size': '', 'color': str(r[4] or '').strip(),
                                   'qty': qty, 'price': price, 'sum': summ})
                g['total'] += summ

            created = 0
            unmatched = []
            with conn.cursor() as cur:
                cur.execute("SELECT callsign, full_name, phone, city FROM clients WHERE callsign IS NOT NULL")
                cmap = {row[0].strip().lower(): row for row in cur.fetchall() if row[0]}
                cur.execute("SELECT COALESCE(MAX(sort_order), 0) FROM orders")
                sort_base = cur.fetchone()[0] or 0
                for i, key in enumerate(order_seq):
                    date, callsign = key
                    g = groups[key]
                    c = cmap.get(callsign.lower())
                    if not c:
                        unmatched.append(callsign)
                    name = c[1] if c else callsign
                    phone = (c[2] or '') if c else ''
                    city = (c[3] or '') if c else ''
                    num = 'И-%s-%04d' % (date.replace('-', '')[2:], i + 1)
                    cur.execute(
                        "INSERT INTO orders (order_number, stage, city, customer_name, phone, total, "
                        "discount, items, form, sort_order, created_at, is_archived, comment) "
                        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                        (num, 'Закрытые', city, name, phone, g['total'], g['discount'],
                         json.dumps(g['items'], ensure_ascii=False),
                         json.dumps({'callsign': callsign}, ensure_ascii=False),
                         sort_base + i + 1, date + ' 00:00:00', True,
                         'Импорт из таблицы поступлений. Позывной: ' + callsign))
                    created += 1
            return {'statusCode': 200, 'headers': cors_headers(),
                    'body': json.dumps({'created': created,
                                        'unmatched': sorted(set(unmatched))}, ensure_ascii=False)}

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

            # Синхронизируем клиента
            if phone:
                try:
                    import urllib.request
                    form_data = body.get('form', {})
                    client_payload = json.dumps({
                        'type': 'upsert_from_order',
                        'phone': phone,
                        'full_name': customer_name,
                        'email': customer_email,
                        'city': city,
                        'inn': form_data.get('inn', ''),
                        'delivery_days': form_data.get('delivery_days', ''),
                        'delivery_time': form_data.get('delivery_time', ''),
                        'payment_method': payment_method,
                        'delivery_address': delivery_address,
                        'delivery_type': delivery_type,
                    }, ensure_ascii=False).encode()
                    clients_url = 'https://functions.poehali.dev/d615081f-bf45-4ff6-95c2-d509e37d46e8'
                    req = urllib.request.Request(clients_url, data=client_payload,
                        headers={'Content-Type': 'application/json'}, method='POST')
                    urllib.request.urlopen(req, timeout=3)
                except Exception:
                    pass

            # 1. Новый заказ → уведомление «Администрации»
            if stage == 'Новый заказ':
                try:
                    notify_new_order(conn, new_id, city, customer_name, total)
                except Exception:
                    pass

            return {'statusCode': 200, 'headers': cors_headers(),
                    'body': json.dumps({'id': new_id, 'order_number': order_number})}

        if method == 'PUT':
            order_id = int(body.get('id'))

            # Читаем текущее состояние заказа ДО обновления — нужно знать
            # прежний stage/responsible и иметь актуальные city/customer_name/total/items
            # для формирования текста уведомлений.
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT stage, responsible, city, customer_name, total, items, "
                    "delivery_type, delivery_address FROM orders WHERE id = %s",
                    (order_id,)
                )
                prev = cur.fetchone()

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

            # ── Уведомления/задачи по изменению stage/responsible ──────────────
            if prev:
                city          = prev['city'] or ''
                customer_name = prev['customer_name'] or ''
                total         = prev['total'] or 0
                items_list    = prev['items'] or []
                delivery_type = body.get('delivery_type', prev.get('delivery_type') or '')
                delivery_address = body.get('delivery_address', prev.get('delivery_address') or '')
                new_responsible = body.get('responsible', prev['responsible'])

                try:
                    # 2.1 Назначен ответственный на этапе «Согласование»
                    if 'responsible' in body and body['responsible'] and body['responsible'] != prev['responsible']:
                        stage_now = body.get('stage', prev['stage'])
                        if stage_now == 'Согласование':
                            notify_responsible_assigned(conn, order_id, city, customer_name, total, body['responsible'])

                    if 'stage' in body and body['stage'] != prev['stage']:
                        new_stage = body['stage']

                        # 2.2 Переход на «Согласование» → задача Валере на дату готовности
                        if new_stage == 'Согласование':
                            notify_due_date_task(conn, order_id, city, customer_name, total)

                        # 3.1 / 3.2 Переход в «В очереди на плетение» → задачи Дарье и Владу
                        if new_stage == 'В очереди на плетение':
                            notify_queue_tasks(conn, order_id, city, customer_name, total, items_list)

                        # 4. Переход в «Упаковка» с доставкой «ати»
                        if new_stage == 'Упаковка' and delivery_type == 'ати':
                            notify_ati_packing(conn, order_id, city, customer_name, total, new_responsible, delivery_address)
                except Exception:
                    pass

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