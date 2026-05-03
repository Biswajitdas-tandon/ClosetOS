import { z } from 'zod';
import { CATEGORIES, STATUS_VALUES } from './categories';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

// ----- per-category details -----

export const ApparelDetails = z.object({
  size: z.string().optional(),
  care: z.string().optional(),
  last_worn_date: isoDate.optional(),
});
export type ApparelDetails = z.infer<typeof ApparelDetails>;

export const AccessoryDetails = ApparelDetails;
export type AccessoryDetails = z.infer<typeof AccessoryDetails>;

export const JewelryDetails = z.object({
  weight_grams: z.number().nonnegative().optional(),
  hallmark: z.string().optional(),
  bill_url: z.string().url().optional(),
});
export type JewelryDetails = z.infer<typeof JewelryDetails>;

export const SilverDetails = JewelryDetails;
export type SilverDetails = z.infer<typeof SilverDetails>;

export const ArtworkDetails = z.object({
  type: z.string().optional(),                // Painting, Sculpture, Digital, ...
  medium: z.string().optional(),              // Oil, Acrylic, Mixed Media, ...
  artist_name: z.string().optional(),
  artist_bio: z.string().optional(),
  date_created: isoDate.optional(),
  current_value: z.number().nonnegative().optional(),
  bill_url: z.string().url().optional(),
  dimensions: z
    .object({
      height_cm: z.number().positive().optional(),
      width_cm: z.number().positive().optional(),
      depth_cm: z.number().positive().optional(),
    })
    .partial()
    .optional(),
  location: z.string().optional(),
  provenance: z.string().optional(),
  insurance_status: z.enum(['none', 'covered', 'pending']).optional(),
  insurance_value: z.number().nonnegative().optional(),
  condition: z.enum(['mint', 'excellent', 'good', 'fair', 'poor']).optional(),
});
export type ArtworkDetails = z.infer<typeof ArtworkDetails>;

// ----- base item -----

const ItemBase = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  folder_id: z.string().uuid().nullable().optional(),
  title: z.string().max(200).optional(),
  brand: z.string().max(120).optional(),
  colour: z.string().max(60).optional(),
  material: z.string().max(120).optional(),
  price_amount: z.number().nonnegative().optional(),
  price_currency: z.string().length(3).default('INR'),
  purchase_date: isoDate.optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(STATUS_VALUES).default('available'),
});

// Discriminated union by category
export const ItemSchema = z.discriminatedUnion('category', [
  ItemBase.extend({ category: z.literal('apparel'), details: ApparelDetails.default({}) }),
  ItemBase.extend({ category: z.literal('accessory'), details: AccessoryDetails.default({}) }),
  ItemBase.extend({ category: z.literal('jewelry'), details: JewelryDetails.default({}) }),
  ItemBase.extend({ category: z.literal('silver'), details: SilverDetails.default({}) }),
  ItemBase.extend({
    category: z.literal('artwork'),
    title: z.string().min(1, 'Artwork requires a title').max(200),
    details: ArtworkDetails.default({}),
  }),
]);

export type Item = z.infer<typeof ItemSchema>;

// ----- form metadata for dynamic UIs -----

export type FieldDef = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'currency' | 'file';
  options?: readonly string[];
  required?: boolean;
  detailsKey?: string; // if set, this lives under `details.{detailsKey}`
};

const COMMON_FIELDS: FieldDef[] = [
  { key: 'brand', label: 'Brand', type: 'text' },
  { key: 'colour', label: 'Colour', type: 'text' },
  { key: 'price_amount', label: 'Price', type: 'currency' },
  { key: 'purchase_date', label: 'Purchase date', type: 'date' },
  { key: 'material', label: 'Material', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export const FIELDS_BY_CATEGORY: Record<(typeof CATEGORIES)[number], FieldDef[]> = {
  apparel: [
    ...COMMON_FIELDS,
    { key: 'size', label: 'Size', type: 'text', detailsKey: 'size' },
    { key: 'care', label: 'Care instructions', type: 'textarea', detailsKey: 'care' },
  ],
  accessory: [
    ...COMMON_FIELDS,
    { key: 'size', label: 'Size', type: 'text', detailsKey: 'size' },
  ],
  jewelry: [
    ...COMMON_FIELDS,
    { key: 'weight_grams', label: 'Weight (g)', type: 'number', detailsKey: 'weight_grams' },
    { key: 'hallmark', label: 'Hallmark', type: 'text', detailsKey: 'hallmark' },
  ],
  silver: [
    ...COMMON_FIELDS,
    { key: 'weight_grams', label: 'Weight (g)', type: 'number', detailsKey: 'weight_grams' },
  ],
  artwork: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'type', label: 'Type', type: 'select', detailsKey: 'type',
      options: ['Painting', 'Sculpture', 'Print', 'Photograph', 'Digital', 'Mixed Media'] as const },
    { key: 'medium', label: 'Medium', type: 'text', detailsKey: 'medium' },
    { key: 'artist_name', label: 'Artist', type: 'text', detailsKey: 'artist_name' },
    { key: 'artist_bio', label: 'Artist bio / notes', type: 'textarea', detailsKey: 'artist_bio' },
    { key: 'date_created', label: 'Date created', type: 'date', detailsKey: 'date_created' },
    { key: 'purchase_date', label: 'Date acquired', type: 'date' },
    { key: 'price_amount', label: 'Purchase price', type: 'currency' },
    { key: 'current_value', label: 'Current estimated value', type: 'currency', detailsKey: 'current_value' },
    { key: 'location', label: 'Location (room / storage)', type: 'text', detailsKey: 'location' },
    { key: 'provenance', label: 'Provenance / history', type: 'textarea', detailsKey: 'provenance' },
    { key: 'insurance_status', label: 'Insurance', type: 'select', detailsKey: 'insurance_status',
      options: ['none', 'covered', 'pending'] as const },
    { key: 'insurance_value', label: 'Insurance value', type: 'currency', detailsKey: 'insurance_value' },
    { key: 'condition', label: 'Condition', type: 'select', detailsKey: 'condition',
      options: ['mint', 'excellent', 'good', 'fair', 'poor'] as const },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

// ----- search query parsing for NL search -----

export const SearchFilter = z.object({
  text: z.string().optional(),
  category: z.enum(CATEGORIES).optional(),
  colour: z.string().optional(),
  brand: z.string().optional(),
  status: z.enum(STATUS_VALUES).optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
  worn_after: isoDate.optional(),
  worn_before: isoDate.optional(),
});
export type SearchFilter = z.infer<typeof SearchFilter>;
