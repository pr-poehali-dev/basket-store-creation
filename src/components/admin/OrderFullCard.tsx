import { useState } from 'react';
import { Order, groupPositions, fmtMoney, fmtDateShort, RESPONSIBLES, DELIVERY_LABELS } from './orderUtils';
import urls from '../../../backend/func2url.json';

interface Props {
  order: Order;
  onClose: () => void;
  onUpdate: (id: number, patch: Partial<Order>) => void;
}

const OLIVE = '#6b7c3a';

const OrderFullCard = ({ order, onClose, onUpdate }: Props) => {
  const positions = groupPositions(order.items);
  const [comment, setComment] = useState(order.comment || '');
  const [notes, setNotes]     = useState(order.notes || '');
  const [savingComment, setSavingComment] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`order_attach_${order.id}`) || '[]'); }
    catch { return []; }
  });

  const saveComment = async () => {
    setSavingComment(true);
    await onUpdate(order.id, { comment, notes });
    setSavingComment(false);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = btoa(String.fromCharCode(...new Uint8Array(ev.target?.result as ArrayBuffer)));
      const res  = await fetch(urls['upload-image'], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: b64, ext }) });
      const data = await res.json();
      setUploading(false);
      if (data.url) {
        const next = [...attachments, data.url];
        setAttachments(next);
        localStorage.setItem(`order_attach_${order.id}`, JSON.stringify(next));
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const removeAttachment = (url: string) => {
    const next = attachments.filter(a => a !== url);
    setAttachments(next);
    localStorage.setItem(`order_attach_${order.id}`, JSON.stringify(next));
  };

  const downloadAttachment = (url: string) => {
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.download = url.split('/').pop() || 'file';
    a.click();
  };

  const respStyle = RESPONSIBLES.find(r => r.name === order.responsible);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background border border-primary/30 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Шапка */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-primary text-lg">{order.city} {order.customer_name}</span>
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
          <button onClick={onClose} className="text-muted-foreground hover:text-primary text-2xl ml-4 flex-shrink-0">✕</button>
        </div>

        {/* Контент */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          {/* Данные клиента */}
          <section>
            <h3 className="text-xs font-bold text-primary/50 uppercase tracking-wider mb-2">Клиент</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="text-muted-foreground">Имя</div>
              <div className="font-medium text-primary">{order.customer_name}</div>
              {order.customer_phone && <>
                <div className="text-muted-foreground">Телефон</div>
                <div className="font-medium text-primary">{order.customer_phone}</div>
              </>}
              {order.customer_email && <>
                <div className="text-muted-foreground">Email</div>
                <div className="font-medium text-primary">{order.customer_email}</div>
              </>}
              {order.city && <>
                <div className="text-muted-foreground">Город</div>
                <div className="text-primary">{order.city}</div>
              </>}
              {order.delivery_address && <>
                <div className="text-muted-foreground">Адрес</div>
                <div className="text-primary">{order.delivery_address}</div>
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
                  <div className="bg-accent/10 border border-accent/30 rounded-xl px-3 py-1.5 text-sm">
                    <div className="text-xs text-muted-foreground">Готовность</div>
                    <div className="font-bold text-primary">{fmtDateShort(order.due_date)}</div>
                  </div>
                )}
                {order.due_weaving && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-1.5 text-sm">
                    <div className="text-xs text-muted-foreground">Срок плетения</div>
                    <div className="font-bold text-primary">{fmtDateShort(order.due_weaving)}</div>
                  </div>
                )}
                {order.due_painting && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-1.5 text-sm">
                    <div className="text-xs text-muted-foreground">Срок покраски</div>
                    <div className="font-bold text-primary">{fmtDateShort(order.due_painting)}</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Позиции заказа */}
          <section>
            <h3 className="text-xs font-bold text-primary/50 uppercase tracking-wider mb-2">Позиции</h3>
            <div className="border border-primary/20 rounded-xl overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-primary/5 text-xs text-primary/60 border-b border-primary/15">
                    <th className="px-3 py-2 text-left font-semibold">Позиция</th>
                    <th className="px-3 py-2 text-left font-semibold">Цвет</th>
                    <th className="px-3 py-2 text-right font-semibold">Кол-во</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i} className="border-b border-primary/10 last:border-0">
                      <td className="px-3 py-2 text-primary font-medium">{item.name}{item.size ? ` (${item.size})` : ''}</td>
                      <td className="px-3 py-2 text-primary/70">{item.color || '—'}</td>
                      <td className="px-3 py-2 text-right font-bold text-primary">{item.qty}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-primary/5 border-t-2 border-primary/20">
                    <td className="px-3 py-2 font-bold text-primary" colSpan={2}>Итого</td>
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
          {(positions.some(p => (order.produced || {})[p.key])) && (
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
                            <div className="h-full rounded-full" style={{ width: `${Math.round(done/pos.total*100)}%`, backgroundColor: '#8a9a5a' }} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-primary/60">Покрашено</span>
                            <span style={{ color: OLIVE }}>{painted}/{pos.total}</span>
                          </div>
                          <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.round(painted/pos.total*100)}%`, backgroundColor: '#c4a882' }} />
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
          {order.comment && (
            <section>
              <h3 className="text-xs font-bold text-primary/50 uppercase tracking-wider mb-1">Комментарий клиента</h3>
              <p className="text-sm text-primary/80 bg-primary/5 rounded-xl px-3 py-2">{order.comment}</p>
            </section>
          )}

          {/* Заметки (внутренние) */}
          <section>
            <h3 className="text-xs font-bold text-primary/50 uppercase tracking-wider mb-2">Внутренние заметки</h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Заметки видны только сотрудникам..."
              className="w-full border border-primary/25 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent resize-none"
            />
            <button onClick={saveComment} disabled={savingComment}
              className="mt-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 disabled:opacity-50">
              {savingComment ? 'Сохраняю...' : 'Сохранить'}
            </button>
          </section>

          {/* Вложения */}
          <section>
            <h3 className="text-xs font-bold text-primary/50 uppercase tracking-wider mb-2">Фото и вложения</h3>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {attachments.map(url => (
                  <div key={url} className="relative group">
                    <img src={url} className="w-16 h-16 object-cover rounded-xl border border-primary/20" />
                    <div className="absolute inset-0 bg-black/40 rounded-xl hidden group-hover:flex items-center justify-center gap-1">
                      <button onClick={() => downloadAttachment(url)} className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-[10px]">⬇</button>
                      <button onClick={() => removeAttachment(url)} className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px]">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-primary/30 text-sm text-primary hover:border-primary cursor-pointer transition-colors ${uploading ? 'opacity-50' : ''}`}>
              {uploading ? '⏳ Загружаю...' : '📎 Прикрепить фото'}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} disabled={uploading} />
            </label>
          </section>
        </div>
      </div>
    </div>
  );
};

export default OrderFullCard;
