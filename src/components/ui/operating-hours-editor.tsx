"use client";

import type { OperatingHours } from "@/validators/facility.validator";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function OperatingHoursEditor({
  value,
  onChange,
}: {
  value: OperatingHours;
  onChange: (hours: OperatingHours) => void;
}) {
  return (
    <table className="border-collapse text-sm">
      <tbody>
        {DAYS.map((day) => {
          const hours = value[day];
          return (
            <tr key={day}>
              <td className="border border-black px-2 py-1 uppercase">{day}</td>
              <td className="border border-black px-2 py-1">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={hours === null}
                    onChange={(e) =>
                      onChange({ ...value, [day]: e.target.checked ? null : ["06:00", "22:00"] })
                    }
                  />
                  Closed
                </label>
              </td>
              <td className="border border-black px-2 py-1">
                {hours ? (
                  <span className="flex items-center gap-1">
                    <input
                      type="time"
                      value={hours[0]}
                      onChange={(e) => onChange({ ...value, [day]: [e.target.value, hours[1]] })}
                      className="border border-black px-2 py-1"
                    />
                    to
                    <input
                      type="time"
                      value={hours[1]}
                      onChange={(e) => onChange({ ...value, [day]: [hours[0], e.target.value] })}
                      className="border border-black px-2 py-1"
                    />
                  </span>
                ) : (
                  "Closed"
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
