import { describe, expect, it } from "vitest";

import {
  createBookingSchema,
  listBookingsQuerySchema,
  updateBookingSchema,
} from "./booking.validator";

const validBooking = {
  courtId: "5f8d0d55-4a4d-4c8b-9a6e-1c2b3d4e5f60",
  bookingDate: "2026-08-01",
  startTime: "18:00",
  endTime: "20:00",
  customer: { fullName: "Jane Doe", phone: "09171234567" },
};

describe("createBookingSchema", () => {
  it("accepts a valid admin booking", () => {
    expect(createBookingSchema.safeParse(validBooking).success).toBe(true);
  });

  it("rejects endTime before or equal to startTime", () => {
    expect(
      createBookingSchema.safeParse({ ...validBooking, startTime: "20:00", endTime: "18:00" })
        .success,
    ).toBe(false);
    expect(
      createBookingSchema.safeParse({ ...validBooking, startTime: "18:00", endTime: "18:00" })
        .success,
    ).toBe(false);
  });

  it("rejects non-ISO booking dates", () => {
    expect(
      createBookingSchema.safeParse({ ...validBooking, bookingDate: "01-08-2026" }).success,
    ).toBe(false);
    expect(
      createBookingSchema.safeParse({ ...validBooking, bookingDate: "2026/08/01" }).success,
    ).toBe(false);
    expect(
      createBookingSchema.safeParse({ ...validBooking, bookingDate: "2026-13-01" }).success,
    ).toBe(false);
  });

  it("requires the customer to have a phone or an email", () => {
    expect(
      createBookingSchema.safeParse({ ...validBooking, customer: { fullName: "Jane Doe" } })
        .success,
    ).toBe(false);
    expect(
      createBookingSchema.safeParse({
        ...validBooking,
        customer: { fullName: "Jane Doe", email: "jane@example.com" },
      }).success,
    ).toBe(true);
  });
});

describe("updateBookingSchema", () => {
  it("allows partial updates but still enforces time ordering when both times are present", () => {
    expect(updateBookingSchema.safeParse({ notes: "moved indoors" }).success).toBe(true);
    expect(updateBookingSchema.safeParse({ startTime: "10:00" }).success).toBe(true);
    expect(updateBookingSchema.safeParse({ startTime: "10:00", endTime: "09:00" }).success).toBe(
      false,
    );
  });
});

describe("listBookingsQuerySchema", () => {
  it("accepts valid filters and rejects malformed ones", () => {
    expect(
      listBookingsQuerySchema.safeParse({
        status: "pending_confirmation",
        from: "2026-08-01",
        to: "2026-08-31",
      }).success,
    ).toBe(true);
    expect(listBookingsQuerySchema.safeParse({ status: "held" }).success).toBe(false);
    expect(listBookingsQuerySchema.safeParse({ from: "August 1" }).success).toBe(false);
  });
});
