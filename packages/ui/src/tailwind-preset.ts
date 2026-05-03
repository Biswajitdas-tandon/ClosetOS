import { tokens } from './tokens';

// Typed loosely so this package doesn't need tailwindcss as a dep.
// The consuming app casts the preset back to a Tailwind Config.
export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        bg: tokens.color.bg,
        text: tokens.color.text,
        border: tokens.color.border,
        accent: tokens.color.accent,
        status: tokens.color.status,
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
