import { useState } from 'react';
import { Order, groupPositions, fmtMoney, fmtDateShort, RESPONSIBLES, DELIVERY_LABELS } from './orderUtils';
import urls from '../../../backend/func2url.json';

interface Props {
  order: Order;
  onClose: () => void;
  onUpdate: (id: number, patch: Partial<Order>) => void;
  onOpenClient?: (phone: string, name: string) => void;
}

const OLIVE = '#6b7c3a';

// ── Генерация бланка PDF ──────────────────────────────────────────────────────
function generateOrderPDF(order: Order) {
  const disc = 1 - (order.discount || 0) / 100;
  const form = order.form || {};

  // Группируем позиции: name (без size) + color → qty + итог со скидкой
  const rows: { name: string; color: string; price: number; qty: number; sum: number }[] = [];
  for (const item of order.items) {
    // ищем уже существующую строку
    const existing = rows.find(r => r.name === item.name && r.color === (item.color || ''));
    if (existing) {
      existing.qty += item.qty;
      existing.sum += existing.price * item.qty;
    } else {
      rows.push({ name: item.name, color: item.color || '', price: 0, qty: item.qty, sum: 0 });
    }
  }
  const totalQty = rows.reduce((s, r) => s + r.qty, 0);
  const totalSum = Math.round(order.total * disc);

  const dateStr = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<title>Бланк заказа #${order.order_number}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #222; padding: 32px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .sub { color: #666; font-size: 12px; margin-bottom: 24px; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #888; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 10px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
  .label { color: #666; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f5f5f0; text-align: left; padding: 8px 10px; font-size: 12px; border: 1px solid #ddd; }
  td { padding: 7px 10px; border: 1px solid #eee; font-size: 13px; }
  .tr-total { background: #f5f5f0; font-weight: bold; }
  .footer { margin-top: 32px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 12px; }
</style>
</head>
<body>
<h1>Бланк заказа #${order.order_number}</h1>
<div class="sub">Дата заказа: ${orderDate} &nbsp;·&nbsp; Дата документа: ${dateStr}</div>

<div class="section">
  <h2>Данные клиента</h2>
  <div class="grid2">
    <div class="label">Имя</div><div>${order.customer_name || '—'}</div>
    <div class="label">Телефон</div><div>${order.customer_phone || form.phone || '—'}</div>
    ${order.customer_email || form.email ? `<div class="label">Email</div><div>${order.customer_email || form.email}</div>` : ''}
    ${form.inn ? `<div class="label">ИНН</div><div>${form.inn}</div>` : ''}
    ${order.city ? `<div class="label">Город</div><div>${order.city}</div>` : ''}
  </div>
</div>

${order.delivery_address || form.address || order.delivery_type ? `
<div class="section">
  <h2>Доставка</h2>
  <div class="grid2">
    ${order.delivery_address || form.address ? `<div class="label">Адрес</div><div>${order.delivery_address || form.address}</div>` : ''}
    ${order.delivery_type ? `<div class="label">Способ</div><div>${DELIVERY_LABELS[order.delivery_type] || order.delivery_type}</div>` : ''}
    ${form.delivery_days ? `<div class="label">Дни</div><div>${form.delivery_days}</div>` : ''}
    ${form.delivery_time ? `<div class="label">Время</div><div>${form.delivery_time}</div>` : ''}
  </div>
</div>` : ''}

<div class="section">
  <h2>Состав заказа</h2>
  <table>
    <thead>
      <tr>
        <th style="width:40%">Позиция</th>
        <th>Цвет</th>
        <th style="text-align:right">Кол-во</th>
      </tr>
    </thead>
    <tbody>
      ${order.items.map(item => `
        <tr>
          <td>${item.name}</td>
          <td>${item.color || '—'}</td>
          <td style="text-align:right">${item.qty}</td>
        </tr>`).join('')}
      <tr class="tr-total">
        <td colspan="2"><b>ИТОГО</b></td>
        <td style="text-align:right"><b>${totalQty} шт</b></td>
      </tr>
    </tbody>
  </table>
  <div style="text-align:right; margin-top:12px; font-size:15px;">
    Сумма: <b>${fmtMoney(order.total)}</b>
    ${order.discount ? ` &nbsp;·&nbsp; Скидка ${order.discount}% &nbsp;·&nbsp; <b>К оплате: ${fmtMoney(totalSum)}</b>` : ''}
  </div>
</div>

${order.comment ? `<div class="section"><h2>Комментарий</h2><p>${order.comment}</p></div>` : ''}

<div class="footer">FABRICA &nbsp;·&nbsp; Бланк сформирован ${dateStr}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (win) {
    win.onload = () => { setTimeout(() => { win.print(); }, 300); };
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ── Компонент ─────────────────────────────────────────────────────────────────
const OrderFullCard = ({ order, onClose, onUpdate, onOpenClient }: Props) => {
  const positions = groupPositions(order.items);
  const [showColors, setShowColors] = useState(false);
  const [notes, setNotes]           = useState(order.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [attachments, setAttachments] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`order_attach_${order.id}`) || '[]'); }
    catch { return []; }
  });

  const saveNotes = async () => {
    setSavingNotes(true);
    await onUpdate(order.id, { notes });
    setSavingNotes(false);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const ext = file.name.split('.').pop() || 'jpg';
      const reader = new FileReader();
      await new Promise<void>(resolve => {
        reader.onload = async (ev) => {
          const b64 = btoa(String.fromCharCode(...new Uint8Array(ev.target?.result as ArrayBuffer)));
          const res  = await fetch(urls['upload-image'], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: b64, ext }) });
          const data = await res.json();
          if (data.url) {
            setAttachments(prev => {
              const next = [...prev, data.url];
              localStorage.setItem(`order_attach_${order.id}`, JSON.stringify(next));
              return next;
            });
          }
          resolve();
        };
        reader.readAsArrayBuffer(file);
      });
    }
    setUploading(false);
    e.target.value = '';
  };

  const removeAttachment = (url: string) => {
    const next = attachments.filter(a => a !== url);
    setAttachments(next);
    localStorage.setItem(`order_attach_${order.id}`, JSON.stringify(next));
  };

  const respStyle = RESPONSIBLES.find(r => r.name === order.responsible);
  const form = order.form || {};
  const phone = order.customer_phone || form.phone || '';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-primary/30 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Шапка */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Клиент — кликабельный если есть телефон */}
              {phone && onOpenClient ? (
                <button onClick={() => onOpenClient(phone, order.customer_name)}
                  className="font-bold text-primary text-lg hover:text-accent transition-colors underline decoration-dashed underline-offset-2">
                  {order.city} {order.customer_name}
                </button>
              ) : (
                <span className="font-bold text-primary text-lg">{order.city} {order.customer_name}</span>
              )}
              <span className="text-sm text-muted-foreground">#{order.order_number}</span>
              <span className="text-sm font-bold text-primary">{fmtMoney(order.total)}</span>
              {order.discount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-primary font-semibold">−{order.discount}%</span>
              )}
            </div>
            <div className="flex gap-2 mt-1 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{order.stage}</span>
              {respStyle && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: respStyle.bg, color: respStyle.text }}>
                  {respStyle.name}
                </span>
              )}
              {order.due_date && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-primary border border-accent/30">
                  Готовность: {fmtDateShort(order.due_date)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            {/* Кнопка PDF */}
            <button onClick={() => generateOrderPDF(order)}
              title="Сформировать бланк для клиента"
              className="text-xs px-3 py-1.5 rounded-xl border border-primary/30 text-primary hover:border-primary hover:bg-primary/5 transition-colors">
              📄 Бланк
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-primary text-2xl">✕</button>
          </div>
        </div>

        {/* Контент */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          {/* Данные клиента */}
          <section>
            <h3 className="text-xs font-bold text-primary/50 uppercase tracking-wider mb-2">Клиент</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="text-muted-foreground">Имя</div>
              <div className="font-medium text-primary">
                {phone && onOpenClient ? (
                  <button onClick={() => onOpenClient(phone, order.customer_name)}
                    className="text-primary hover:text-accent underline decoration-dashed underline-offset-2 font-medium">
                    {order.customer_name}
                  </button>
                ) : order.customer_name}
              </div>
              {phone && <>
                <div className="text-muted-foreground">Телефон</div>
                <div className="font-medium text-primary">{phone}</div>
              </>}
              {(order.customer_email || form.email) && <>
                <div className="text-muted-foreground">Email</div>
                <div className="text-primary">{order.customer_email || form.email}</div>
              </>}
              {form.inn && <>
                <div className="text-muted-foreground">ИНН</div>
                <div className="text-primary">{form.inn}</div>
              </>}
              {order.city && <>
                <div className="text-muted-foreground">Город</div>
                <div className="text-primary">{order.city}</div>
              </>}
              {(order.delivery_address || form.address) && <>
                <div className="text-muted-foreground">Адрес</div>
                <div className="text-primary">{order.delivery_address || form.address}</div>
              </>}
              {order.delivery_type && <>
                <div className="text-muted-foreground">Доставка</div>
                <div className="text-primary">{DELIVERY_LABELS[order.delivery_type] || order.delivery_type}</div>
              </>}
            </div>
          </section>

          {/* Сроки */}
          {(order.due_date || order.due_weaving || order.due_painting) && (
            <section>
              <h3 className="text-xs font-bold text-primary/50 uppercase tracking-wider mb-2">Сроки</h3>
              <div className="flex gap-3 flex-wrap">
                {order.due_date && (
                  <div className="bg-accent/10 border border-accent/30 rounded-xl px-3 py-1.5">
                    <div className="text-xs text-muted-foreground">Готовность</div>
                    <div className="font-bold text-primary">{fmtDateShort(order.due_date)}</div>
                  </div>
                )}
                {order.due_weaving && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-1.5">
                    <div className="text-xs text-muted-foreground">Срок плетения</div>
                    <div className="font-bold text-primary">{fmtDateShort(order.due_weaving)}</div>
                  </div>
                )}
                {order.due_painting && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-1.5">
                    <div className="text-xs text-muted-foreground">Срок покраски</div>
                    <div className="font-bold text-primary">{fmtDateShort(order.due_painting)}</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Позиции заказа */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-primary/50 uppercase tracking-wider">Позиции</h3>
              <button onClick={() => setShowColors(v => !v)}
                className="text-xs px-2.5 py-1 rounded-lg border border-primary/25 text-primary/60 hover:text-primary hover:border-primary transition-colors">
                {showColors ? '🎨 Скрыть цвета' : '🎨 Показать цвета'}
              </button>
            </div>
            <div className="border border-primary/20 rounded-xl overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-primary/5 text-xs text-primary/60 border-b border-primary/15">
                    <th className="px-3 py-2 text-left font-semibold">Позиция</th>
                    {showColors && <th className="px-3 py-2 text-left font-semibold">Цвет</th>}
                    <th className="px-3 py-2 text-right font-semibold">Кол-во</th>
                  </tr>
                </thead>
                <tbody>
                  {showColors ? (
                    // Показываем каждую строку отдельно
                    order.items.map((item, i) => (
                      <tr key={i} className="border-b border-primary/10 last:border-0">
                        <td className="px-3 py-2 text-primary font-medium">{item.name}{item.size ? ` (${item.size})` : ''}</td>
                        <td className="px-3 py-2 text-primary/70">{item.color || '—'}</td>
                        <td className="px-3 py-2 text-right font-bold text-primary">{item.qty}</td>
                      </tr>
                    ))
                  ) : (
                    // Группируем по позиции
                    positions.map(pos => (
                      <tr key={pos.key} className="border-b border-primary/10 last:border-0">
                        <td className="px-3 py-2 text-primary font-medium">{pos.title}</td>
                        <td className="px-3 py-2 text-right font-bold text-primary">{pos.total}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-primary/5 border-t-2 border-primary/20">
                    <td className="px-3 py-2 font-bold text-primary" colSpan={showColors ? 2 : 1}>Итого</td>
                    <td className="px-3 py-2 text-right font-bold text-primary">
                      {order.items.reduce((s, i) => s + i.qty, 0)} шт
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="mt-2 text-right">
              <span className="text-sm text-muted-foreground">Сумма: </span>
              <span className="font-bold text-primary text-lg">{fmtMoney(order.total)}</span>
              {order.discount > 0 && (
                <span className="ml-2 text-sm text-accent font-semibold">−{order.discount}%</span>
              )}
            </div>
          </section>

          {/* Прогресс */}
          {positions.some(p => (order.produced || {})[p.key]) && (
            <section>
              <h3 className="text-xs font-bold text-primary/50 uppercase tracking-wider mb-2">Прогресс</h3>
              <div className="space-y-2">
                {positions.map(pos => {
                  const done    = Math.min((order.produced || {})[pos.key] || 0, pos.total);
                  const painted = Math.min((order.painted || {})[pos.key] || 0, pos.total);
                  return (
                    <div key={pos.key} className="text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-primary/80">{pos.title}</span>
                        <span className="text-xs text-muted-foreground">{pos.total} шт</span>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-primary/60">Сплетено</span>
                            <span style={{ color: OLIVE }}>{done}/{pos.total}</span>
                          </div>
                          <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pos.total?Math.round(done/pos.total*100):0}%`, backgroundColor: '#8a9a5a' }} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-primary/60">Покрашено</span>
                            <span style={{ color: OLIVE }}>{painted}/{pos.total}</span>
                          </div>
                          <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pos.total?Math.round(painted/pos.total*100):0}%`, backgroundColor: '#c4a882' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Комментарий клиента */}
          {(order.comment || form.comment) && (
            <section>
              <h3 className="text-xs font-bold text-primary/50 uppercase tracking-wider mb-1">Комментарий клиента</h3>
              <p className="text-sm text-primary/80 bg-primary/5 rounded-xl px-3 py-2">{order.comment || form.comment}</p>
            </section>
          )}

          {/* Внутренние заметки */}
          <section>
            <h3 className="text-xs font-bold text-primary/50 uppercase tracking-wider mb-2">Внутренние заметки</h3>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder="Заметки видны только сотрудникам..."
              className="w-full border border-primary/25 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent resize-none" />
            <button onClick={saveNotes} disabled={savingNotes}
              className="mt-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 disabled:opacity-50">
              {savingNotes ? 'Сохраняю...' : 'Сохранить'}
            </button>
          </section>

          {/* Фото и вложения */}
          <section>
            <h3 className="text-xs font-bold text-primary/50 uppercase tracking-wider mb-2">Фото и вложения</h3>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {attachments.map(url => (
                  <div key={url} className="relative group">
                    <img
                      src={url} alt=""
                      className="w-20 h-20 object-cover rounded-xl border border-primary/20 cursor-pointer"
                      onClick={() => window.open(url, '_blank')}
                      onError={e => { (e.target as HTMLImageElement).style.display='none'; }}
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-xl hidden group-hover:flex items-center justify-center gap-1">
                      <button onClick={() => window.open(url, '_blank')} className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-[11px]">↗</button>
                      <a href={url} download className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-[11px]">⬇</a>
                      <button onClick={() => removeAttachment(url)} className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-[11px]">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-primary/30 text-sm text-primary hover:border-primary cursor-pointer transition-colors ${uploading ? 'opacity-50' : ''}`}>
              {uploading ? '⏳ Загружаю...' : '📎 Прикрепить фото'}
              <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhoto} disabled={uploading} />
            </label>
          </section>
        </div>
      </div>
    </div>
  );
};

export default OrderFullCard;
