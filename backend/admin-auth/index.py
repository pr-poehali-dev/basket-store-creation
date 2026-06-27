"""
Аутентификация в админку FABRICA.
POST { password } -> { ok, role?, pages? }  — проверка пароля администратора
POST { login, password } -> { ok, staff_id, full_name, pages } — вход сотрудника
"""
import json
import os
import hashlib
import psycopg2
from psycopg2.extras import RealDictCursor

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def hash_password(p: str) -> str:
    return hashlib.sha256(p.encode()).hexdigest()


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    raw_body = event.get('body') or ''
    body = json.loads(raw_body) if raw_body and raw_body.strip() else {}

    login = body.get('login', '')
    password = body.get('password', '')
    admin_password = os.environ.get('ADMIN_PASSWORD', '')

    # Если передан login — ищем сотрудника
    if login:
        conn = get_conn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, full_name, pages, role FROM staff WHERE login = %s AND is_active = TRUE",
                    (login,)
                )
                row = cur.fetchone()
        finally:
            conn.close()
        if not row:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Неверный логин или пароль'})}
        # Проверяем пароль (sha256)
        conn2 = get_conn()
        try:
            with conn2.cursor() as cur:
                cur.execute(
                    "SELECT id FROM staff WHERE login = %s AND password_hash = %s AND is_active = TRUE",
                    (login, hash_password(password))
                )
                ok = cur.fetchone() is not None
        finally:
            conn2.close()
        if not ok:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Неверный логин или пароль'})}
        return {
            'statusCode': 200, 'headers': CORS,
            'body': json.dumps({
                'ok': True,
                'staff_id': row['id'],
                'full_name': row['full_name'],
                'role': row['role'],
                'pages': list(row['pages'] or []),
                'is_admin': False,
            })
        }

    # Иначе — проверка основного пароля администратора
    if not admin_password:
        return {'statusCode': 500, 'headers': CORS, 'body': json.dumps({'error': 'Пароль не настроен'})}

    if password == admin_password:
        return {
            'statusCode': 200, 'headers': CORS,
            'body': json.dumps({'ok': True, 'is_admin': True, 'pages': []})
        }

    return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Неверный пароль'})}
