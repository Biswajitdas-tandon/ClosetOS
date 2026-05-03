import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { CATEGORY_LABEL, STATUS_LABEL, type Category, type Status } from '@closetos/domain';
import { theme } from '../../lib/theme';
import { supabase, isConfigured } from '../../lib/supabase';
import { DEMO_ITEMS } from '../../lib/demo-data';

type ItemRow = {
  id: string;
  title: string;
  category: Category;
  brand?: string | null;
  colour?: string | null;
  material?: string | null;
  price_amount?: number | null;
  price_currency?: string;
  status: Status;
  notes?: string | null;
  details?: Record<string, unknown> | null;
  imageUrl?: string;
};

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<ItemRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isConfigured()) {
        const d = DEMO_ITEMS.find((x) => x.id === id);
        if (!cancelled && d) {
          setItem({
            id: d.id, title: d.title, category: d.category, brand: d.brand,
            colour: d.colour, status: d.status, price_amount: d.price,
            price_currency: 'INR', imageUrl: d.imageUrl,
          });
        }
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('items')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setItem({
          id: data.id as string,
          title: (data.title as string) ?? '(untitled)',
          category: data.category as Category,
          brand: data.brand as string | null,
          colour: data.colour as string | null,
          material: data.material as string | null,
          price_amount: data.price_amount as number | null,
          price_currency: data.price_currency as string,
          status: data.status as Status,
          notes: data.notes as string | null,
          details: data.details as Record<string, unknown>,
        });
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <View style={styles.empty}><Text style={styles.emptyText}>Loading…</Text></View>;
  if (!item) return <View style={styles.empty}><Text style={styles.emptyText}>Not found</Text></View>;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.imageWrap}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <Text style={styles.imageMissing}>No image</Text>
        )}
      </View>

      <View style={{ padding: 20, gap: 8 }}>
        <Text style={styles.eyebrow}>{CATEGORY_LABEL[item.category].toUpperCase()}</Text>
        <Text style={styles.title}>{item.title}</Text>
        {item.brand ? <Text style={styles.brand}>{item.brand}</Text> : null}

        <View style={styles.divider} />

        <FieldRow label="Status" value={STATUS_LABEL[item.status]} />
        {item.colour ? <FieldRow label="Colour" value={item.colour} /> : null}
        {item.material ? <FieldRow label="Material" value={item.material} /> : null}
        {item.price_amount != null ? (
          <FieldRow
            label="Price"
            value={`${item.price_currency ?? 'INR'} ${item.price_amount.toLocaleString()}`}
          />
        ) : null}
        {Object.entries(item.details ?? {}).map(([k, v]) =>
          v == null || v === '' ? null : <FieldRow key={k} label={prettyKey(k)} value={String(v)} />
        )}

        {item.notes ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.eyebrow}>NOTES</Text>
            <Text style={styles.notes}>{item.notes}</Text>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function prettyKey(k: string) {
  return k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: theme.color.bg.base, paddingBottom: 32 },
  imageWrap: { aspectRatio: 1, backgroundColor: theme.color.bg.muted },
  image: { width: '100%', height: '100%' },
  imageMissing: {
    flex: 1, textAlign: 'center', textAlignVertical: 'center',
    color: theme.color.text.muted, fontSize: 14,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2,
    color: theme.color.text.muted,
    fontWeight: '500',
  },
  title: { fontSize: 32, fontWeight: '600', color: theme.color.text.primary, marginTop: 4 },
  brand: { fontSize: 16, color: theme.color.text.secondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: theme.color.border.subtle, marginVertical: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, gap: 12 },
  rowLabel: { fontSize: 12, color: theme.color.text.muted, textTransform: 'uppercase', letterSpacing: 1 },
  rowValue: { fontSize: 14, color: theme.color.text.primary, flexShrink: 1, textAlign: 'right' },
  notes: { fontSize: 14, color: theme.color.text.secondary, lineHeight: 21 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.bg.base },
  emptyText: { color: theme.color.text.muted },
});
