"""
API управления сотрудниками и правами доступа FABRICA.
GET  — список всех сотрудников
POST — создать сотрудника
PUT  — обновить сотрудника (имя, логин, пароль, права, группа)
DELETE ?id=N — деактивировать сотрудника
"""
import os
import json
import hashlib
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


def hash_pw(p: str) -> str:
    return hashlib.sha256(p.encode()).hexdigest()


def handler(event: dict, context) -> dict:
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors(), 'body': ''}

    conn = get_conn()
    conn.autocommit = True

    try:
        if method == 'GET':
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, full_name, login, role, group_name, pages, is_active, created_at "
                    "FROM staff ORDER BY group_name, full_name"
                )
                rows = cur.fetchall()
            staff = []
            for r in rows:
                staff.append({
                    'id': r['id'],
                    'full_name': r['full_name'],
                    'login': r['login'],
                    'role': r['role'],
                    'group_name': r['group_name'],
                    'pages': list(r['pages'] or []),
                    'is_active': bool(r['is_active']),
                    'created_at': r['created_at'].isoformat() if r['created_at'] else '',
                })
            return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'staff': staff})}

        body = json.loads(event.get('body') or '{}')

        if method == 'POST':
            full_name  = body.get('full_name', '').strip()
            login      = body.get('login', '').strip()
            password   = body.get('password', '').strip()
            role       = body.get('role', 'employee')
            group_name = body.get('group_name', 'Сотрудники')
            pages      = body.get('pages', [])

            if not full_name or not login or not password:
                return {'statusCode': 400, 'headers': cors(),
                        'body': json.dumps({'error': 'Имя, логин и пароль обязательны'})}

            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO staff (full_name, login, password_hash, role, group_name, pages) "
                    "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                    (full_name, login, hash_pw(password), role, group_name, pages)
                )
                new_id = cur.fetchone()[0]
            return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'id': new_id})}

        if method == 'PUT':
            staff_id = int(body.get('id'))
            fields = []
            values = []
            if 'full_name' in body:
                fields.append('full_name = %s'); values.append(body['full_name'])
            if 'login' in body:
                fields.append('login = %s'); values.append(body['login'])
            if 'password' in body and body['password']:
                fields.append('password_hash = %s'); values.append(hash_pw(body['password']))
            if 'role' in body:
                fields.append('role = %s'); values.append(body['role'])
            if 'group_name' in body:
                fields.append('group_name = %s'); values.append(body['group_name'])
            if 'pages' in body:
                fields.append('pages = %s'); values.append(body['pages'])
            if 'is_active' in body:
                fields.append('is_active = %s'); values.append(bool(body['is_active']))
            if not fields:
                return {'statusCode': 400, 'headers': cors(), 'body': json.dumps({'error': 'nothing to update'})}
            fields.append('updated_at = NOW()')
            values.append(staff_id)
            with conn.cursor() as cur:
                cur.execute(f"UPDATE staff SET {', '.join(fields)} WHERE id = %s", values)
            return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'ok': True})}

        if method == 'DELETE':
            staff_id = int(event.get('queryStringParameters', {}).get('id'))
            with conn.cursor() as cur:
                cur.execute("UPDATE staff SET is_active = FALSE WHERE id = %s", (staff_id,))
            return {'statusCode': 200, 'headers': cors(), 'body': json.dumps({'ok': True})}

        return {'statusCode': 405, 'headers': cors(), 'body': json.dumps({'error': 'method not allowed'})}
    finally:
        conn.close()
