"use client";

import { useState } from "react";

import { DAY_LABELS } from "@/components/ui/days-of-week-picker";
import { Field } from "@/components/ui/field";
import { useCourts } from "@/hooks/use-courts";
import { useCustomers } from "@/hooks/use-customers";
import {
  useCreateRecurringBooking,
  useRecurringBookings,
  useUpdateRecurringBooking,
  type RecurringBookingWithNames,
} from "@/hooks/use-recurring-bookings";
import type { CourtResponse } from "@/validators/court.validator";
import type { CustomerResponse } from "@/validators/customer.validator";

const hhmm = (t: string) => t.slice(0, 5);
const input = "border border-black px-2 py-1";
const button = "border border-black px-2 py-1 disabled:opacity-50";
const cell = "border border-black px-2 py-1";

export default function RecurringBookingsPage() {
  const recurring = useRecurringBookings();
  const courts = useCourts();
  const customers = useCustomers();
  const update = useUpdateRecurringBooking();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const setStatus = (id: string, status: "active" | "paused" | "cancelled") =>
    update.mutate(
      { id, input: { status } },
      { onSuccess: () => setActionError(null), onError: (e) => setActionError(e.message) },
    );

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-bold">Recurring bookings</h1>
        {actionError && <p className="mb-2 text-sm">{actionError}</p>}
        {recurring.isLoading && <p className="text-sm">Loading...</p>}
        {recurring.error && <p className="text-sm">{recurring.error.message}</p>}
        {recurring.data?.length === 0 && <p className="text-sm">No recurring bookings.</p>}
        {recurring.data && recurring.data.length > 0 && (
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className={`${cell} text-left`}>Customer</th>
                <th className={`${cell} text-left`}>Court</th>
                <th className={`${cell} text-left`}>Day</th>
                <th className={`${cell} text-left`}>Window</th>
                <th className={`${cell} text-left`}>Starts</th>
                <th className={`${cell} text-left`}>Ends</th>
                <th className={`${cell} text-left`}>Rate override</th>
                <th className={`${cell} text-left`}>Status</th>
                <th className={`${cell} text-left`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recurring.data.map((r) => (
                <RecurringRows
                  key={r.id}
                  row={r}
                  editing={editingId === r.id}
                  onToggleEdit={() => setEditingId(editingId === r.id ? null : r.id)}
                  onSetStatus={(status) => setStatus(r.id, status)}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>

      <CreateRecurringForm courts={courts.data ?? []} customers={customers.data ?? []} />
    </div>
  );
}

function RecurringRows({
  row,
  editing,
  onToggleEdit,
  onSetStatus,
}: {
  row: RecurringBookingWithNames;
  editing: boolean;
  onToggleEdit: () => void;
  onSetStatus: (status: "active" | "paused" | "cancelled") => void;
}) {
  return (
    <>
      <tr>
        <td className={cell}>{row.customerName}</td>
        <td className={cell}>{row.courtName}</td>
        <td className={cell}>{DAY_LABELS[row.dayOfWeek]}</td>
        <td className={cell}>
          {hhmm(row.startTime)}-{hhmm(row.endTime)}
        </td>
        <td className={cell}>{row.startsOn}</td>
        <td className={cell}>{row.endsOn ?? "Ongoing"}</td>
        <td className={cell}>
          {row.rateOverride !== null ? `₱${row.rateOverride.toFixed(2)}/hr` : "-"}
        </td>
        <td className={cell}>{row.status}</td>
        <td className={cell}>
          <div className="flex flex-wrap gap-2">
            {row.status === "active" && (
              <button type="button" className={button} onClick={() => onSetStatus("paused")}>
                Pause
              </button>
            )}
            {row.status === "paused" && (
              <button type="button" className={button} onClick={() => onSetStatus("active")}>
                Resume
              </button>
            )}
            {row.status !== "cancelled" && (
              <button type="button" className={button} onClick={() => onSetStatus("cancelled")}>
                Cancel
              </button>
            )}
            <button type="button" className={button} onClick={onToggleEdit}>
              Edit
            </button>
          </div>
        </td>
      </tr>
      {editing && (
        <tr>
          <td className={cell} colSpan={9}>
            <EditRecurringForm row={row} onDone={onToggleEdit} />
          </td>
        </tr>
      )}
    </>
  );
}

function EditRecurringForm({
  row,
  onDone,
}: {
  row: RecurringBookingWithNames;
  onDone: () => void;
}) {
  const update = useUpdateRecurringBooking();
  const [endsOn, setEndsOn] = useState(row.endsOn ?? "");
  const [rateOverride, setRateOverride] = useState(
    row.rateOverride !== null ? String(row.rateOverride) : "",
  );

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate(
          {
            id: row.id,
            input: {
              endsOn: endsOn || null,
              rateOverride: rateOverride ? Number(rateOverride) : null,
            },
          },
          { onSuccess: onDone },
        );
      }}
    >
      <p className="w-full text-sm">
        The schedule (court, day, time) is fixed — cancel this reservation and create a new one to
        change it.
      </p>
      <Field label="Ends on">
        <input
          type="date"
          className={input}
          value={endsOn}
          onChange={(e) => setEndsOn(e.target.value)}
        />
      </Field>
      <Field label="Rate override">
        <input
          type="number"
          min={0}
          step="0.01"
          className={input}
          value={rateOverride}
          onChange={(e) => setRateOverride(e.target.value)}
        />
      </Field>
      <button type="submit" className={button} disabled={update.isPending}>
        Save
      </button>
      <button type="button" className={button} onClick={onDone}>
        Close
      </button>
      {update.error && <p className="text-sm">{update.error.message}</p>}
    </form>
  );
}

function CreateRecurringForm({
  courts,
  customers,
}: {
  courts: CourtResponse[];
  customers: CustomerResponse[];
}) {
  const create = useCreateRecurringBooking();
  const [customerId, setCustomerId] = useState("");
  const [courtId, setCourtId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [rateOverride, setRateOverride] = useState("");

  const reset = () => {
    setCustomerId("");
    setCourtId("");
    setDayOfWeek("1");
    setStartTime("");
    setEndTime("");
    setStartsOn("");
    setEndsOn("");
    setRateOverride("");
  };

  return (
    <section>
      <h2 className="mb-2 font-bold">Create recurring booking</h2>
      <form
        className="flex max-w-2xl flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(
            {
              customerId,
              courtId,
              dayOfWeek: Number(dayOfWeek),
              startTime,
              endTime,
              startsOn,
              endsOn: endsOn || undefined,
              rateOverride: rateOverride ? Number(rateOverride) : undefined,
            },
            { onSuccess: reset },
          );
        }}
      >
        <Field label="Customer">
          <select
            className={input}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
          >
            <option value="">Select</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Court">
          <select
            className={input}
            value={courtId}
            onChange={(e) => setCourtId(e.target.value)}
            required
          >
            <option value="">Select</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Day">
          <select
            className={input}
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value)}
          >
            {DAY_LABELS.map((label, day) => (
              <option key={label} value={day}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Start">
          <input
            type="time"
            className={input}
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </Field>
        <Field label="End">
          <input
            type="time"
            className={input}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </Field>
        <Field label="Starts on">
          <input
            type="date"
            className={input}
            value={startsOn}
            onChange={(e) => setStartsOn(e.target.value)}
            required
          />
        </Field>
        <Field label="Ends on (optional)">
          <input
            type="date"
            className={input}
            value={endsOn}
            onChange={(e) => setEndsOn(e.target.value)}
          />
        </Field>
        <Field label="Rate override (optional)">
          <input
            type="number"
            min={0}
            step="0.01"
            className={input}
            value={rateOverride}
            onChange={(e) => setRateOverride(e.target.value)}
          />
        </Field>
        <button type="submit" className={button} disabled={create.isPending}>
          Create
        </button>
        {create.error && <p className="text-sm">{create.error.message}</p>}
      </form>
    </section>
  );
}
