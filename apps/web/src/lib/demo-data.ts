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
    // Verified: "Woman in white button-up holding her hair — editorial portrait"
    imageUrl:
      'https://images.unsplash.com/photo-1609369350331-4f12b446d487?auto=format&fit=crop&w=900&q=70',
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
    // Verified: "brown leather belt on white textile"
    imageUrl:
      'https://images.unsplash.com/photo-1586232710888-675866d80ad2?auto=format&fit=crop&w=900&q=70',
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
    // Verified: "a tray with a silver tea pot and two cups on it"
    imageUrl:
      'https://images.unsplash.com/photo-1642582431503-5276a6b9798d?auto=format&fit=crop&w=900&q=70',
    price: 65000,
  },
  {
    id: 'd6',
    category: 'artwork',
    title: 'Pine Forest Landscape',
    brand: 'Royal Academy',
    colour: 'Earth',
    status: 'available',
    // Verified: "Brown wooden framed painting of green and brown tree"
    imageUrl:
      'https://images.unsplash.com/photo-1605845872108-b733db1f2663?auto=format&fit=crop&w=900&q=70',
    price: 850000,
    details: { medium: 'Oil on canvas', condition: 'excellent' },
  },
  {
    id: 'd7',
    category: 'apparel',
    title: 'Silk Saree',
    brand: 'Raw Mango',
    colour: 'Indigo',
    status: 'lent',
    // Verified: "Woman in purple sari with traditional jewelry — editorial"
    imageUrl:
      'https://images.unsplash.com/photo-1758985402758-ac52f206518c?auto=format&fit=crop&w=900&q=70',
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
