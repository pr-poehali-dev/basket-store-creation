"""
API задач и заявок сотрудников FABRICA. v3
GET  ?staff_id=N  — задачи конкретного сотрудника; без параметра — все задачи
GET  ?type=requests  — заявки вместо задач
GET  ?type=comments&task_id=N  — комментарии к задаче
POST { action: 'task'|'request'|'comment', ...data }  — создать задачу/заявку/комментарий
PUT  { id, ...fields }  — обновить статус/поля задачи или заявки
DELETE ?id=N&type=task|request — снять задачу
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

        if method == 'GET':
            staff_id = params.get('staff_id')
            req_type = params.get('type', 'all')

            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if req_type == 'requests':
                    if staff_id:
                        cur.execute(
                            "SELECT * FROM task_requests WHERE staff_id = %s ORDER BY created_at DESC",
                            (int(staff_id),)
                        )
                    else:
                        cur.execute("SELECT * FROM task_requests ORDER BY created_at DESC")
                    rows = cur.fetchall()
                    requests = []
                    for r in rows:
                        requests.append({
                            'id': r['id'],
                            'staff_id': r['staff_id'],
                            'staff_name': r['staff_name'] or '',
                            'request_type': r['request_type'],
                            'comment': r['comment'] or '',
                            'date_from': r['date_from'].isoformat() if r['date_from'] else '',
                            'date_to': r['date_to'].isoformat() if r['date_to'] else '',
                            'status': r['status'],
                            'reviewed_by': r['reviewed_by'] or '',
                            'review_comment': r['review_comment'] or '',
                            'created_at': r['created_at'].isoformat() if r['created_at'] else '',
                        })
                    return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'requests': requests})}

                if req_type == 'comments':
                    task_id = params.get('task_id')
                    if not task_id:
                        return {'statusCode': 400, 'headers': cors(), 'body': json.dumps({'error': 'task_id required'})}
                    cur.execute(
                        "SELECT * FROM task_comments WHERE task_id = %s ORDER BY created_at ASC",
                        (int(task_id),)
                    )
                    rows = cur.fetchall()
                    comments = [{
                        'id': r['id'],
                        'task_id': r['task_id'],
                        'author_staff_id': r['author_staff_id'],
                        'author_name': r['author_name'] or '',
                        'comment': r['comment'] or '',
                        'attachment_url': r['attachment_url'] or '',
                        'attachment_name': r['attachment_name'] or '',
                        'created_at': r['created_at'].isoformat() if r['created_at'] else '',
                    } for r in rows]
                    return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'comments': comments})}

                # Tasks
                if staff_id:
                    cur.execute(
                        "SELECT t.*, s.full_name as assignee_name, "
                        "o.order_number as order_number, o.city as order_city, o.customer_name as order_customer_name "
                        "FROM tasks t "
                        "LEFT JOIN staff s ON t.assigned_to = s.id "
                        "LEFT JOIN orders o ON t.order_id = o.id "
                        "WHERE t.assigned_to = %s ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC",
                        (int(staff_id),)
                    )
                else:
                    cur.execute(
                        "SELECT t.*, s.full_name as assignee_name, "
                        "o.order_number as order_number, o.city as order_city, o.customer_name as order_customer_name "
                        "FROM tasks t "
                        "LEFT JOIN staff s ON t.assigned_to = s.id "
                        "LEFT JOIN orders o ON t.order_id = o.id "
                        "ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC"
                    )
                rows = cur.fetchall()
                tasks = []
                for r in rows:
                    tasks.append({
                        'id': r['id'],
                        'title': r['title'],
                        'description': r['description'] or '',
                        'assigned_to': r['assigned_to'],
                        'assignee_name': r['assignee_name'] or '',
                        'assigned_by': r['assigned_by'],
                        'assigned_by_name': r['assigned_by_name'] or '',
                        'due_date': r['due_date'].isoformat() if r['due_date'] else '',
                        'priority': r['priority'],
                        'status': r['status'],
                        'created_at': r['created_at'].isoformat() if r['created_at'] else '',
                        'order_id': r.get('order_id'),
                        'order_number': r.get('order_number') or '',
                        'order_city': r.get('order_city') or '',
                        'order_customer_name': r.get('order_customer_name') or '',
                    })
                return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'tasks': tasks})}

        body = json.loads(event.get('body') or '{}')

        if method == 'POST' and body.get('type') == 'purge_all':
            # Полная очистка задач и уведомлений
            if body.get('confirm') != 'DELETE':
                return {'statusCode': 400, 'headers': cors(), 'body': json.dumps({'error': 'confirm required'})}
            with conn.cursor() as cur:
                cur.execute("DELETE FROM task_comments")
                cur.execute("DELETE FROM tasks")
            return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'ok': True})}

        if method == 'POST':
            action = body.get('action', 'task')

            if action == 'request':
                staff_id   = body.get('staff_id')
                staff_name = body.get('staff_name', '')
                req_type   = body.get('request_type', '')
                comment    = body.get('comment', '')
                date_from  = body.get('date_from') or None
                date_to    = body.get('date_to') or None
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO task_requests (staff_id, staff_name, request_type, comment, date_from, date_to) "
                        "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                        (staff_id, staff_name, req_type, comment, date_from, date_to)
                    )
                    new_id = cur.fetchone()[0]
                return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'id': new_id})}

            if action == 'comment':
                task_id         = body.get('task_id')
                author_staff_id = body.get('author_staff_id')
                author_name     = body.get('author_name', '')
                comment_text    = body.get('comment', '')
                attachment_url  = body.get('attachment_url') or None
                attachment_name = body.get('attachment_name') or None
                if not task_id:
                    return {'statusCode': 400, 'headers': cors(), 'body': json.dumps({'error': 'task_id required'})}
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO task_comments (task_id, author_staff_id, author_name, comment, attachment_url, attachment_name) "
                        "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                        (int(task_id), author_staff_id, author_name, comment_text, attachment_url, attachment_name)
                    )
                    new_id = cur.fetchone()[0]
                return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'id': new_id})}

            # Создать задачу
            title          = body.get('title', '').strip()
            description    = body.get('description', '')
            assigned_to    = body.get('assigned_to')
            assigned_by    = body.get('assigned_by')
            assigned_by_name = body.get('assigned_by_name', '')
            due_date       = body.get('due_date') or None
            priority       = body.get('priority', 'normal')
            status         = body.get('status', 'pending')
            order_id       = body.get('order_id') or None
            if not title:
                return {'statusCode': 400, 'headers': cors(), 'body': json.dumps({'error': 'title required'})}
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO tasks (title, description, assigned_to, assigned_by, assigned_by_name, due_date, priority, status, order_id) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                    (title, description, assigned_to, assigned_by, assigned_by_name, due_date, priority, status, order_id)
                )
                new_id = cur.fetchone()[0]
            return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'id': new_id})}

        if method == 'PUT':
            rec_type = body.get('type', 'task')
            rec_id   = int(body.get('id'))
            fields, values = [], []

            if rec_type == 'request':
                if 'status' in body:
                    fields.append('status = %s'); values.append(body['status'])
                if 'reviewed_by' in body:
                    fields.append('reviewed_by = %s'); values.append(body['reviewed_by'])
                if 'review_comment' in body:
                    fields.append('review_comment = %s'); values.append(body['review_comment'])
                if fields:
                    fields.append('updated_at = NOW()')
                    values.append(rec_id)
                    with conn.cursor() as cur:
                        cur.execute(f"UPDATE task_requests SET {', '.join(fields)} WHERE id = %s", values)
            else:
                if 'status' in body:
                    fields.append('status = %s'); values.append(body['status'])
                if 'title' in body:
                    fields.append('title = %s'); values.append(body['title'])
                if 'description' in body:
                    fields.append('description = %s'); values.append(body['description'])
                if 'due_date' in body:
                    fields.append('due_date = %s'); values.append(body['due_date'] or None)
                if 'priority' in body:
                    fields.append('priority = %s'); values.append(body['priority'])
                if 'order_id' in body:
                    fields.append('order_id = %s'); values.append(body['order_id'] or None)
                if fields:
                    fields.append('updated_at = NOW()')
                    values.append(rec_id)
                    with conn.cursor() as cur:
                        cur.execute(f"UPDATE tasks SET {', '.join(fields)} WHERE id = %s", values)

            return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'ok': True})}

        if method == 'DELETE':
            rec_type = params.get('type', 'task')
            rec_id   = int(params.get('id'))
            table    = 'task_requests' if rec_type == 'request' else 'tasks'
            with conn.cursor() as cur:
                cur.execute(f"UPDATE {table} SET status = 'cancelled', updated_at = NOW() WHERE id = %s", (rec_id,))
            return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'ok': True})}

        return {'statusCode': 405, 'headers': cors(), 'body': json.dumps({'error': 'method not allowed'})}
    finally:
        conn.close()
