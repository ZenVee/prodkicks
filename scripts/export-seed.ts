import { writeFileSync } from 'fs';
import { mockProducts } from '../src/data/products.ts';
import { mockCollections } from '../src/data/collections.ts';
import { mockDrops } from '../src/data/drops.ts';
import { mockStaff } from '../src/data/staff.ts';
import { mockSettings, mockHomepageContent } from '../src/data/settings.ts';

writeFileSync(
  'supabase/_seed_data.json',
  JSON.stringify({
    products: mockProducts,
    collections: mockCollections,
    drops: mockDrops,
    staff: mockStaff,
    settings: mockSettings,
    homepage: mockHomepageContent,
  })
);

console.log('seed json written');
