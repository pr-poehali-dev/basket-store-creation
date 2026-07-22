import { useState } from 'react';
import { Order, groupPositions, displayTitle, fmtMoney, fmtDateShort, RESPONSIBLES, DELIVERY_LABELS } from './orderUtils';
import urls from '../../../backend/func2url.json';

interface Props {
  order: Order;
  onClose: () => void;
  onUpdate: (id: number, patch: Partial<Order>) => void;
  onOpenClient?: (phone: string, name: string) => void;
}

const OLIVE = '#6b7c3a';

// ── Группировка для отображения: позиция → {итого, цвета[]}
interface PosGroup { title: string; total: number; colors: { color: string; qty: number }[] }
function buildPosGroups(items: Order['items']): PosGroup[] {
  const map = new Map<string, PosGroup>();
  for (const it of items) {
    const key = `${it.name}__${it.size || ''}`;
    const title = it.size ? `${it.name} (${it.size})` : it.name;
    if (!map.has(key)) map.set(key, { title, total: 0, colors: [] });
    const g = map.get(key)!;
    g.total += it.qty;
    const existing = g.colors.find(c => c.color === (it.color || ''));
    if (existing) existing.qty += it.qty;
    else g.colors.push({ color: it.color || '—', qty: it.qty });
  }
  return Array.from(map.values());
}

