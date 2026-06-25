import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import urls from '../../backend/func2url.json';
import { colorToCss, sortColors } from '@/data/colors';
import { useCart } from '@/context/CartContext';

interface Product {
  id: number;
  name: string;
  description: string;
  shape: string;
  size: string;
  size_category: string;
  color: string;
  price: number;
  sale_price: number | null;
  image_url: string;
  group_id: string | null;
  group_by: string | null;
  split_by: string | null;
}

interface Card {
  type: 'single' | 'group';
  group_id?: string;
  variants: Product[];
}

// Поля разбиения: что создаёт разные карточки
const SPLIT_MAP: Record<string, string> = {
  'размер': 'size',
  'набор': 'size',
  'цвет': 'color',
};

// Метка карточки для кнопки выбора (размер/набор)
function getCardLabel(card: Card): string {
  const v = card.variants[0];
  if (!v) return '—';
  return v.size || v.name;
}

const ProductPage = () => {
  const { groupId, cardIndex } = useParams<{ groupId: string; cardIndex: string }>();
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  // Индекс активной карточки в группе (переключение размера/набора)
  const [activeCardIdx, setActiveCardIdx] = useState(() => parseInt(cardIndex || '0', 10));
  // Индекс активного варианта внутри карточки (переключение цвета)
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);
  // Количество
  const [qty, setQty] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const { addItem } = useCart();

  const changeQty = (delta: number) => setQty(q => Math.max(1, q + delta));
  const handleQtyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1) setQty(val);
    else if (e.target.value === '') setQty(1);
  };

  useEffect(() => {
    fetch(urls['products'])
      .then(r => r.json())
      .then(data => {
        setCards(data.cards || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Все карточки этой группы
  const groupCards = useMemo(() => {
    if (!cards.length) return [];
    if (groupId === 'single') return cards.filter(c => c.type === 'single');
    return cards.filter(c => c.group_id === groupId);
  }, [cards, groupId]);

  // Текущая карточка
  const card = groupCards[activeCardIdx] ?? groupCards[0];

  // При смене карточки — активируем первый цвет по сортировке (натуральный)
  useEffect(() => {
    if (!card) return;
    const seen = new Set<string>();
    const unique = card.variants.filter(v => {
      const key = v.color || '';
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const sorted = sortColors(unique);
    const first = sorted[0];
    setActiveVariantIdx(first ? card.variants.indexOf(first) : 0);
    setQty(1);
  }, [activeCardIdx, card?.group_id]);

  const active = card?.variants[activeVariantIdx] ?? card?.variants[0];

  // Уникальные цвета в текущей карточке
  const colorVariants = useMemo(() => {
    if (!card) return [];
    const seen = new Set<string>();
    const unique = card.variants.filter(v => {
      const key = v.color || '';
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return sortColors(unique);
  }, [card]);

  // Определяем split_by — по чему разбиты карточки (для заголовка секции)
  const splitLabel = useMemo(() => {
    if (!card?.variants[0]?.split_by) return 'Размер / Набор';
    const parts = card.variants[0].split_by.split(';').map(s => s.trim()).filter(Boolean);
    return parts.join(' / ');
  }, [card]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-40 text-center text-muted-foreground">
          <Icon name="Loader" size={36} className="mx-auto mb-4 opacity-40 animate-spin" />
          Загружаю...
        </div>
      </div>
    );
  }

  if (!card || !active) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-40 text-center text-muted-foreground">
          <Icon name="PackageX" size={40} className="mx-auto mb-4 opacity-40" />
          <p className="mb-4">Товар не найден</p>
          <Button variant="outline" className="rounded-none" onClick={() => navigate('/catalog')}>
            Вернуться в каталог
          </Button>
        </div>
      </div>
    );
  }

  // Название модели — берём из первой карточки группы (убираем размер если он в скобках)
  const modelName = groupCards[0]?.variants[0]?.name || active.name;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="pt-32 pb-24 px-6">
        <div className="container mx-auto">

          {/* Хлебные крошки */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-10">
            <Link to="/" className="hover:text-accent transition-colors">Главная</Link>
            <Icon name="ChevronRight" size={14} />
            <Link to="/catalog" className="hover:text-accent transition-colors">Каталог</Link>
            <Icon name="ChevronRight" size={14} />
            <span className="text-foreground">{modelName}</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-12 lg:gap-20">

            {/* Фото */}
            <div className="aspect-square bg-secondary overflow-hidden">
              {active.image_url
                ? <img src={active.image_url} alt={active.name} className="w-full h-full object-cover transition-all duration-300" />
                : <div className="w-full h-full flex items-center justify-center">
                    <Icon name="Image" size={64} className="opacity-20" />
                  </div>
              }
            </div>

            {/* Информация */}
            <div className="flex flex-col">
              {/* Бейджи */}
              <div className="flex items-center flex-wrap gap-2 mb-4">
                <span className="text-[11px] uppercase tracking-wider text-accent border border-accent/40 px-2 py-0.5">{active.shape}</span>
              </div>

              <h1 className="font-display text-4xl font-semibold mb-2">{active.name}</h1>
              <p className="text-muted-foreground text-sm mb-6">{active.size}</p>

              <div className="space-y-6 mb-8">

                {/* Выбор размера/набора — между карточками группы */}
                {groupCards.length > 1 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{splitLabel}</p>
                    <div className="flex flex-wrap gap-2">
                      {groupCards.map((c, idx) => {
                        const label = getCardLabel(c);
                        const isActive = idx === activeCardIdx;
                        return (
                          <button
                            key={idx}
                            onClick={() => setActiveCardIdx(idx)}
                            className={`px-4 py-2 text-sm border transition-colors ${
                              isActive
                                ? 'border-accent bg-accent text-accent-foreground'
                                : 'border-border hover:border-accent'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Выбор цвета — внутри карточки */}
                {colorVariants.length > 1 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                      Цвет: <span className="normal-case font-normal text-foreground ml-1">{active.color}</span>
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {colorVariants.map((v) => {
                        const realIdx = card.variants.indexOf(v);
                        const isActive = realIdx === activeVariantIdx;
                        return (
                          <button
                            key={v.id}
                            title={v.color}
                            onClick={() => { setActiveVariantIdx(realIdx); setQty(1); }}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              isActive ? 'border-accent scale-110' : 'border-transparent hover:border-accent/50'
                            }`}
                            style={{ backgroundColor: colorToCss(v.color) }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Цена */}
              <div className="mb-8">
                {active.sale_price ? (
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-3xl font-semibold text-accent">{active.sale_price} ₽</span>
                    <span className="text-lg text-muted-foreground line-through">{active.price} ₽</span>
                  </div>
                ) : (
                  <span className="font-display text-3xl font-semibold">{active.price} ₽</span>
                )}
              </div>

              {/* Количество */}
              <div className="mb-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Количество</p>
                <div className="flex items-center gap-0 w-36">
                  <button
                    onClick={() => changeQty(-1)}
                    className="w-10 h-10 border border-border flex items-center justify-center hover:border-accent hover:text-accent transition-colors text-lg"
                  >−</button>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={handleQtyInput}
                    className="w-16 h-10 border-y border-border text-center text-sm outline-none focus:border-accent bg-background [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => changeQty(1)}
                    className="w-10 h-10 border border-border flex items-center justify-center hover:border-accent hover:text-accent transition-colors text-lg"
                  >+</button>
                </div>
              </div>

              {/* Кнопки */}
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <Button
                  onClick={() => {
                    addItem({
                      id: active.id,
                      name: active.name,
                      price: active.price,
                      sale_price: active.sale_price,
                      image_url: active.image_url,
                      color: active.color,
                      size: active.size,
                      is_promo: !!active.sale_price,
                    }, qty);
                    setAddedToCart(true);
                    setTimeout(() => setAddedToCart(false), 2000);
                  }}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-12 text-base"
                >
                  <Icon name={addedToCart ? 'Check' : 'ShoppingCart'} size={18} className="mr-2" />
                  {addedToCart ? 'Добавлено!' : 'В корзину'}
                </Button>
                <Button variant="outline" className="rounded-none h-12" onClick={() => navigate('/catalog')}>
                  <Icon name="ArrowLeft" size={16} className="mr-2" />
                  Назад
                </Button>
              </div>

              {/* Описание — в конце, с абзацами по · */}
              {active.description && (
                <div className="text-muted-foreground leading-relaxed space-y-2 border-t border-border pt-6">
                  {active.description.split('·').map((part, i) => {
                    const text = part.trim();
                    if (!text) return null;
                    return (
                      <p key={i} className={i === 0 ? '' : 'flex gap-2'}>
                        {i > 0 && <span className="text-accent mt-0.5">·</span>}
                        {text}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductPage;