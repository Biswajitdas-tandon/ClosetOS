import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Category } from '@closetos/domain';
import { SiteHeader } from '@/components/SiteHeader';
import { ItemForm, type ExistingItem } from '@/components/ItemForm';
import { isSupabaseConfigured } from '@/lib/supabase';
import { serverClient } from '@/lib/supabase-server';
import { primaryImagePath, signImagePath, type ImageRow } from '@/lib/images';

export const dynamic = 'force-dynamic';

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) redirect(`/library/${id}`);

  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // RLS scopes this to the owner; a foreign id simply comes back empty.
  const { data } = await supabase
    .from('items')
    .select('id, category, title, brand, colour, material, price_amount, purchase_date, notes, status, details, item_images(storage_path, is_primary)')
    .eq('id', id)
    .maybeSingle();
  if (!data) notFound();

  const existing: ExistingItem = {
    id: data.id,
    category: data.category as Category,
    title: data.title,
    brand: data.brand,
    colour: data.colour,
    material: data.material,
    price_amount: data.price_amount,
    purchase_date: data.purchase_date,
    notes: data.notes,
    status: data.status,
    details: (data.details ?? null) as Record<string, unknown> | null,
    imageUrl: await signImagePath(
      supabase,
      primaryImagePath(data.item_images as ImageRow[] | null),
    ),
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl">Edit item</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Change any detail, swap the photo, or update the status.
            </p>
          </div>
          <Link href={`/library/${id}`} className="text-sm text-text-secondary hover:text-text-primary">
            Cancel
          </Link>
        </div>
        <ItemForm existing={existing} />
      </main>
    </div>
  );
}
