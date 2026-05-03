import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { theme } from '../lib/theme';
import type { Status } from '@closetos/domain';

export type ItemCardProps = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  badge?: string;
  status?: Status;
  onPress?: () => void;
};

const STATUS_COLOR: Record<Status, string> = {
  available: theme.color.status.available,
  lent: theme.color.status.lent,
  given_away: theme.color.status.given_away,
  sold: theme.color.status.sold,
};

export function ItemCard({ title, subtitle, imageUrl, badge, status = 'available', onPress }: ItemCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" transition={150} />
        ) : (
          <Text style={styles.placeholder}>No image</Text>
        )}
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.meta}>
        <View style={styles.metaText}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
        <View style={[styles.dot, { backgroundColor: STATUS_COLOR[status] }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.color.bg.surface,
    borderRadius: 12,
    overflow: 'hidden',
    flex: 1,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  imageWrap: {
    aspectRatio: 4 / 5,
    backgroundColor: theme.color.bg.muted,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  placeholder: {
    position: 'absolute',
    inset: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: theme.color.text.muted,
    fontSize: 13,
  },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '500', color: theme.color.text.primary },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  metaText: { flex: 1 },
  title: { fontSize: 14, fontWeight: '500', color: theme.color.text.primary },
  subtitle: { fontSize: 12, color: theme.color.text.muted, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
