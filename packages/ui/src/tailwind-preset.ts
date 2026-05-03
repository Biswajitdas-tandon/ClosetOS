import { tokens } from './tokens';

// Tailwind preset that uses CSS variables so the same class
// (e.g. `bg-bg-base`) renders correctly in both light and dark mode.
// The actual var values are set in apps/web/src/app/globals.css.
export const tailwindPreset = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'var(--bg-base)',
          surface: 'var(--bg-surface)',
          muted: 'var(--bg-muted)',
          inverse: 'var(--bg-inverse)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
          onAccent: 'var(--text-on-accent)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
        },
        status: {
          available: 'var(--status-available)',
          lent: 'var(--status-lent)',
          given_away: 'var(--status-given-away)',
          sold: 'var(--status-sold)',
        },
      },
      borderRadius: {
        sm: tokens.radius.sm,
        DEFAULT: tokens.radius.md,
        md: tokens.radius.md,
        lg: tokens.radius.lg,
      },
      boxShadow: {
        sm: tokens.shadow.sm,
        md: tokens.shadow.md,
        lg: tokens.shadow.lg,
      },
      fontFamily: {
        sans: tokens.font.sans.split(','),
        display: tokens.font.display.split(','),
        mono: tokens.font.mono.split(','),
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
} as const;
