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

// Kept in sync with apps/web/src/lib/demo-data.ts so both clients show
// the same demo collection when not connected to a Supabase account.
export const DEMO_ITEMS: DemoItem[] = [
  {
    id: 'd1', category: 'apparel', title: 'Linen Shirt', brand: 'Uniqlo',
    colour: 'White', status: 'available', price: 2999,
    imageUrl: 'https://images.unsplash.com/photo-1609369350331-4f12b446d487?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'd2', category: 'apparel', title: 'Camel Trench Coat', brand: 'Massimo Dutti',
    colour: 'Camel', status: 'available', price: 15500,
    imageUrl: 'https://images.unsplash.com/photo-1777448067392-235aec6a10e4?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'd3', category: 'accessory', title: 'Leather Belt', brand: 'Hidesign',
    colour: 'Tan', status: 'available', price: 3500,
    imageUrl: 'https://images.unsplash.com/photo-1586232710888-675866d80ad2?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'd4', category: 'jewelry', title: 'Diamond Solitaire Ring', brand: 'Tanishq',
    colour: 'Silver', status: 'available', price: 185000,
    imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'd5', category: 'silver', title: 'Tea Service Set', brand: 'P. Orr & Sons',
    colour: 'Silver', status: 'available', price: 65000,
    imageUrl: 'https://images.unsplash.com/photo-1642582431503-5276a6b9798d?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'd6', category: 'artwork', title: 'Pine Forest Landscape', brand: 'Royal Academy',
    colour: 'Earth', status: 'available', price: 850000,
    imageUrl: 'https://images.unsplash.com/photo-1605845872108-b733db1f2663?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'd7', category: 'apparel', title: 'Silk Saree', brand: 'Raw Mango',
    colour: 'Indigo', status: 'lent', price: 32000,
    imageUrl: 'https://images.unsplash.com/photo-1758985402758-ac52f206518c?auto=format&fit=crop&w=900&q=70',
  },
  {
    id: 'd8', category: 'accessory', title: 'Cashmere Scarf', brand: 'Loro Piana',
    colour: 'Charcoal', status: 'available', price: 42000,
    imageUrl: 'https://images.unsplash.com/photo-1603906650843-b58e94d9df4d?auto=format&fit=crop&w=900&q=70',
  },
];
