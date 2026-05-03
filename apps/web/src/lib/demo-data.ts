import type { Category, Status } from '@closetos/domain';

export type DemoItem = {
  id: string;
  category: Category;
  title: string;
  brand: string;
  colour: string;
  status: Status;
  imageUrl: string;
  price?: number;
  details?: Record<string, unknown>;
};

// Used when the user hasn't connected Supabase yet — keeps the UI explorable.
export const DEMO_ITEMS: DemoItem[] = [
  {
    id: 'd1',
    category: 'apparel',
    title: 'Linen Shirt',
    brand: 'Uniqlo',
    colour: 'White',
    status: 'available',
    imageUrl:
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=70',
    price: 2999,
  },
  {
    id: 'd2',
    category: 'apparel',
    title: 'Camel Trench Coat',
    brand: 'Massimo Dutti',
    colour: 'Camel',
    status: 'available',
    imageUrl:
      'https://images.unsplash.com/photo-1777448067392-235aec6a10e4?auto=format&fit=crop&w=900&q=70',
    price: 15500,
  },
  {
    id: 'd3',
    category: 'accessory',
    title: 'Leather Belt',
    brand: 'Hidesign',
    colour: 'Tan',
    status: 'available',
    imageUrl:
      'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=900&q=70',
    price: 3500,
  },
  {
    id: 'd4',
    category: 'jewelry',
    title: 'Diamond Solitaire Ring',
    brand: 'Tanishq',
    colour: 'Silver',
    status: 'available',
    imageUrl:
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=70',
    price: 185000,
  },
  {
    id: 'd5',
    category: 'silver',
    title: 'Tea Service Set',
    brand: 'P. Orr & Sons',
    colour: 'Silver',
    status: 'available',
    imageUrl:
      'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=900&q=70',
    price: 65000,
  },
  {
    id: 'd6',
    category: 'artwork',
    title: 'Untitled (Bombay, 1972)',
    brand: 'M. F. Husain',
    colour: 'Multi',
    status: 'available',
    imageUrl:
      'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?auto=format&fit=crop&w=900&q=70',
    price: 1250000,
    details: { medium: 'Oil on canvas', condition: 'excellent' },
  },
  {
    id: 'd7',
    category: 'apparel',
    title: 'Silk Saree',
    brand: 'Raw Mango',
    colour: 'Indigo',
    status: 'lent',
    imageUrl:
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=70',
    price: 32000,
  },
  {
    id: 'd8',
    category: 'accessory',
    title: 'Cashmere Scarf',
    brand: 'Loro Piana',
    colour: 'Charcoal',
    status: 'available',
    imageUrl:
      'https://images.unsplash.com/photo-1603906650843-b58e94d9df4d?auto=format&fit=crop&w=900&q=70',
    price: 42000,
  },
];
