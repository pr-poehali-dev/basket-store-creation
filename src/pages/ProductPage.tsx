import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import urls from '../../backend/func2url.json';

interface Product {
  id: number;
  name: string;
  description: string;
  shape: string;
  size: string;
  color: string;
  price: number;
  sale_price: number | null;
  image_url: string;
  group_id: string | null;
  group_by: string | null;
  split_by: string | null;
  набор: string | null;
}

interface Card {
  type: 'single' | 'group';
  group_id?: string;
  variants: Product[];
}

// Русские названия -> поле в объекте Product
// Набор и Размер — оба хранятся в поле size
const FIELD_MAP: Record<string, string> = {
  'размер': 'size',
  'цвет': 'color',
  'набор': 'size',
};

const FIELD_LABELS: Record<string, string> = {
  color: 'Цвет',
  size: 'Размер / Набор',
};

function colorToCss(color: string): string {
  if (!color) return '#cccccc';
  return color.trim();
}

// Парсим group_by — какие характеристики варьируются внутри карточки
// Дедуплицируем (Размер + Набор оба -> size, показываем один раз)
function parseGroupBy(s: string | null): string[] {
  if (!s) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of s.split(';')) {
    const k = part.trim().toLowerCase();
    const field = FIELD_MAP[k] || k;
    if (field && !seen.has(field)) {
      seen.add(field);
      result.push(field);
    }
  }
  return result;
}

const ProductPage = () => {
  const { groupId, cardIndex } = useParams<{ groupId: string; cardIndex: string }>();
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);

  useEffect(() => {
    fetch(urls['products'])
      .then(r => r.json())
      .then(data => {
        setCards(data.cards || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Находим нужную карточку
  const card = useMemo(() => {
    if (!cards.length) return null;
    const idx = parseInt(cardIndex || '0', 10);
    // Ищем среди карточек этой группы
    const groupCards = cards.filter(c => c.group_id === groupId || (groupId === 'single' && c.type === 'single'));
    return groupCards[idx] || null;
  }, [cards, groupId, cardIndex]);

  const active = card?.variants[activeVariantIdx] ?? card?.variants[0];
  const groupByFields = useMemo(() => parseGroupBy(active?.group_by || null), [active]);

  // Для каждого поля из group_by — уникальные значения
  const variantOptions = useMemo(() => {
    if (!card) return {};
    const result: Record<string, string[]> = {};
    for (const field of groupByFields) {
      const values: string[] = [];
      for (const v of card.variants) {
        const val = String(v[field as keyof Product] || '');
        if (val && !values.includes(val)) values.push(val);
      }
      if (values.length > 1) result[field] = values;
    }
    return result;
  }, [card, groupByFields]);

  // Текущий выбор по каждому полю
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});

  // Инициализируем selectedAttrs при загрузке карточки
  useEffect(() => {
    if (!active) return;
    const init: Record<string, string> = {};
    for (const field of groupByFields) {
      const val = String(active[field as keyof Product] || '');
      if (val) init[field] = val;
    }
    setSelectedAttrs(init);
  }, [card?.group_id]);

  // При изменении выбора — находим подходящий вариант
  useEffect(() => {
    if (!card || Object.keys(selectedAttrs).length === 0) return;
    const idx = card.variants.findIndex(v =>
      Object.entries(selectedAttrs).every(([field, val]) =>
        String(v[field as keyof Product] || '') === val
      )
    );
    if (idx !== -1) setActiveVariantIdx(idx);
  }, [selectedAttrs]);

  const handleAttrSelect = (field: string, value: string) => {
    setSelectedAttrs(prev => ({ ...prev, [field]: value }));
  };

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
            <span className="text-foreground">{active.name}</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-12 lg:gap-20">

            {/* Фото */}
            <div className="space-y-4">
              <div className="aspect-square bg-secondary overflow-hidden">
                {active.image_url
                  ? <img src={active.image_url} alt={active.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <Icon name="Image" size={64} className="opacity-20" />
                    </div>
                }
              </div>
            </div>

            {/* Информация */}
            <div className="flex flex-col">
              {/* Бейджи */}
              <div className="flex items-center flex-wrap gap-2 mb-4">
                <span className="text-[11px] uppercase tracking-wider text-accent border border-accent/40 px-2 py-0.5">{active.shape}</span>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground border border-border px-2 py-0.5">{active.size}</span>
              </div>

              <h1 className="font-display text-4xl font-semibold mb-3">{active.name}</h1>

              {active.description && (
                <p className="text-muted-foreground mb-6 leading-relaxed">{active.description}</p>
              )}

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

              {/* Характеристики для выбора */}
              <div className="space-y-6 mb-8">
                {Object.entries(variantOptions).map(([field, values]) => (
                  <div key={field}>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                      {FIELD_LABELS[field] || field}
                      {field === 'color' && selectedAttrs[field] && (
                        <span className="ml-2 normal-case font-normal text-foreground">{selectedAttrs[field]}</span>
                      )}
                    </p>

                    {field === 'color' ? (
                      // Цвет — кружки
                      <div className="flex flex-wrap gap-3">
                        {values.map(val => {
                          const isActive = selectedAttrs[field] === val;
                          return (
                            <button
                              key={val}
                              title={val}
                              onClick={() => handleAttrSelect(field, val)}
                              className={`w-8 h-8 rounded-full border-2 transition-all ${isActive ? 'border-accent scale-110' : 'border-transparent hover:border-accent/50'}`}
                              style={{ backgroundColor: colorToCss(val) }}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      // Остальные — кнопки
                      <div className="flex flex-wrap gap-2">
                        {values.map(val => {
                          const isActive = selectedAttrs[field] === val;
                          return (
                            <button
                              key={val}
                              onClick={() => handleAttrSelect(field, val)}
                              className={`px-4 py-2 text-sm border transition-colors ${
                                isActive
                                  ? 'border-accent bg-accent text-accent-foreground'
                                  : 'border-border hover:border-accent'
                              }`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Кнопки */}
              <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                <Button className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-12 text-base">
                  В корзину
                </Button>
                <Button variant="outline" className="rounded-none h-12" onClick={() => navigate('/catalog')}>
                  <Icon name="ArrowLeft" size={16} className="mr-2" />
                  Назад
                </Button>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductPage;