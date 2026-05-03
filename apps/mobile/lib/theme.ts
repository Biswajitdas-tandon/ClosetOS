// Re-export the shared design tokens so RN screens style off the same source
// of truth as web. RN consumes hex/strings directly via StyleSheet.
import { tokens } from '@closetos/ui/tokens';

export const theme = tokens;
export type Theme = typeof theme;
