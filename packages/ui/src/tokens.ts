// ClosetOS design tokens — premium-editorial, image-first.
// Single source of truth: re-exported as a Tailwind preset and consumed
// directly by RN/web primitives.

export const tokens = {
  color: {
    bg: {
      base: '#FAFAF7',      // warm off-white
      surface: '#FFFFFF',
      muted: '#F4F2EE',
      inverse: '#111111',
    },
    text: {
      primary: '#111111',
      secondary: '#525252',
      muted: '#8A8780',
      inverse: '#FAFAF7',
      onAccent: '#FFFFFF',
    },
    border: {
      subtle: '#EAE7E0',
      strong: '#1F2937',
    },
    accent: {
      DEFAULT: '#1F2937',  // graphite
      hover: '#0F172A',
    },
    status: {
      available: '#16A34A',
      lent: '#D97706',
      given_away: '#737373',
      sold: '#DC2626',
    },
  },
  radius: { sm: '8px', md: '12px', lg: '20px', pill: '9999px' },
  spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '48px' },
  shadow: {
    sm: '0 1px 2px rgba(17,17,17,0.04)',
    md: '0 4px 16px rgba(17,17,17,0.06)',
    lg: '0 12px 32px rgba(17,17,17,0.10)',
  },
  font: {
    sans: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
    display: 'Fraunces, ui-serif, Georgia, serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  motion: {
    fast: '150ms cubic-bezier(0.2, 0.8, 0.2, 1)',
    normal: '220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
    slow: '380ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
} as const;

export type Tokens = typeof tokens;
