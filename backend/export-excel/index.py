"""Выгрузка всех товаров в Excel файл (base64)."""
import json
import os
import base64
import io
import psycopg2
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

COLUMNS = [
    ('артикул',          'sku'),
    ('название',         'name'),
    ('описание',         'description'),
    ('форма',            'shape'),
    ('размер',           'size'),
    ('цвет',             'color'),
    ('цена',             'price'),
    ('цена по акции',    'sale_price'),
    ('фото',             'image_url'),
    ('группа',           'group_id'),
    ('группировать по',  'group_by'),
    ('разделить по',     'split_by'),
    ('метки',            'labels'),
    ('приоритет',        'priority'),
    ('вид плетения',     'weave_type'),
    ('кол-во ручек',     'handles_count'),
]

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")

HB_COLUMNS = [
    ('id (не менять)',        'id'),
    ('Название для ЗП',       'staff_name'),
    ('Подкатегория',          'position_group'),
    ('Название на складе',    'catalog_name'),
    ('Вид плетения',          'weave_type'),
    ('Цена с ручкой',         'price_whole'),
    ('Цена без ручки',        'price_no_handle'),
    ('Цена ручки',            'price_handle'),
    ('Цена ушей',             'price_ears'),
    ('Цена с ушами',          'price_whole_ears'),
    ('Состав набора (склад)', 'set_catalog_names'),
    ('Состав набора (ЗП)',    'set_staff_names'),
    ('Порядок',               'sort_order'),
    ('Активна (да/нет)',      'is_active'),
]

HB_HINTS = ('id — служебный, не изменять | Название для ЗП — как видит сотрудник | '
            'Подкатегория — объединяет позиции в раскрывающийся список (пусто = без группы) | '
            'Название на складе — куда начисляется товар | Вид плетения — вариант внутри позиции | '
            'Цены — за соответствующую часть корзины | Состав набора — через запятую | '
            'Порядок — сортировка | Активна — да/нет')


def export_handbook():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""SELECT id, staff_name, position_group, catalog_name, weave_type,
                          price_whole, price_no_handle, price_handle, price_ears, price_whole_ears,
                          set_catalog_names, set_staff_names, sort_order, is_active
                   FROM handbook_positions ORDER BY sort_order NULLS LAST, staff_name""")
    rows = cur.fetchall()
    cur.close(); conn.close()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'Справочник'

    ws.cell(row=1, column=1, value=HB_HINTS).font = Font(italic=True, size=9)
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(HB_COLUMNS))

    hf = Font(bold=True, color='FFFFFF')
    hfill = PatternFill(fill_type='solid', fgColor='5A3E28')
    for i, (name, _) in enumerate(HB_COLUMNS, start=1):
        c = ws.cell(row=2, column=i, value=name)
        c.font = hf; c.fill = hfill; c.alignment = Alignment(horizontal='center')

    for r_i, row in enumerate(rows, start=3):
        for c_i, val in enumerate(row, start=1):
            if isinstance(val, bool):
                val = 'да' if val else 'нет'
            elif val is not None and c_i in (6, 7, 8, 9, 10):
                val = float(val)
            ws.cell(row=r_i, column=c_i, value=val)

    for i in range(1, len(HB_COLUMNS) + 1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = 22

    buf = io.BytesIO(); wb.save(buf); buf.seek(0)
    return {
        'statusCode': 200,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps({'file': base64.b64encode(buf.read()).decode(),
                            'filename': 'handbook.xlsx'})
    }


CAT_LABEL = {
    'whole': 'Целая корзина с ручкой',
    'whole_ears': 'Целая корзина с ушами',
    'no_handle': 'Без ручки',
    'handle': 'Ручки',
    'ears': 'Уши',
}


def export_reports(params):
    """Выгрузка отчётов сотрудников построчно — формат как в рабочем Excel."""
    d_from = params.get('from', '')
    d_to = params.get('to', '')
    staff_ids = [int(x) for x in (params.get('staff_ids') or '').split(',') if x.strip().isdigit()]

    conn = get_conn()
    cur = conn.cursor()
    q = ("SELECT r.report_date, s.full_name, r.hours, r.positions "
         "FROM staff_reports r JOIN staff s ON s.id = r.staff_id WHERE 1=1")
    args = []
    if d_from:
        q += " AND r.report_date >= %s"; args.append(d_from)
    if d_to:
        q += " AND r.report_date <= %s"; args.append(d_to)
    if staff_ids:
        q += " AND r.staff_id = ANY(%s)"; args.append(staff_ids)
    q += " ORDER BY r.report_date, s.full_name"
    cur.execute(q, args)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'Отчёты'
    headers = ['дата', 'фио', 'часы', 'позиция', 'колво', 'цена', 'сумма', 'руб/ч', 'ручки/без ручки']
    hfont = Font(bold=True, color='FFFFFF')
    hfill = PatternFill(fill_type='solid', fgColor='4472C4')
    for i, h in enumerate(headers, start=1):
        c = ws.cell(row=1, column=i, value=h)
        c.font = hfont
        c.fill = hfill
        c.alignment = Alignment(horizontal='center')

    r_idx = 2
    for report_date, full_name, hours, positions in rows:
        items = positions if isinstance(positions, list) else json.loads(positions or '[]')
        items = [p for p in items if int(p.get('qty', 0)) > 0]
        day_total = sum(float(p.get('price', 0)) * int(p.get('qty', 0)) for p in items)
        hrs = float(hours or 0)
        per_hour = round(day_total / hrs) if hrs > 0 else 0
        for n, p in enumerate(items):
            qty = int(p.get('qty', 0))
            price = float(p.get('price', 0))
            ws.cell(row=r_idx, column=1, value=report_date.strftime('%d.%m.%Y'))
            ws.cell(row=r_idx, column=2, value=full_name)
            ws.cell(row=r_idx, column=3, value=(hrs if n == 0 and hrs else None))
            ws.cell(row=r_idx, column=4, value=p.get('staff_name', ''))
            ws.cell(row=r_idx, column=5, value=qty)
            ws.cell(row=r_idx, column=6, value=price)
            ws.cell(row=r_idx, column=7, value=qty * price)
            ws.cell(row=r_idx, column=8, value=per_hour)
            ws.cell(row=r_idx, column=9, value=CAT_LABEL.get(p.get('category', ''), '---'))
            r_idx += 1

    for i, w in enumerate([13, 20, 9, 38, 9, 9, 11, 9, 24], start=1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = w
    ws.freeze_panes = 'A2'

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return {
        'statusCode': 200,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps({'file': base64.b64encode(buf.read()).decode(),
                            'filename': 'staff_reports.xlsx'})
    }


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    if params.get('type') == 'handbook':
        return export_handbook()
    if params.get('type') == 'reports':
        return export_reports(params)

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT sku, name, description, shape, size, color, price, sale_price,
               image_url, group_id, group_by, split_by, labels, priority, weave_type, handles_count
        FROM products ORDER BY priority NULLS LAST, id
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'Товары'

    header_font = Font(bold=True, color='FFFFFF')
    header_fill = PatternFill(fill_type='solid', fgColor='5A3E28')

    for col_idx, (col_name, _) in enumerate(COLUMNS, start=1):
        cell = ws.cell(row=1, column=col_idx, value=col_name)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center')

    for row_idx, row in enumerate(rows, start=2):
        for col_idx, val in enumerate(row, start=1):
            ws.cell(row=row_idx, column=col_idx, value=val)

    for col_idx in range(1, len(COLUMNS) + 1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = 20

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode()

    return {
        'statusCode': 200,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps({'file': b64, 'filename': 'products.xlsx'})
    }
