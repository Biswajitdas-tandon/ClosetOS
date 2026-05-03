import type { Config } from 'tailwindcss';
import { tailwindPreset } from '@closetos/ui/tailwind-preset';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  presets: [tailwindPreset as Config],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
