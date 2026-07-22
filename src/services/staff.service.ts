import "server-only";

import { and, asc, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { staff, type Staff } from "@/db/schema";
import { ServiceError } from "@/lib/api/errors";
import type { InviteStaffInput, UpdateStaffInput } from "@/validators/staff.validator";

import { facilityService } from "./facility.service";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Last-owner-admin safeguard: the facility must never lose admin access.
// FOR UPDATE locks the active owner_admin rows so two concurrent demotions
// serialize — the second re-reads and sees the first one's result.
async function assertNotLastActiveOwnerAdmin(tx: Tx, excludedStaffId: string): Promise<void> {
  const remaining = await tx
    .select({ id: staff.id })
    .from(staff)
    .where(
      and(eq(staff.role, "owner_admin"), eq(staff.status, "active"), ne(staff.id, excludedStaffId)),
    )
    .for("update");
  if (remaining.length === 0) {
    throw new ServiceError(
      "This is the last active owner admin — the facility would lose admin access",
      409,
    );
  }
}

export const staffService = {
  async list(): Promise<Staff[]> {
    return db.query.staff.findMany({ orderBy: asc(staff.fullName) });
  },

  // Invite emails are parked — the row is created as `invited`, nothing is sent.
  async create(input: InviteStaffInput): Promise<Staff> {
    const facility = await facilityService.get();
    const existing = await db.query.staff.findFirst({ where: eq(staff.email, input.email) });
    if (existing) {
      throw new ServiceError(
        `A staff member with this email already exists (${existing.fullName})`,
        409,
      );
    }
    const [created] = await db
      .insert(staff)
      .values({ ...input, facilityId: facility.id, status: "invited", invitedAt: new Date() })
      .returning();
    return created;
  },

  async getById(id: string): Promise<Staff> {
    const member = await db.query.staff.findFirst({ where: eq(staff.id, id) });
    if (!member) throw new ServiceError("Staff member not found", 404);
    return member;
  },

  async getByAuthUserId(authUserId: string): Promise<Staff | null> {
    const member = await db.query.staff.findFirst({
      where: and(eq(staff.authUserId, authUserId), eq(staff.status, "active")),
    });
    return member ?? null;
  },

  async update(id: string, input: UpdateStaffInput): Promise<Staff> {
    const current = await staffService.getById(id);
    return db.transaction(async (tx) => {
      if (input.role === "staff" && current.role === "owner_admin" && current.status === "active") {
        await assertNotLastActiveOwnerAdmin(tx, id);
      }
      const [updated] = await tx
        .update(staff)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(staff.id, id))
        .returning();
      return updated;
    });
  },

  async disable(id: string): Promise<Staff> {
    const current = await staffService.getById(id);
    if (current.status === "disabled") {
      throw new ServiceError("Staff member is already disabled", 409);
    }
    return db.transaction(async (tx) => {
      if (current.role === "owner_admin" && current.status === "active") {
        await assertNotLastActiveOwnerAdmin(tx, id);
      }
      const [updated] = await tx
        .update(staff)
        .set({ status: "disabled", updatedAt: new Date() })
        .where(eq(staff.id, id))
        .returning();
      return updated;
    });
  },

  async reinstate(id: string): Promise<Staff> {
    const current = await staffService.getById(id);
    if (current.status !== "disabled") {
      throw new ServiceError("Only disabled staff can be reinstated", 409);
    }
    const [updated] = await db
      .update(staff)
      // No accepted invite yet means back to invited, not active.
      .set({ status: current.authUserId ? "active" : "invited", updatedAt: new Date() })
      .where(eq(staff.id, id))
      .returning();
    return updated;
  },
};
