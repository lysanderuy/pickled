"use client";

import { useState } from "react";

import { useCalendar } from "@/hooks/use-bookings";
import { useCourts } from "@/hooks/use-courts";
import { useFacility } from "@/hooks/use-facility";
import { addDays, todayIn } from "@/lib/dates";
import type { OperatingHours } from "@/validators/facility.validator";

const hhmm = (t: string) => t.slice(0, 5);

function hourSpan(operatingHours: OperatingHours | undefined): [number, number] {
  if (!operatingHours) return [6, 22];
  const windows = Object.values(operatingHours).filter((w) => w !== null);
  if (windows.length === 0) return [6, 22];
  const open = Math.min(...windows.map((w) => Number(w[0].slice(0, 2))));
  const close = Math.max(
    ...windows.map((w) => Math.ceil(Number(w[1].slice(0, 2)) + Number(w[1].slice(3, 5)) / 60)),
  );
  return [open, close];
}

export default function CalendarPage() {
  const [dateOverride, setDateOverride] = useState<string | null>(null);
  const courts = useCourts();
  const facility = useFacility();
  const date = dateOverride ?? todayIn(facility.data?.timezone ?? "Asia/Manila");
  const setDate = setDateOverride;
  const calendar = useCalendar(date, date);

  const [open, close] = hourSpan(facility.data?.operatingHours);
  const hours = Array.from({ length: Math.max(close - open, 1) }, (_, i) => open + i);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Calendar</h1>
      <div className="mb-4 flex items-center gap-2 text-sm">
        <button
          type="button"
          className="border border-black px-2 py-1"
          onClick={() => setDate(addDays(date, -1))}
        >
          Prev day
        </button>
        <input
          type="date"
          className="border border-black px-2 py-1"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button
          type="button"
          className="border border-black px-2 py-1"
          onClick={() => setDate(addDays(date, 1))}
        >
          Next day
        </button>
      </div>

      {(calendar.isLoading || courts.isLoading) && <p className="text-sm">Loading...</p>}
      {calendar.error && <p className="text-sm">{calendar.error.message}</p>}
      {courts.data && calendar.data && (
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-black px-2 py-1 text-left">Time</th>
              {courts.data.map((c) => (
                <th key={c.id} className="border border-black px-2 py-1 text-left">
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((hour) => (
              <tr key={hour}>
                <td className="border border-black px-2 py-1 align-top">
                  {String(hour).padStart(2, "0")}:00
                </td>
                {courts.data.map((c) => {
                  const slotBookings = calendar.data.filter(
                    (b) => b.courtId === c.id && Number(b.startTime.slice(0, 2)) === hour,
                  );
                  return (
                    <td key={c.id} className="border border-black px-2 py-1 align-top">
                      {slotBookings.map((b) => (
                        <div key={b.id} className="mb-1 border border-black px-2 py-1">
                          <p>{b.customerName}</p>
                          <p>
                            {hhmm(b.startTime)}-{hhmm(b.endTime)}
                          </p>
                          <p>{b.status}</p>
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
