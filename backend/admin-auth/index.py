"""Проверка пароля для входа в админку. v3"""
import json
import os

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    password = body.get('password', '')
    admin_password = os.environ.get('ADMIN_PASSWORD', '')

    if not admin_password:
        return {'statusCode': 500, 'headers': CORS, 'body': json.dumps({'error': 'Пароль не настроен'})}

    if password == admin_password:
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Неверный пароль'})}