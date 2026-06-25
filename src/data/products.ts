export interface Product {
  id: number;
  name: string;
  shape: string;
  size: 'Малые' | 'Средние' | 'Большие';
  price: number;
  image: string;
  desc: string;
}

const img1 = 'https://cdn.poehali.dev/projects/d5ee4f52-1455-4c6a-a1d4-6138f3445871/files/d3badcc8-9a0e-48a6-bc9c-a8ce1090c276.jpg';
const img2 = 'https://cdn.poehali.dev/projects/d5ee4f52-1455-4c6a-a1d4-6138f3445871/files/22ef5062-c397-42e5-a593-77236d2a1500.jpg';
const img3 = 'https://cdn.poehali.dev/projects/d5ee4f52-1455-4c6a-a1d4-6138f3445871/files/a944da5a-4f75-47e3-bf49-f336ddb92630.jpg';

export const SHAPES = ['Круглые', 'Овальные', 'Прямоугольные', 'Сердечки'];
export const SIZES = ['до 30 см', '30-50 см', '50-120 см'] as const;

export const products: Product[] = [
  { id: 1, name: 'Корзина «Прованс»', shape: 'Круглые', size: 'Малые', price: 320, image: img1, desc: 'Плетение ручной работы, диаметр 24 см' },
  { id: 2, name: 'Корзина «Стандарт»', shape: 'Прямоугольные', size: 'Большие', price: 680, image: img2, desc: 'Универсальная для хранения, 45 см' },
  { id: 3, name: 'Набор «Трио»', shape: 'Овальные', size: 'Средние', price: 540, image: img3, desc: 'Комплект из 3 корзин разного размера' },
  { id: 4, name: 'Корзина «Эко»', shape: 'Круглые', size: 'Малые', price: 290, image: img1, desc: 'Лёгкая, для декора и мелочей' },
  { id: 5, name: 'Корзина «Хозяюшка»', shape: 'Прямоугольные', size: 'Большие', price: 750, image: img2, desc: 'Прочная, с усиленным дном, 50 см' },
  { id: 6, name: 'Корзина «Лофт»', shape: 'Овальные', size: 'Средние', price: 460, image: img3, desc: 'Современный дизайн, 35 см' },
  { id: 7, name: 'Корзина «Классик»', shape: 'Круглые', size: 'Средние', price: 420, image: img1, desc: 'Традиционное плетение, 32 см' },
  { id: 8, name: 'Корзина «Гранд»', shape: 'Прямоугольные', size: 'Большие', price: 890, image: img2, desc: 'Большая корзина для текстиля, 55 см' },
  { id: 9, name: 'Корзина «Сердечко»', shape: 'Сердечки', size: 'Малые', price: 350, image: img3, desc: 'Подарочная корзина в форме сердца, 22 см' },
];