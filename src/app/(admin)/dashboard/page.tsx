"use client";

import { useState } from "react";

import {
  useBookings,
  useCalendar,
  useCancelBooking,
  useConfirmBooking,
} from "@/hooks/use-bookings";
import { useCourts } from "@/hooks/use-courts";
import { useCustomers } from "@/hooks/use-customers";
import { useFacility } from "@/hooks/use-facility";
import { useMe } from "@/hooks/use-me";
import { dayOfWeekOf, minutesOf, todayIn } from "@/lib/dates";

const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function nowInTz(timeZone: string): { hour: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hour, minutes: hour * 60 + minute };
}

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function to12Hour(t: string): string {
  const hour = Number(t.slice(0, 2));
  const minute = t.slice(3, 5);
  const period = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute}${period}`;
}

function formatRange(start: string, end: string): string {
  const startLabel = to12Hour(start);
  const endLabel = to12Hour(end);
  const samePeriod = startLabel.slice(-2) === endLabel.slice(-2);
  return `${samePeriod ? startLabel.slice(0, -2) : startLabel}-${endLabel}`;
}

function hourLabelFromMinutes(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60) % 24;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12} ${period}`;
}

function compactTime(t: string): { label: string; period: "AM" | "PM" } {
  const hour = Number(t.slice(0, 2));
  const minute = t.slice(3, 5);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const label = minute === "00" ? `${hour12}` : `${hour12}:${minute}`;
  return { label, period };
}

