// supabase/functions/process-image — strips EXIF, generates resized variants,
// writes them back into the items-private bucket alongside the original.
//
// Payload: { object_path: string }    // e.g. "<user_id>/<item_id>/raw.jpg"
// Output : { thumb, medium, large } storage paths.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  ImageMagick,
  initialize,
  MagickFormat,
} from 'https://deno.land/x/imagemagick_deno@0.0.31/mod.ts';

await initialize();

type Payload = { object_path: string };

const VARIANTS: { name: 'thumb' | 'medium' | 'large'; max: number }[] = [
  { name: 'thumb', max: 256 },
  { name: 'medium', max: 1024 },
  { name: 'large', max: 2048 },
];

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const { object_path } = (await req.json()) as Payload;
  if (!object_path) return new Response('object_path required', { status: 400 });

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const dl = await supabase.storage.from('items-private').download(object_path);
  if (dl.error || !dl.data) return new Response(dl.error?.message ?? 'download failed', { status: 500 });
  const original = new Uint8Array(await dl.data.arrayBuffer());

  const out: Record<string, string> = {};
  const dir = object_path.substring(0, object_path.lastIndexOf('/'));

  for (const variant of VARIANTS) {
    const buf = await new Promise<Uint8Array>((resolve, reject) => {
      try {
        ImageMagick.read(original, (img) => {
          img.strip(); // remove EXIF, including GPS
          const { width, height } = img;
          const ratio = Math.min(variant.max / width, variant.max / height, 1);
          if (ratio < 1) img.resize(Math.round(width * ratio), Math.round(height * ratio));
          img.write(MagickFormat.Webp, (data) => resolve(new Uint8Array(data)));
        });
      } catch (e) {
        reject(e);
      }
    });

    const path = `${dir}/${variant.name}.webp`;
    const up = await supabase.storage.from('items-private').upload(path, buf, {
      contentType: 'image/webp',
      upsert: true,
    });
    if (up.error) return new Response(up.error.message, { status: 500 });
    out[variant.name] = path;
  }

  return Response.json({ ok: true, variants: out });
});
