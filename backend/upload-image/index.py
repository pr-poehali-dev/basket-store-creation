"""Загрузка файла (фото товара, вложение к задаче и т.п.) в S3 и возврат публичного URL."""
import json
import os
import base64
import uuid
import boto3

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

CONTENT_TYPES = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp',
    'gif': 'image/gif', 'pdf': 'application/pdf', 'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'txt': 'text/plain',
}

def handler(event: dict, context) -> dict:
    """Принимает { file: base64, ext, folder? } и загружает в S3. folder по умолчанию 'products' (обратная совместимость)."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    file_b64 = body.get('file')
    ext = body.get('ext', 'jpg').lower().strip('.')
    folder = (body.get('folder') or 'products').strip('/')

    if not file_b64:
        return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Файл не передан'})}

    file_bytes = base64.b64decode(file_b64)
    key = f"{folder}/{uuid.uuid4()}.{ext}"

    content_type = CONTENT_TYPES.get(ext, 'application/octet-stream')

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    s3.put_object(Bucket='files', Key=key, Body=file_bytes, ContentType=content_type)

    url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'url': url})}
