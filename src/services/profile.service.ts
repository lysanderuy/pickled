import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { profiles, type Profile } from "@/db/schema";
import type { UpdateProfileInput } from "@/validators/profile.validator";

// Example service — replace/extend per project.
export const profileService = {
  async getById(id: string): Promise<Profile | undefined> {
    return db.query.profiles.findFirst({
      where: eq(profiles.id, id),
    });
  },

  async update(id: string, input: UpdateProfileInput): Promise<Profile | undefined> {
    const [updated] = await db
      .update(profiles)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(profiles.id, id))
      .returning();

    return updated;
  },

  // Atomic claim — only the call flipping welcome_email_sent_at from null gets a
  // result; concurrent calls get null. On failure, retry via releaseWelcomeClaim().
  async claimWelcomeEmail(
    id: string,
  ): Promise<{ claimedAt: Date; displayName: string | null } | null> {
    const claimedAt = new Date();
    const [claimed] = await db
      .update(profiles)
      .set({ welcomeEmailSentAt: claimedAt })
      .where(and(eq(profiles.id, id), isNull(profiles.welcomeEmailSentAt)))
      .returning({ displayName: profiles.displayName });

    return claimed ? { claimedAt, displayName: claimed.displayName } : null;
  },

  // Reverts a claim after a failed send. Guarded on the exact timestamp so it
  // can't clobber a different invocation's claim.
  async releaseWelcomeClaim(id: string, claimedAt: Date): Promise<void> {
    await db
      .update(profiles)
      .set({ welcomeEmailSentAt: null })
      .where(and(eq(profiles.id, id), eq(profiles.welcomeEmailSentAt, claimedAt)));
  },
};
