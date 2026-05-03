import 'server-only';
import { cookies } from 'next/headers';
import { createServerSupabase } from '@closetos/db';

export async function serverClient() {
  const store = await cookies();
  return createServerSupabase({
    getAll: () => store.getAll().map(({ name, value }) => ({ name, value })),
    set: (name, value, options) => {
      try {
        store.set({ name, value, ...(options ?? {}) });
      } catch {
        /* called from a Server Component — ignore */
      }
    },
  });
}
