import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { ItemForm } from '@/components/ItemForm';

export default function AddItemPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl">Add an item</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Add a photo, fill in the details, save.
            </p>
          </div>
          <Link href="/library" className="text-sm text-text-secondary hover:text-text-primary">
            Cancel
          </Link>
        </div>
        <ItemForm />
      </main>
    </div>
  );
}