function blockRangeLabel(start: string, end: string): string {
  const s = compactTime(start);
  const e = compactTime(end);
  const startLabel = s.period === e.period ? s.label : `${s.label} ${s.period}`;
  return `${startLabel}-${e.label} ${e.period}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function StatTile({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div
      className={`rounded-lg border bg-white p-4 ${warn ? "border-amber-300" : "border-neutral-200"}`}
    >
      <p className="text-[12px] text-neutral-500">{label}</p>
      <p className="text-[26px] font-bold tabular-nums">{value}</p>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[13px] font-medium tracking-[0.04em] text-neutral-500 uppercase">
      {children}
    </h2>
  );
}

export default function DashboardPage() {
  const facility = useFacility();
  const timezone = facility.data?.timezone ?? "Asia/Manila";
  const today = todayIn(timezone);
  const pending = useBookings({ status: "pending_confirmation" });
  const todays = useCalendar(today, today);
  const courts = useCourts();
  const customers = useCustomers();
  const me = useMe();
  const confirm = useConfirmBooking();
  const cancel = useCancelBooking();
  const [actionError, setActionError] = useState<string | null>(null);

  const courtName = (id: string) => courts.data?.find((c) => c.id === id)?.name ?? id;
  const customerName = (id: string) => customers.data?.find((c) => c.id === id)?.fullName ?? id;

  const firstName = me.data?.fullName.split(" ")[0] ?? "";
  const { hour: nowHour, minutes: nowMinutes } = nowInTz(timezone);
  const greeting = greetingFor(nowHour);
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());

  const activeToday = (todays.data ?? []).filter(
    (b) => b.status !== "cancelled" && b.status !== "expired",
  );
  const pendingCount = pending.data?.length ?? 0;
  const revenueToday = (todays.data ?? [])
    .filter((b) => b.paymentStatus === "paid")
    .reduce((sum, b) => sum + b.rateAmount, 0);
  const totalCourts = courts.data?.length ?? 0;
  const courtsInUseCount =
    courts.data?.filter((c) =>
      (todays.data ?? []).some(
        (b) =>
          b.courtId === c.id &&
          b.status === "confirmed" &&
          minutesOf(b.startTime) <= nowMinutes &&
          nowMinutes < minutesOf(b.endTime),
      ),
    ).length ?? 0;

  const dayKey = dayKeys[dayOfWeekOf(today)];
  const todaysHours = facility.data?.operatingHours?.[dayKey] ?? null;
  const [openTime, closeTime] = todaysHours ?? ["06:00", "21:00"];
  const openMin = minutesOf(openTime);
  const closeMin = minutesOf(closeTime);
  const ticks: number[] = [];
  for (let m = openMin; m <= closeMin; m += 180) ticks.push(m);
  const hourMarks: number[] = [];
  for (let m = openMin + 60; m < closeMin; m += 60) hourMarks.push(m);

  const granularity = facility.data?.slotGranularityMinutes ?? 30;
  const totalSlots = Math.max(1, Math.round((closeMin - openMin) / granularity));
  const slotOfMinutes = (mins: number) =>
    Math.min(totalSlots, Math.max(0, Math.round((mins - openMin) / granularity)));
  const slotOf = (t: string) => slotOfMinutes(minutesOf(t));
  const gridColumnsStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${totalSlots}, minmax(0, 1fr))`,
  } as const;

  const sortedCourts = [...(courts.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[26px] font-bold">
          {greeting}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-[13px] text-neutral-500">{dateLabel}</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatTile label="Bookings today" value={String(activeToday.length)} />
        <StatTile
          label="Pending confirmations"
          value={String(pendingCount)}
          warn={pendingCount > 0}
        />
        <StatTile
          label="Revenue today"
          value={`₱${Math.round(revenueToday).toLocaleString("en-US")}`}
        />
        <StatTile label="Courts in use now" value={`${courtsInUseCount} of ${totalCourts}`} />
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <SectionHeader>Needs confirmation</SectionHeader>
        <div className="mt-3 flex flex-col gap-1">
          {actionError && <p className="text-[13px] text-red-600">{actionError}</p>}
          {pending.isLoading && <p className="text-[14px] text-neutral-500">Loading…</p>}
          {pending.error && <p className="text-[14px] text-red-600">{pending.error.message}</p>}
          {pending.data?.length === 0 && (
            <p className="text-[14px] text-neutral-500">No pending bookings.</p>
          )}
          {pending.data?.map((b) => {
            const holdMinutes = b.holdExpiresAt
              ? Math.max(
                  0,
                  Math.ceil((new Date(b.holdExpiresAt).getTime() - new Date().getTime()) / 60000),
                )
              : null;
            return (
              <div
                key={b.id}
                className="flex items-center justify-between gap-4 border-b border-neutral-100 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-neutral-900">
                    {customerName(b.customerId)}
                  </p>
                  <p className="truncate text-[13px] text-neutral-500">
                    {courtName(b.courtId)} · {formatRange(b.startTime, b.endTime)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {holdMinutes !== null && (
                    <span className="text-[13px] text-amber-600">
                      Hold expires in {holdMinutes} min
                    </span>
                  )}
                  <button
                    type="button"
                    className="text-[13px] text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
                    disabled={cancel.isPending}
                    onClick={() =>
                      cancel.mutate(b.id, {
                        onSuccess: () => setActionError(null),
                        onError: (e) => setActionError(e.message),
                      })
                    }
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-neutral-900 px-3 py-1.5 text-[13px] text-white disabled:opacity-50"
                    disabled={confirm.isPending}
                    onClick={() =>
                      confirm.mutate(b.id, {
                        onSuccess: () => setActionError(null),
                        onError: (e) => setActionError(e.message),
                      })
                    }
                  >
                    Confirm
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <SectionHeader>Today&apos;s courts</SectionHeader>
        <div className="mt-4 flex gap-3">
          <div className="flex w-28 shrink-0 flex-col gap-2">
            <div className="h-4" />
            {sortedCourts.map((court) => (
              <p
                key={court.id}
                className="flex h-12 items-center truncate text-[14px] text-neutral-700"
              >
                {court.name}
              </p>
            ))}
          </div>
          <div className="relative flex-1">
            <div className="h-4 text-[11px] text-neutral-400" style={gridColumnsStyle}>
              {ticks.map((m) => (
                <span
                  key={m}
                  className="whitespace-nowrap"
                  style={{ gridColumn: `${slotOfMinutes(m) + 1} / span 1`, gridRow: 1 }}
                >
                  {hourLabelFromMinutes(m)}
                </span>
              ))}
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {sortedCourts.map((court) => {
                const courtBookings = (todays.data ?? []).filter(
                  (b) =>
                    b.courtId === court.id &&
                    (b.status === "confirmed" || b.status === "pending_confirmation"),
                );
                const isMaintenance = court.status === "maintenance";
                return (
                  <div
                    key={court.id}
                    className="h-12 overflow-hidden rounded-md bg-neutral-100"
                    style={{ ...gridColumnsStyle, gridTemplateRows: "1fr" }}
                  >
                    {!isMaintenance &&
                      hourMarks.map((m) => {
                        const s = slotOfMinutes(m);
                        return (
                          <div
                            key={m}
                            className="pointer-events-none bg-neutral-200"
                            style={{
                              gridColumn: `${s + 1} / span 1`,
                              gridRow: 1,
                              justifySelf: "start",
                              width: "1px",
                            }}
                          />
                        );
                      })}
                    {isMaintenance ? (
                      <div
                        className="flex h-full items-center justify-center text-[12px] text-neutral-500"
                        style={{
                          gridColumn: "1 / -1",
                          gridRow: 1,
                          backgroundImage:
                            "repeating-linear-gradient(45deg, rgb(229 229 229), rgb(229 229 229) 6px, rgb(245 245 245) 6px, rgb(245 245 245) 12px)",
                        }}
                      >
                        {`Maintenance${court.statusNote ? ` — ${court.statusNote}` : ""}`}
                      </div>
                    ) : (
                      courtBookings.map((b) => {
                        const startSlot = slotOf(b.startTime);
                        const endSlot = slotOf(b.endTime);
                        const isPending = b.status === "pending_confirmation";
                        const isNarrow = endSlot - startSlot <= 1;
                        return (
                          <div
                            key={b.id}
                            title={`${b.customerName} · ${blockRangeLabel(b.startTime, b.endTime)}`}
                            className={
                              isPending
                                ? "flex flex-col justify-center gap-0.5 overflow-hidden rounded-sm border border-dashed border-amber-400 px-1.5 text-amber-600"
                                : "flex flex-col justify-center gap-0.5 overflow-hidden rounded-sm bg-neutral-900 px-1.5 text-white"
                            }
                            style={{
                              gridColumn: `${startSlot + 1} / ${endSlot + 1}`,
                              gridRow: 1,
                              ...(isNarrow ? { alignItems: "center" } : {}),
                            }}
                          >
                            {isNarrow ? (
                              <span className="truncate text-center text-[10px] font-medium">
                                {initials(b.customerName)}
                              </span>
                            ) : (
                              <>
                                <span className="truncate text-[10px] leading-tight font-medium">
                                  {b.customerName.split(" ")[0]}
                                </span>
                                <span className="truncate text-[10px] leading-tight opacity-70">
                                  {blockRangeLabel(b.startTime, b.endTime)}
                                </span>
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
