import { NextResponse } from 'next/server';

// POST /api/items/auto-fill
// Accepts multipart/form-data with `image`, returns suggested item fields.
// Calls OpenAI Vision when OPENAI_API_KEY is set; otherwise falls back to a
// deterministic placeholder so the UI flow works in dev without keys.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM = `You are an inventory assistant. Given a single product photo,
return JSON describing it. Schema:
{
  "category": "apparel"|"accessory"|"jewelry"|"silver"|"artwork",
  "title": string,
  "brand": string|null,
  "colour": string,
  "material": string|null,
  "size": string|null,
  "pattern": string|null,
  "confidence": number  // 0..1 overall
}
Only output the JSON object, no prose.`;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('image');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'image is required' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(stubGuess(), { status: 200 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString('base64');
  const mime = file.type || 'image/jpeg';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this item.' },
            { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: `vision call failed (${res.status})` }, { status: 502 });
  }

  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  try {
    const parsed = JSON.parse(json.choices[0]?.message.content ?? '{}');
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: 'could not parse model output' }, { status: 502 });
  }
}

function stubGuess() {
  return {
    category: 'apparel',
    title: 'Untitled garment',
    brand: null,
    colour: 'Black',
    material: null,
    confidence: 0.4,
    note: 'OPENAI_API_KEY not set — stub response',
  };
}
