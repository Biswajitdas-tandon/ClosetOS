import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  CATEGORIES,
  CATEGORY_LABEL,
  FIELDS_BY_CATEGORY,
  ItemSchema,
  type Category,
} from '@closetos/domain';
import { theme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

type FormState = Record<string, string>;

export default function AddItemScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<Category>('apparel');
  const [values, setValues] = useState<FormState>({});
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fields = useMemo(() => FIELDS_BY_CATEGORY[category], [category]);

  function update(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function pickImage(source: 'camera' | 'library') {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', `Allow ${source} access to add a photo.`);
      return;
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.85,
          exif: false,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.85,
          exif: false,
          base64: true,
        });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setPhotoBase64(asset.base64 ?? null);
  }

  async function save() {
    setSubmitting(true);
    try {
      const payload = buildPayload(category, values);
      const parsed = ItemSchema.safeParse(payload);
      if (!parsed.success) {
        Alert.alert('Form invalid', parsed.error.issues[0]?.message ?? 'Please review fields');
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Not signed in', 'Sign in first to save items.');
        router.replace('/login');
        return;
      }
      const { data, error } = await supabase
        .from('items')
        .insert({ ...parsed.data, user_id: user.id })
        .select('id')
        .single();
      if (error) throw error;

      if (photoBase64 && data) {
        const path = `${user.id}/${data.id}/${Date.now()}.jpg`;
        const bytes = base64ToUint8Array(photoBase64);
        const up = await supabase.storage.from('items-private').upload(path, bytes, {
          contentType: 'image/jpeg',
          upsert: false,
        });
        if (!up.error) {
          await supabase.from('item_images').insert({
            item_id: data.id,
            storage_path: path,
            is_primary: true,
            sort_order: 0,
          });
        }
      }

      router.replace({ pathname: '/library/[id]', params: { id: data!.id as string } });
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => pickImage('camera')}
          onLongPress={() => pickImage('library')}
          style={styles.dropzone}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} contentFit="cover" />
          ) : (
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={styles.dropzoneTitle}>Tap to take a photo</Text>
              <Text style={styles.dropzoneSubtitle}>Long-press to pick from library</Text>
              <Text style={styles.dropzoneNote}>EXIF stripped automatically</Text>
            </View>
          )}
        </Pressable>

        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.chip, category === c && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                {CATEGORY_LABEL[c]}
              </Text>
            </Pressable>
          ))}
        </View>

        {category !== 'artwork' ? (
          <Field
            label="Title (optional)"
            value={values.title ?? ''}
            onChangeText={(v) => update('title', v)}
          />
        ) : null}

        {fields.map((f) => (
          <Field
            key={f.key}
            label={f.label + (f.required ? ' *' : '')}
            value={values[f.key] ?? ''}
            onChangeText={(v) => update(f.key, v)}
            multiline={f.type === 'textarea'}
            keyboardType={f.type === 'number' || f.type === 'currency' ? 'decimal-pad' : 'default'}
          />
        ))}

        <Pressable
          onPress={save}
          disabled={submitting}
          style={[styles.cta, submitting && { opacity: 0.6 }]}
        >
          <Text style={styles.ctaText}>{submitting ? 'Saving…' : 'Save item'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, value, onChangeText, multiline, keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad';
}) {
  return (
    <View style={{ gap: 6, marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholderTextColor={theme.color.text.muted}
        style={[styles.input, multiline && { minHeight: 72, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

function buildPayload(category: Category, values: FormState) {
  const fields = FIELDS_BY_CATEGORY[category];
  const top: Record<string, unknown> = { category };
  const details: Record<string, unknown> = {};
  if (values.title) top.title = values.title;
  for (const f of fields) {
    const raw = values[f.key];
    if (raw === undefined || raw === '') continue;
    let v: unknown = raw;
    if (f.type === 'number' || f.type === 'currency') v = Number(raw);
    if (f.detailsKey) details[f.detailsKey] = v;
    else top[f.key] = v;
  }
  top.details = details;
  if (top.price_amount !== undefined) top.price_currency = top.price_currency ?? 'INR';
  return top;
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = globalThis.atob(b64);
  const len = binary.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = binary.charCodeAt(i);
  return out;
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40, backgroundColor: theme.color.bg.base },
  dropzone: {
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.color.border.strong,
    borderStyle: 'dashed',
    backgroundColor: theme.color.bg.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  preview: { width: '100%', height: '100%' },
  dropzoneTitle: { fontSize: 16, fontWeight: '500', color: theme.color.text.primary },
  dropzoneSubtitle: { fontSize: 13, color: theme.color.text.secondary },
  dropzoneNote: { fontSize: 12, color: theme.color.text.muted, marginTop: 4 },
  sectionLabel: {
    fontSize: 12, color: theme.color.text.secondary, fontWeight: '500',
    marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: theme.color.border.subtle,
    backgroundColor: theme.color.bg.surface,
  },
  chipActive: {
    backgroundColor: theme.color.accent.DEFAULT,
    borderColor: theme.color.accent.DEFAULT,
  },
  chipText: { fontSize: 13, color: theme.color.text.secondary, fontWeight: '500' },
  chipTextActive: { color: theme.color.text.onAccent },
  fieldLabel: { fontSize: 12, color: theme.color.text.secondary, fontWeight: '500' },
  input: {
    backgroundColor: theme.color.bg.surface,
    borderWidth: 1, borderColor: theme.color.border.subtle,
    borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: theme.color.text.primary,
  },
  cta: {
    backgroundColor: theme.color.accent.DEFAULT,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  ctaText: { color: theme.color.text.onAccent, fontWeight: '500', fontSize: 15 },
});
