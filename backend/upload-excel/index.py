"""Загрузка товаров из Excel-файла (xlsx/xls). Колонки: name, description, shape, size, color, price, sale_price, image_url."""
import json
import os
import base64
import io
import psycopg2
import openpyxl

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

VALID_SHAPES = ['Круглые', 'Овальные', 'Прямоугольные', 'Сердечки']
VALID_SIZES = ['Малые', 'Средние', 'Большие']

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    file_b64 = body.get('file')
    mode = body.get('mode', 'append')

    if not file_b64:
        return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Файл не передан'})}

    file_bytes = base64.b64decode(file_b64)
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes))
    ws = wb.active

    headers = [str(c.value).strip().lower() if c.value else '' for c in next(ws.iter_rows(min_row=1, max_row=1))]

    def col(row, name):
        if name in headers:
            v = row[headers.index(name)].value
            return str(v).strip() if v is not None else ''
        return ''

    rows_data = []
    for row in ws.iter_rows(min_row=2):
        if not any(c.value for c in row):
            continue
        name = col(row, 'name') or col(row, 'название')
        if not name:
            continue
        shape = col(row, 'shape') or col(row, 'форма') or 'Круглые'
        if shape not in VALID_SHAPES:
            shape = 'Круглые'
        size = col(row, 'size') or col(row, 'размер') or 'Средние'
        if size not in VALID_SIZES:
            size = 'Средние'
        try:
            price = int(float(col(row, 'price') or col(row, 'цена') or 0))
        except:
            price = 0
        sale_price_raw = col(row, 'sale_price') or col(row, 'цена по акции') or col(row, 'акция')
        try:
            sale_price = int(float(sale_price_raw)) if sale_price_raw else None
        except:
            sale_price = None
        rows_data.append({
            'name': name,
            'description': col(row, 'description') or col(row, 'описание'),
            'shape': shape,
            'size': size,
            'color': col(row, 'color') or col(row, 'цвет'),
            'price': price,
            'sale_price': sale_price,
            'image_url': col(row, 'image_url') or col(row, 'фото'),
        })

    conn = get_conn()
    cur = conn.cursor()

    if mode == 'replace':
        cur.execute("DELETE FROM products")

    for p in rows_data:
        cur.execute(
            "INSERT INTO products (name, description, shape, size, color, price, sale_price, image_url) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            (p['name'], p['description'], p['shape'], p['size'], p['color'], p['price'], p['sale_price'], p['image_url'])
        )

    conn.commit()
    cur.close()
    conn.close()

    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'imported': len(rows_data)})}