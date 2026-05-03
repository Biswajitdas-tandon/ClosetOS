import { Pressable, Text, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

export function CategoryChip({
  label,
  active,
  count,
  onPress,
}: {
  label: string;
  active?: boolean;
  count?: number;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.active]}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
      {typeof count === 'number' ? (
        <Text style={[styles.count, active && styles.countActive]}>{count}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.color.border.subtle,
    backgroundColor: theme.color.bg.surface,
  },
  active: {
    backgroundColor: theme.color.accent.DEFAULT,
    borderColor: theme.color.accent.DEFAULT,
  },
  label: { fontSize: 12, fontWeight: '500', color: theme.color.text.secondary },
  labelActive: { color: theme.color.text.onAccent },
  count: { fontSize: 12, color: theme.color.text.muted },
  countActive: { color: 'rgba(255,255,255,0.7)' },
});
