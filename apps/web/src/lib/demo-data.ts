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
    title: 'Wool Overcoat',
    brand: 'COS',
    colour: 'Camel',
    status: 'available',
    imageUrl:
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=70',
    price: 18900,
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
    title: 'Pearl Studs',
    brand: 'Tanishq',
    colour: 'Cream',
    status: 'available',
    imageUrl:
      'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?auto=format&fit=crop&w=900&q=70',
    price: 24500,
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
    title: 'Aviators',
    brand: 'Ray-Ban',
    colour: 'Gold',
    status: 'available',
    imageUrl:
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=900&q=70',
    price: 9500,
  },
];
