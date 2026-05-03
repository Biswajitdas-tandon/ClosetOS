import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CATEGORIES, CATEGORY_LABEL, type Category, type Status } from '@closetos/domain';
import { theme } from '../lib/theme';
import { ItemCard } from '../components/ItemCard';
import { CategoryChip } from '../components/CategoryChip';
import { supabase, isConfigured } from '../lib/supabase';
import { DEMO_ITEMS } from '../lib/demo-data';

type LibItem = {
  id: string;
  category: Category;
  title: string;
  brand?: string | null;
  colour?: string | null;
  status: Status;
  imageUrl?: string;
};

export default function LibraryScreen() {
  const router = useRouter();
  const [activeCat, setActiveCat] = useState<Category | undefined>();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<LibItem[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const isDemo = !isConfigured() || !signedIn;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isConfigured()) {
        if (!cancelled) {
          setItems(DEMO_ITEMS as LibItem[]);
          setLoading(false);
        }
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        setSignedIn(false);
        setItems(DEMO_ITEMS as LibItem[]);
        setLoading(false);
        return;
      }
      setSignedIn(true);
      const { data } = await supabase
        .from('items')
        .select('id, category, title, brand, colour, status')
        .order('created_at', { ascending: false })
        .limit(200);
      if (cancelled) return;
      setItems(
        (data ?? []).map((r) => ({
          id: r.id as string,
          category: r.category as Category,
          title: (r.title as string) ?? '(untitled)',
          brand: r.brand as string | null,
          colour: r.colour as string | null,
          status: r.status as Status,
        })),
      );
      setLoading(false);
    }
    load();
    const sub = supabase.auth.onAuthStateChange(() => load());
    return () => {
      cancelled = true;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  const filtered = useMemo(() => {
    let out = items;
    if (activeCat) out = out.filter((i) => i.category === activeCat);
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((i) =>
        [i.title, i.brand, i.colour].some((v) => v?.toLowerCase().includes(q)),
      );
    }
    return out;
  }, [items, activeCat, query]);

  const counts = useMemo(() => {
    const c: Record<Category, number> = { apparel: 0, accessory: 0, jewelry: 0, silver: 0, artwork: 0 };
    for (const i of items) c[i.category]++;
    return c;
  }, [items]);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.color.bg.base }}>
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 }}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Library</Text>
                <Text style={styles.subtitle}>
                  {isDemo ? 'Demo mode — sign in to start your collection' : `${items.length} items`}
                </Text>
              </View>
              <Pressable
                style={styles.cta}
                onPress={() => router.push(isDemo ? '/login' : '/library/add')}
              >
                <Text style={styles.ctaText}>{isDemo ? 'Sign in' : '+ Add'}</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by title, brand, colour…"
              placeholderTextColor={theme.color.text.muted}
              returnKeyType="search"
            />

            <View style={styles.chipRow}>
              <CategoryChip
                label="All"
                active={!activeCat}
                onPress={() => setActiveCat(undefined)}
              />
              {CATEGORIES.map((c) => (
                <CategoryChip
                  key={c}
                  label={CATEGORY_LABEL[c]}
                  count={counts[c]}
                  active={activeCat === c}
                  onPress={() => setActiveCat((cur) => (cur === c ? undefined : c))}
                />
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1 }}>
            <ItemCard
              title={item.title}
              subtitle={`${item.brand ?? ''} · ${CATEGORY_LABEL[item.category]}`}
              imageUrl={item.imageUrl}
              badge={item.colour ?? undefined}
              status={item.status}
              onPress={() => router.push({ pathname: '/library/[id]', params: { id: item.id } })}
            />
          </View>
        )}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyBody}>
                {isDemo
                  ? 'Sign in to add your first item.'
                  : 'Tap + Add to start building your collection.'}
              </Text>
              <Link href={isDemo ? '/login' : '/library/add'} asChild>
                <Pressable style={styles.cta}>
                  <Text style={styles.ctaText}>{isDemo ? 'Sign in' : 'Add item'}</Text>
                </Pressable>
              </Link>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  title: { fontSize: 32, fontWeight: '600', color: theme.color.text.primary },
  subtitle: { fontSize: 13, color: theme.color.text.secondary, marginTop: 2 },
  cta: {
    backgroundColor: theme.color.accent.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  ctaText: { color: theme.color.text.onAccent, fontSize: 14, fontWeight: '500' },
  search: {
    backgroundColor: theme.color.bg.surface,
    borderColor: theme.color.border.subtle,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.color.text.primary,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  empty: { padding: 32, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 22, fontWeight: '600', color: theme.color.text.primary },
  emptyBody: { fontSize: 14, color: theme.color.text.secondary, textAlign: 'center', marginBottom: 12 },
});
