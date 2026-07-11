// The question bank — hardcoded config is fine (per the build outline §4).
//
// Every question ships with a named resolution SOURCE and DATE. Per the
// outline, "this line is non-negotiable — it is what prevents fights at the
// reveal." YNG questions are answerable without knowing the event calendar
// (bet on outcomes, months, and counts — not on named future events).
//
// `seeds` is omitted → every option gets the default ₹1,000 house seed, so a
// yes/no opens at 2.0×, a 4-option at 4.0×, a 10-option at 10.0×.
//
// Options marked (TBD) are placeholders the organiser locks in nearer the
// party once the real field is known — the mechanic does not depend on them.

/** @typedef {{ id: string, category: 'YNG'|'World', text: string, options: string[], judgedBy: string, seeds?: number[] }} Question */

/** @type {Question[]} */
export const QUESTIONS = [
  // ---- YNG chapter questions -------------------------------------------
  {
    id: 'yng-registrations',
    category: 'YNG',
    text: 'Will YNG Mumbai registrations by 31 July 2026 exceed the Opening Night count + 5?',
    options: ['Yes', 'No'],
    judgedBy: 'Official roster · 31 Jul 2026',
  },
  {
    id: 'yng-top-month',
    category: 'YNG',
    text: 'Which month will host the YNG event with the highest attendance (excluding opening & closing nights)?',
    options: [
      'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026',
      'Jan 2027', 'Feb 2027', 'Mar 2027', 'Apr 2027', 'May 2027',
    ],
    judgedBy: 'Committee attendance register · 30 Jun 2027',
  },
  {
    id: 'yng-event-count',
    category: 'YNG',
    text: 'How many official YNG Mumbai chapter events will run between Opening Night and the June closing party?',
    options: ['6 or fewer', '7–8', '9–10', '11 or more'],
    judgedBy: 'Committee event log · 30 Jun 2027',
  },
  {
    id: 'yng-beat-opening',
    category: 'YNG',
    text: 'Will any single YNG event during the term beat Opening Night’s headcount?',
    options: ['Yes', 'No'],
    judgedBy: 'Committee attendance register · 30 Jun 2027',
  },
  {
    id: 'yng-sold-out',
    category: 'YNG',
    text: 'How many YNG events will hit their registration cap (sell out) before the door?',
    options: ['0', '1–2', '3–4', '5 or more'],
    judgedBy: 'Committee registration log · 30 Jun 2027',
  },
  {
    id: 'yng-new-cities',
    category: 'YNG',
    text: 'Will a YNG Mumbai member attend a YNG event in another city during the term?',
    options: ['Yes', 'No'],
    judgedBy: 'Committee confirmation · 30 Jun 2027',
  },

  // ---- World questions --------------------------------------------------
  {
    id: 'nifty-close',
    category: 'World',
    text: 'Will the Nifty 50 close above its Opening Night level on 31 May 2027?',
    options: ['At or above', 'Below'],
    judgedBy: 'NSE official close · 31 May 2027 (or last trading day)',
  },
  {
    id: 'fifa-wc-2026',
    category: 'World',
    text: 'Who wins the FIFA World Cup 2026?',
    options: ['Finalist A (TBD)', 'Finalist B (TBD)'],
    judgedBy: 'FIFA official result · final 19 Jul 2026',
  },
  {
    id: 'wtc-final-2027',
    category: 'World',
    text: 'Who wins the ICC World Test Championship final, June 2027?',
    options: ['India', 'Australia', 'England', 'Any other team'],
    judgedBy: 'ICC official result · Jun 2027',
  },
  {
    id: 'gold-level',
    category: 'World',
    text: 'Will gold be above ₹1,00,000 / 10g by 31 May 2027?',
    options: ['At or above', 'Below'],
    judgedBy: 'IBJA Mumbai rate · 31 May 2027',
  },
  {
    id: 'usd-inr-band',
    category: 'World',
    text: 'Where will USD–INR sit on 31 May 2027?',
    options: ['Below 86', '86–89', 'Above 89'],
    judgedBy: 'RBI reference rate · 31 May 2027',
  },
  {
    id: 'indian-film-1000cr',
    category: 'World',
    text: 'Will an Indian film cross ₹1,000 cr worldwide gross during the term?',
    options: ['Yes', 'No'],
    judgedBy: 'Trade-verified worldwide gross · 30 Jun 2027',
  },
  {
    id: 'ipl-2027',
    category: 'World',
    text: 'Who wins IPL 2027?',
    options: ['Mumbai Indians', 'Chennai Super Kings', 'Kolkata Knight Riders', 'Any other team'],
    judgedBy: 'BCCI/IPL official result · ~May 2027',
  },
  {
    id: 'mumbai-rainfall',
    category: 'World',
    text: 'Will Mumbai record a single-day rainfall above 200 mm this monsoon?',
    options: ['Yes', 'No'],
    judgedBy: 'IMD Santacruz observatory · monsoon 2026',
  },
];

export function questionCount() {
  return QUESTIONS.length;
}
