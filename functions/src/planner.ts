import * as z from 'zod';

/** "HH:mm", 24-hour clock. */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const CATEGORIES = ['personal', 'work', 'engineering', 'design', 'product', 'operations'] as const;
export const PRIORITIES = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as const;

/** What the app sends: the goal, the user's busy time for the coming days, and their limits. */
export const PlanRequestSchema = z.object({
  goal: z.string().trim().min(3).max(500),
  language: z.enum(['EN', 'HE']),
  days: z
    .array(
      z.object({
        date: z.string().regex(DATE),
        weekday: z.string().max(12),
        busy: z.array(z.object({ start: z.string().regex(TIME), end: z.string().regex(TIME) })).max(40)
      })
    )
    .min(1)
    .max(7),
  prefs: z.object({
    dayStart: z.string().regex(TIME),
    dayEnd: z.string().regex(TIME),
    maxMinutesPerDay: z.number().int().min(30).max(600)
  })
});
export type PlanRequest = z.infer<typeof PlanRequestSchema>;

/** The shape Claude must answer in (enforced by structured outputs). */
export const PlanOutputSchema = z.object({
  summary: z.string().describe('One or two sentences: how the week moves the user toward the goal.'),
  warning: z.string().describe('Short note if the goal does not fit the free time this week, otherwise an empty string.'),
  tasks: z.array(
    z.object({
      title: z.string().describe('Concrete, actionable task title, max ~60 characters.'),
      date: z.string().describe('YYYY-MM-DD, one of the given days.'),
      start: z.string().describe('HH:mm, 24-hour.'),
      end: z.string().describe('HH:mm, 24-hour, after start.'),
      priority: z.enum(PRIORITIES),
      category: z.enum(CATEGORIES),
      step: z.string().describe('2-3 word label for this step of the goal.')
    })
  )
});
export type PlanOutput = z.infer<typeof PlanOutputSchema>;
export type PlannedTask = PlanOutput['tasks'][number];

const MAX_TASKS = 14;

export const SYSTEM_PROMPT = `You are the weekly planner inside Flowday, a daily task app.
The user gives you one goal for the coming days, plus the time that is already busy on each day and their limits.
Break the goal into concrete, doable sessions and schedule them into the free time.

Rules:
- Only schedule on the given days, inside the user's day window (dayStart to dayEnd).
- Never overlap a busy block or another session you schedule. Leave at least 15 minutes between back-to-back sessions.
- Keep each day's new sessions within maxMinutesPerDay. Sessions are 30 to 120 minutes, on 15-minute boundaries.
- Order the steps so each builds on the previous one; put the most important work earlier in the week.
- Prefer fewer, meaningful sessions over many tiny ones (usually 3 to 10 for the week).
- If the goal cannot fit, plan what fits and explain in "warning".
- Write titles, step labels, summary and warning in the user's language: Hebrew when language is "HE", otherwise English.`;

export function buildUserMessage(req: PlanRequest): string {
  return JSON.stringify({
    goal: req.goal,
    language: req.language,
    dayWindow: { start: req.prefs.dayStart, end: req.prefs.dayEnd },
    maxMinutesPerDay: req.prefs.maxMinutesPerDay,
    days: req.days
  });
}

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/**
 * Drops anything the model got wrong instead of trusting it: unknown days, bad times,
 * sessions outside the day window, overlaps with busy time or each other, and days over the limit.
 */
export function sanitizePlan(plan: PlanOutput, req: PlanRequest): PlanOutput {
  const dayStart = toMinutes(req.prefs.dayStart);
  const dayEnd = toMinutes(req.prefs.dayEnd);
  const taken = new Map<string, [number, number][]>(
    req.days.map((d) => [d.date, d.busy.map((b) => [toMinutes(b.start), toMinutes(b.end)] as [number, number])])
  );
  const usedPerDay = new Map<string, number>();
  const kept: PlannedTask[] = [];

  const sorted = [...plan.tasks].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  for (const task of sorted) {
    if (kept.length >= MAX_TASKS) break;
    const slots = taken.get(task.date);
    if (!slots || !TIME.test(task.start) || !TIME.test(task.end)) continue;
    const start = toMinutes(task.start);
    const end = toMinutes(task.end);
    if (end <= start || start < dayStart || end > dayEnd) continue;
    if (slots.some(([s, e]) => start < e && end > s)) continue;
    const used = (usedPerDay.get(task.date) ?? 0) + (end - start);
    if (used > req.prefs.maxMinutesPerDay) continue;

    usedPerDay.set(task.date, used);
    slots.push([start, end]);
    kept.push({ ...task, title: task.title.trim().slice(0, 80), step: task.step.trim().slice(0, 30) });
  }
  return { summary: plan.summary.trim(), warning: plan.warning.trim(), tasks: kept };
}
