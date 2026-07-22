import "server-only";

import { and, asc, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { courts, rateRules, type RateRule } from "@/db/schema";
import { ServiceError } from "@/lib/api/errors";
import type {
  CreateRateRuleInput,
  ListRateRulesQuery,
  UpdateRateRuleInput,
} from "@/validators/rate-rule.validator";

import { facilityService } from "./facility.service";

// DB time columns read back as "HH:MM:SS"; validator inputs are "HH:MM".
const toHhmm = (t: string) => t.slice(0, 5);
const minutesOf = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export interface RatePreview {
  rate: number;
  hours: number;
  total: number;
}

async function assertCourtExists(courtId: string): Promise<void> {
  const court = await db.query.courts.findFirst({ where: eq(courts.id, courtId) });
  if (!court) throw new ServiceError("Court not found", 404);
}

export const rateRuleService = {
  async list(query: ListRateRulesQuery): Promise<RateRule[]> {
    return db.query.rateRules.findMany({
      where: query.courtId ? eq(rateRules.courtId, query.courtId) : undefined,
      orderBy: [asc(rateRules.startTime), asc(rateRules.label)],
    });
  },

  async create(input: CreateRateRuleInput): Promise<RateRule> {
    const facility = await facilityService.get();
    if (input.courtId) await assertCourtExists(input.courtId);
    const [created] = await db
      .insert(rateRules)
      .values({ ...input, courtId: input.courtId ?? null, facilityId: facility.id })
      .returning();
    return created;
  },

  async getById(id: string): Promise<RateRule> {
    const rule = await db.query.rateRules.findFirst({ where: eq(rateRules.id, id) });
    if (!rule) throw new ServiceError("Rate rule not found", 404);
    return rule;
  },

  async update(id: string, input: UpdateRateRuleInput): Promise<RateRule> {
    await rateRuleService.getById(id);
    if (input.courtId) await assertCourtExists(input.courtId);
    const [updated] = await db
      .update(rateRules)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(rateRules.id, id))
      .returning();
    return updated;
  },

  async remove(id: string): Promise<void> {
    await rateRuleService.getById(id);
    await db.delete(rateRules).where(eq(rateRules.id, id));
  },

  // §3.6a: court-specific beats facility-wide, then higher priority, else the
  // court's flat hourly_rate. Returns a per-hour rate.
  async resolveRate(courtId: string, dayOfWeek: number, startTime: string): Promise<number> {
    const court = await db.query.courts.findFirst({ where: eq(courts.id, courtId) });
    if (!court) throw new ServiceError("Court not found", 404);

    const start = toHhmm(startTime);
    const candidates = await db.query.rateRules.findMany({
      where: and(
        eq(rateRules.isActive, true),
        or(eq(rateRules.courtId, courtId), isNull(rateRules.courtId)),
      ),
    });
    const matches = candidates.filter(
      (rule) =>
        rule.daysOfWeek.includes(dayOfWeek) &&
        start >= toHhmm(rule.startTime) &&
        start < toHhmm(rule.endTime),
    );
    matches.sort(
      (a, b) => Number(b.courtId !== null) - Number(a.courtId !== null) || b.priority - a.priority,
    );
    return matches[0]?.rate ?? court.hourlyRate;
  },

  async ratePreview(
    courtId: string,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<RatePreview> {
    const hours = (minutesOf(endTime) - minutesOf(startTime)) / 60;
    if (hours <= 0) throw new ServiceError("endTime must be after startTime", 422);
    const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
    const rate = await rateRuleService.resolveRate(courtId, dayOfWeek, startTime);
    return { rate, hours, total: Math.round(rate * hours * 100) / 100 };
  },
};
