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
};

export const DEMO_ITEMS: DemoItem[] = [
  {
    id: 'd1', category: 'apparel', title: 'Linen Shirt', brand: 'Uniqlo',
    colour: 'White', status: 'available', price: 2999,
    imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'd2', category: 'apparel', title: 'Wool Overcoat', brand: 'COS',
    colour: 'Camel', status: 'available', price: 18900,
    imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'd3', category: 'accessory', title: 'Leather Belt', brand: 'Hidesign',
    colour: 'Tan', status: 'available', price: 3500,
    imageUrl: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'd4', category: 'jewelry', title: 'Pearl Studs', brand: 'Tanishq',
    colour: 'Cream', status: 'available', price: 24500,
    imageUrl: 'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'd5', category: 'silver', title: 'Tea Service Set', brand: 'P. Orr & Sons',
    colour: 'Silver', status: 'available', price: 65000,
    imageUrl: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'd6', category: 'artwork', title: 'Untitled (Bombay, 1972)', brand: 'M. F. Husain',
    colour: 'Multi', status: 'available', price: 1250000,
    imageUrl: 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?auto=format&fit=crop&w=900&q=70',
  },
];
