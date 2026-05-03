import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverClient } from '@/lib/supabase-server';

// POST /api/packing/suggest
// Body: { destination: string, start_date: YYYY-MM-DD, end_date: YYYY-MM-DD, trip_type?: string }
// Returns: { weather_summary, suggested_item_ids[], rationale }
//
// Strategy:
//   1. Geocode destination via Open-Meteo (keyless)
//   2. Pull daily forecast for the date range (max ~14d ahead supported by Open-Meteo)
//   3. Compute high/low/precip averages → derive "warm" | "cool" | "cold" + "rainy" hints
//   4. Pick items from user's library by: occasion tags matching weather/trip + recently worn boost

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  destination: z.string().min(1).max(120),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  trip_type: z.string().max(40).optional(),
});

type GeocodeResult = {
  results?: { name: string; latitude: number; longitude: number; country: string; admin1?: string }[];
};
type Forecast = {
  daily?: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max?: number[];
    weathercode: number[];
  };
};

export async function POST(req: Request) {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'bad request' }, { status: 400 });
  }
  const { destination, start_date, end_date, trip_type } = parsed.data;

  // 1. Geocode
  const gRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`,
  );
  const geo = (await gRes.json()) as GeocodeResult;
  const place = geo.results?.[0];
  if (!place) {
    return NextResponse.json({ error: `Could not find "${destination}"` }, { status: 422 });
  }

  // 2. Forecast — Open-Meteo only supports the next 16 days reliably.
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(start_date); start.setHours(0, 0, 0, 0);
  const end = new Date(end_date); end.setHours(0, 0, 0, 0);
  const within = start.getTime() <= today.getTime() + 14 * 86400000;

  let weatherSummary: {
    place: string;
    high_c?: number;
    low_c?: number;
    precip_pct?: number;
    summary: string;
  } = {
    place: `${place.name}${place.country ? ', ' + place.country : ''}`,
    summary: 'Forecast unavailable — using climate heuristics.',
  };
  let bias: 'warm' | 'cool' | 'cold' = 'warm';
  let rainy = false;

  if (within) {
    const fRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
      `&start_date=${start_date}&end_date=${end_date}&timezone=auto`,
    );
    const f = (await fRes.json()) as Forecast;
    if (f.daily?.temperature_2m_max?.length) {
      const high = avg(f.daily.temperature_2m_max);
      const low = avg(f.daily.temperature_2m_min);
      const precip = avg(f.daily.precipitation_probability_max ?? []);
      bias = high < 12 ? 'cold' : high < 22 ? 'cool' : 'warm';
      rainy = precip > 50;
      weatherSummary = {
        place: weatherSummary.place,
        high_c: round(high),
        low_c: round(low),
        precip_pct: round(precip),
        summary: `${capitalize(bias)}${rainy ? ' & rainy' : ''}, avg ${round(low)}–${round(high)}°C`,
      };
    }
  } else {
    // Fall back to month-of-year heuristic from the destination
    const month = start.getMonth() + 1;
    const isNorthernSummer = month >= 5 && month <= 9;
    bias = isNorthernSummer ? 'warm' : 'cool';
  }

  // 3. Pick items by tag/category + recently-worn boost
  const tagTargets = pickTags({ bias, rainy, trip_type });
  const { data: itemsData } = await supabase
    .from('items')
    .select('id, category, status, details, item_tags(tags(name, kind))')
    .eq('status', 'available')
    .in('category', ['apparel', 'accessory']);

  type ItemRow = {
    id: string;
    category: string;
    status: string;
    details: { last_worn_date?: string; occasion_tags?: string[] } | null;
    item_tags: { tags: { name: string; kind: string } | null }[] | null;
  };
  const rows = (itemsData ?? []) as unknown as ItemRow[];

  const scored = rows.map((it) => {
    const tagNames = new Set(
      (it.item_tags ?? [])
        .map((t) => t.tags?.name?.toLowerCase())
        .filter((n): n is string => Boolean(n)),
    );
    const detailsTags = (it.details?.occasion_tags ?? []).map((t) => t.toLowerCase());
    detailsTags.forEach((t) => tagNames.add(t));

    let score = 0;
    for (const target of tagTargets) {
      if (tagNames.has(target)) score += 2;
    }
    if (it.details?.last_worn_date) {
      const days = Math.max(0, (Date.now() - new Date(it.details.last_worn_date).getTime()) / 86400000);
      if (days < 30) score += 1; // recently liked
      if (days > 365) score -= 1; // forgotten
    }
    return { id: it.id, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const suggested_item_ids = scored.filter((s) => s.score > 0).slice(0, 24).map((s) => s.id);

  return NextResponse.json({
    weather_summary: weatherSummary,
    bias,
    rainy,
    matched_tags: tagTargets,
    suggested_item_ids,
    place: {
      name: place.name, country: place.country, admin1: place.admin1,
      latitude: place.latitude, longitude: place.longitude,
    },
  });
}

function pickTags({ bias, rainy, trip_type }: { bias: 'warm' | 'cool' | 'cold'; rainy: boolean; trip_type?: string }) {
  const out: string[] = [];
  if (bias === 'warm') out.push('summer', 'beach', 'leisure');
  if (bias === 'cool') out.push('monsoon', 'leisure', 'travel');
  if (bias === 'cold') out.push('winter', 'evening', 'formal');
  if (rainy) out.push('monsoon');
  if (trip_type) out.push(trip_type.toLowerCase());
  return Array.from(new Set(out));
}

function avg(xs: number[]) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
function round(n: number) { return Math.round(n * 10) / 10; }
function capitalize(s: string) { return s[0]?.toUpperCase() + s.slice(1); }