// ── Генерация бланка HTML→Print ──────────────────────────────────────────────
function generateOrderPDF(order: Order) {
  const disc = (order.discount || 0) / 100;
  const form = order.form || {};
  const posGroups = buildPosGroups(order.items);

  // Считаем полную сумму без скидки: total — это уже с учётом скидки если disc > 0
  // Восстанавливаем сумму без скидки
  const totalWithDisc    = order.total;           // сумма в заказе (со скидкой)
  const totalWithoutDisc = disc > 0 ? Math.round(order.total / (1 - disc)) : order.total;
  const totalDiscount    = totalWithoutDisc - totalWithDisc;

  const dateStr   = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  const totalQtyAll = order.items.reduce((s, i) => s + i.qty, 0);
  // Цена за единицу — ИТОГОВАЯ (уже со скидкой, если она применялась), т.к. клиент должен видеть финальную цену за 1 корзину
  const finalUnitPrice = totalQtyAll > 0 ? Math.round(totalWithDisc / totalQtyAll) : 0;
  const baseUnitPrice  = totalQtyAll > 0 ? Math.round(totalWithoutDisc / totalQtyAll) : 0;

  const tableRows = posGroups.map(g => {
    const groupFullSum  = finalUnitPrice * g.total;
    // Цвета в той же ячейке количества — через строки
    const colorLines = g.colors.map(c => `${c.color}: ${c.qty} шт`).join('<br>');
    const priceCell = disc > 0
      ? `<span class="strike">${baseUnitPrice.toLocaleString('ru-RU')} ₽</span><br>${finalUnitPrice.toLocaleString('ru-RU')} ₽`
      : (finalUnitPrice > 0 ? finalUnitPrice.toLocaleString('ru-RU') + ' ₽' : '—');
    return `
      <tr class="pos-row">
        <td>${g.title}</td>
        <td class="num">${g.total}<br><span class="color-list">${colorLines}</span></td>
        <td class="num">${priceCell}</td>
        <td class="num bold">${groupFullSum > 0 ? groupFullSum.toLocaleString('ru-RU') + ' ₽' : '—'}</td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<title>Заказ #${order.order_number}</title>
<style>
  @page { size: A4 portrait; margin: 18mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #000; }

  .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 14px; }
  .company { font-size: 22px; font-weight: bold; letter-spacing: 3px; }
  .company-sub { font-size: 10px; color: #444; margin-top: 2px; }
  .order-info { text-align: right; font-size: 11px; color: #333; }
  .order-num { font-size: 14px; font-weight: bold; color: #000; }

  .section { margin-bottom: 12px; }
  .section-title { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #555; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin-bottom: 6px; }
  .grid2 { display: grid; grid-template-columns: 110px 1fr; gap: 2px 10px; font-size: 11px; }
  .lbl { color: #555; }

  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f0f0f0; text-align: left; padding: 5px 8px; border: 1px solid #ccc; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  th.r, td.r { text-align: right; }
  td { padding: 5px 8px; border: 1px solid #ddd; vertical-align: top; }
  .pos-row td { background: #f8f8f8; font-weight: 700; }
  .color-list { font-size: 9px; font-weight: normal; color: #555; font-style: italic; }
  .strike { text-decoration: line-through; color: #999; font-size: 10px; }
  .bold { font-weight: 700; }

  .totals { margin-top: 12px; border-top: 2px solid #000; padding-top: 8px; }
  .totals-table { margin-left: auto; width: 260px; font-size: 11px; border-collapse: collapse; }
  .totals-table td { padding: 2px 4px; border: none; }
  .totals-table td:last-child { text-align: right; font-weight: 600; }
  .totals-table .final td { font-size: 13px; font-weight: 800; border-top: 1px solid #000; padding-top: 4px; }
  .totals-table .grey { color: #777; }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="company">FABRICA</div>
    <div class="company-sub">Производство плетёных изделий</div>
  </div>
  <div class="order-info">
    <div class="order-num">Заказ №${order.order_number}</div>
    <div>Дата: ${orderDate}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Клиент</div>
  <div class="grid2">
    <div class="lbl">Имя</div><div>${order.customer_name || '—'}</div>
    <div class="lbl">Телефон</div><div>${order.customer_phone || form.phone || '—'}</div>
    ${order.customer_email || form.email ? `<div class="lbl">Email</div><div>${order.customer_email || form.email}</div>` : ''}
    ${form.inn ? `<div class="lbl">ИНН</div><div>${form.inn}</div>` : ''}
    ${order.city ? `<div class="lbl">Город</div><div>${order.city}</div>` : ''}
    ${order.delivery_address || form.address ? `<div class="lbl">Адрес</div><div>${order.delivery_address || form.address}</div>` : ''}
    ${order.delivery_type ? `<div class="lbl">Доставка</div><div>${DELIVERY_LABELS[order.delivery_type] || order.delivery_type}</div>` : ''}
    ${form.delivery_days ? `<div class="lbl">Дни</div><div>${form.delivery_days}</div>` : ''}
    ${form.delivery_time ? `<div class="lbl">Время</div><div>${form.delivery_time}</div>` : ''}
    ${order.payment_method || form.payment_method ? `<div class="lbl">Оплата</div><div>${order.payment_method || form.payment_method}</div>` : ''}
  </div>
</div>

<div class="section">
  <div class="section-title">Состав заказа</div>
  <table>
    <thead>
      <tr>
        <th>Позиция</th>
        <th class="r" style="width:120px">Кол-во / Цвета</th>
        <th class="r" style="width:75px">Цена / шт</th>
        <th class="r" style="width:85px">Сумма</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>

  <div class="totals">
    <table class="totals-table">
      <tr><td>Позиций всего:</td><td>${totalQtyAll} шт</td></tr>
      <tr><td>Общая сумма без скидки:</td><td>${totalWithoutDisc.toLocaleString('ru-RU')} ₽</td></tr>
      ${order.discount > 0 ? `
      <tr class="grey"><td>Скидка ${order.discount}%:</td><td>− ${totalDiscount.toLocaleString('ru-RU')} ₽</td></tr>
      ` : ''}
      <tr class="final"><td>ИТОГО:</td><td>${totalWithDisc.toLocaleString('ru-RU')} ₽</td></tr>
    </table>
  </div>
</div>

${order.comment || form.comment ? `<div class="section"><div class="section-title">Комментарий</div><p style="font-size:11px;color:#333;margin-top:4px;">${order.comment || form.comment}</p></div>` : ''}

</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (win) win.onload = () => setTimeout(() => win.print(), 400);
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

// ── Компонент ─────────────────────────────────────────────────────────────────
const OrderFullCard = ({ order, onClose, onUpdate, onOpenClient }: Props) => {
  const positions = groupPositions(order.items);
  const posGroups = buildPosGroups(order.items);
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
            <button onClick={() => generateOrderPDF(order)} title="Бланк для клиента (PDF/печать)"
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
              {!showColors ? (
                // Сгруппировано по позиции — только название и итого
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-primary/5 text-xs text-primary/60 border-b border-primary/15">
                      <th className="px-3 py-2 text-left font-semibold">Позиция</th>
                      <th className="px-3 py-2 text-right font-semibold">Кол-во</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posGroups.map((g, i) => (
                      <tr key={i} className="border-b border-primary/10 last:border-0">
                        <td className="px-3 py-2 text-primary font-medium">{displayTitle(g.title)}</td>
                        <td className="px-3 py-2 text-right font-bold text-primary">{g.total}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-primary/5 border-t-2 border-primary/20">
                      <td className="px-3 py-2 font-bold text-primary">Итого</td>
                      <td className="px-3 py-2 text-right font-bold text-primary">{order.items.reduce((s,i)=>s+i.qty,0)} шт</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                // Развёрнуто: позиция → цвета (как в мини-карточке)
                <div>
                  {posGroups.map((g, gi) => (
                    <div key={gi}>
                      {/* Строка позиции — шапка */}
                      <div className="flex justify-between items-center px-3 py-2 bg-primary/5 border-b border-primary/20">
                        <span className="font-bold text-primary text-sm">{displayTitle(g.title)}</span>
                        <span className="font-bold text-primary text-sm">{g.total} шт</span>
                      </div>
                      {/* Строки цветов */}
                      {g.colors.map((c, ci) => (
                        <div key={ci} className="flex justify-between items-center px-3 py-1.5 pl-6 border-b border-primary/10 last:border-0">
                          <span className="text-sm text-primary/70">{c.color}</span>
                          <span className="text-sm text-primary/80 font-medium">{c.qty}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {/* Итого */}
                  <div className="flex justify-between items-center px-3 py-2 bg-primary/5 border-t-2 border-primary/20">
                    <span className="font-bold text-primary">Итого</span>
                    <span className="font-bold text-primary">{order.items.reduce((s,i)=>s+i.qty,0)} шт</span>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-2 text-right">
              <span className="text-sm text-muted-foreground">Сумма: </span>
              <span className="font-bold text-primary text-lg">{fmtMoney(order.total)}</span>
              {order.discount > 0 && (
                <span className="ml-2 text-sm font-semibold" style={{ color: OLIVE }}>−{order.discount}%</span>
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
                        <span className="text-primary/80">{displayTitle(pos.title)}</span>
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
                    <img src={url} alt="" className="w-20 h-20 object-cover rounded-xl border border-primary/20 cursor-pointer"
                      onClick={() => window.open(url, '_blank')}
                      onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                    <div className="absolute inset-0 bg-black/40 rounded-xl hidden group-hover:flex items-center justify-center gap-1">
                      <button onClick={() => window.open(url, '_blank')} className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-[11px]">↗</button>
                      <a href={url} download className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-[11px]">⬇</a>
                      <button onClick={() => removeAttachment(url)} className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-[11px]">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-primary/30 text-sm text-primary hover:border-primary cursor-pointer transition-colors ${uploading?'opacity-50':''}`}>
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