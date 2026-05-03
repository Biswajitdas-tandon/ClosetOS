export const CATEGORIES = ['apparel', 'accessory', 'jewelry', 'silver', 'artwork'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  apparel: 'Apparel',
  accessory: 'Accessories',
  jewelry: 'Jewelry',
  silver: 'Silver',
  artwork: 'Artwork',
};

export const CATEGORY_ICON: Record<Category, string> = {
  apparel: 'shirt',
  accessory: 'watch',
  jewelry: 'gem',
  silver: 'utensils',
  artwork: 'image',
};

export const STATUS_VALUES = ['available', 'lent', 'given_away', 'sold'] as const;
export type Status = (typeof STATUS_VALUES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  available: 'Available',
  lent: 'Lent',
  given_away: 'Given away',
  sold: 'Sold',
};

export const TAG_KINDS = ['occasion', 'season', 'custom'] as const;
export type TagKind = (typeof TAG_KINDS)[number];

export const COMMON_OCCASIONS = [
  'winter',
  'summer',
  'monsoon',
  'beach',
  'evening',
  'leisure',
  'formal',
  'wedding',
  'work',
  'travel',
] as const;
