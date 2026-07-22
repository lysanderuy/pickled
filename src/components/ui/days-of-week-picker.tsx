"use client";

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function DaysOfWeekPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {DAY_LABELS.map((label, day) => (
        <label key={label} className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={value.includes(day)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...value, day].sort((a, b) => a - b)
                  : value.filter((d) => d !== day),
              )
            }
          />
          {label}
        </label>
      ))}
    </div>
  );
}
