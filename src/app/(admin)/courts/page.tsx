"use client";

import Link from "next/link";
import { useState } from "react";

import { DAY_LABELS, DaysOfWeekPicker } from "@/components/ui/days-of-week-picker";
import { Field } from "@/components/ui/field";
import { OperatingHoursEditor } from "@/components/ui/operating-hours-editor";
import { useCourts, useCreateCourt, useDeleteCourt, useUpdateCourt } from "@/hooks/use-courts";
import { useFacility } from "@/hooks/use-facility";
import { useRateRules } from "@/hooks/use-rate-rules";
import type { CourtResponse } from "@/validators/court.validator";
import { courtStatuses } from "@/validators/court.validator";
import type { OperatingHours } from "@/validators/facility.validator";
import type { RateRuleResponse } from "@/validators/rate-rule.validator";

const hhmm = (t: string) => t.slice(0, 5);
const input = "border border-black px-2 py-1";
const button = "border border-black px-2 py-1 disabled:opacity-50";
const cell = "border border-black px-2 py-1";

type CourtStatus = (typeof courtStatuses)[number];

export default function CourtsPage() {
  const courts = useCourts();
  const rateRules = useRateRules();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{ courtId: string; message: string } | null>(null);

  const remove = useDeleteCourt();
  const update = useUpdateCourt();

  const rulesForCourt = (courtId: string): RateRuleResponse[] =>
    (rateRules.data ?? []).filter(
      (r) => r.isActive && (r.courtId === courtId || r.courtId === null),
    );

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-bold">Courts</h1>
        {courts.isLoading && <p className="text-sm">Loading...</p>}
        {courts.error && <p className="text-sm">{courts.error.message}</p>}
        {courts.data && (
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className={`${cell} text-left`}>Order</th>
                <th className={`${cell} text-left`}>Name</th>
                <th className={`${cell} text-left`}>Surface</th>
                <th className={`${cell} text-left`}>Indoor</th>
                <th className={`${cell} text-left`}>Base rate</th>
                <th className={`${cell} text-left`}>Status</th>
                <th className={`${cell} text-left`}>Current rates</th>
                <th className={`${cell} text-left`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courts.data.map((c) => (
                <CourtRows
                  key={c.id}
                  court={c}
                  rules={rulesForCourt(c.id)}
                  editing={editingId === c.id}
                  onToggleEdit={() => setEditingId(editingId === c.id ? null : c.id)}
                  deleteError={deleteError?.courtId === c.id ? deleteError.message : null}
                  onDelete={() =>
                    remove.mutate(c.id, {
                      onSuccess: () => setDeleteError(null),
                      onError: (e) => setDeleteError({ courtId: c.id, message: e.message }),
                    })
                  }
                  onSetInactive={() =>
                    update.mutate(
                      { id: c.id, input: { status: "inactive" } },
                      { onSuccess: () => setDeleteError(null) },
                    )
                  }
                />
              ))}
            </tbody>
          </table>
        )}
      </section>

      <AddCourtForm />
    </div>
  );
}

function CourtRows({
  court,
  rules,
  editing,
  onToggleEdit,
  deleteError,
  onDelete,
  onSetInactive,
}: {
  court: CourtResponse;
  rules: RateRuleResponse[];
  editing: boolean;
  onToggleEdit: () => void;
  deleteError: string | null;
  onDelete: () => void;
  onSetInactive: () => void;
}) {
  return (
    <>
      <tr>
        <td className={cell}>{court.displayOrder}</td>
        <td className={cell}>{court.name}</td>
        <td className={cell}>{court.surfaceType ?? "-"}</td>
        <td className={cell}>{court.isIndoor ? "Yes" : "No"}</td>
        <td className={cell}>₱{court.hourlyRate.toFixed(2)}/hr</td>
        <td className={cell}>
          {court.status}
          {court.statusNote ? ` — ${court.statusNote}` : ""}
          {court.maintenanceStartsAt || court.maintenanceEndsAt
            ? ` (${court.maintenanceStartsAt ?? "?"} to ${court.maintenanceEndsAt ?? "?"})`
            : ""}
        </td>
        <td className={cell}>
          {rules.length === 0 && <p>Base rate only</p>}
          {rules.map((r) => (
            <p key={r.id}>
              {r.label}
              {r.courtId === null ? " (all courts)" : ""}: ₱{r.rate.toFixed(2)}/hr,{" "}
              {r.daysOfWeek.map((d) => DAY_LABELS[d]).join("/")} {hhmm(r.startTime)}-
              {hhmm(r.endTime)}
            </p>
          ))}
          <Link href={`/rates?courtId=${court.id}`} className="underline">
            View in Rates
          </Link>
        </td>
        <td className={cell}>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} onClick={onToggleEdit}>
              Edit
            </button>
            <button type="button" className={button} onClick={onDelete}>
              Delete
            </button>
          </div>
          {deleteError && (
            <div className="mt-2">
              <p>{deleteError}</p>
              <button type="button" className={`${button} mt-1`} onClick={onSetInactive}>
                Set inactive instead
              </button>
            </div>
          )}
        </td>
      </tr>
      {editing && (
        <tr>
          <td className={cell} colSpan={8}>
            <EditCourtForm court={court} onDone={onToggleEdit} />
          </td>
        </tr>
      )}
    </>
  );
}

function EditCourtForm({ court, onDone }: { court: CourtResponse; onDone: () => void }) {
  const update = useUpdateCourt();
  const facility = useFacility();
  const [status, setStatus] = useState<CourtStatus>(court.status);
  const [statusNote, setStatusNote] = useState(court.statusNote ?? "");
  const [maintenanceStartsAt, setMaintenanceStartsAt] = useState(court.maintenanceStartsAt ?? "");
  const [maintenanceEndsAt, setMaintenanceEndsAt] = useState(court.maintenanceEndsAt ?? "");
  const [override, setOverride] = useState<OperatingHours | null>(court.operatingHoursOverride);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate(
          {
            id: court.id,
            input: {
              status,
              statusNote: statusNote || null,
              maintenanceStartsAt: maintenanceStartsAt || null,
              maintenanceEndsAt: maintenanceEndsAt || null,
              operatingHoursOverride: override,
            },
          },
          { onSuccess: onDone },
        );
      }}
    >
      <div className="flex flex-wrap gap-3">
        <Field label="Status">
          <select
            className={input}
            value={status}
            onChange={(e) => setStatus(e.target.value as CourtStatus)}
          >
            {courtStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status note">
          <input
            className={input}
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
          />
        </Field>
        <Field label="Maintenance starts">
          <input
            type="date"
            className={input}
            value={maintenanceStartsAt}
            onChange={(e) => setMaintenanceStartsAt(e.target.value)}
          />
        </Field>
        <Field label="Maintenance ends">
          <input
            type="date"
            className={input}
            value={maintenanceEndsAt}
            onChange={(e) => setMaintenanceEndsAt(e.target.value)}
          />
        </Field>
      </div>
      <label className="flex items-center gap-1 text-sm">
        <input
          type="checkbox"
          checked={override !== null}
          onChange={(e) =>
            setOverride(e.target.checked ? (facility.data?.operatingHours ?? null) : null)
          }
        />
        Override facility operating hours
      </label>
      {override && <OperatingHoursEditor value={override} onChange={setOverride} />}
      <div className="flex gap-2">
        <button type="submit" className={button} disabled={update.isPending}>
          Save
        </button>
        <button type="button" className={button} onClick={onDone}>
          Close
        </button>
      </div>
      {update.error && <p className="text-sm">{update.error.message}</p>}
    </form>
  );
}

type TierDraft = {
  label: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  rate: string;
};

const emptyTier: TierDraft = { label: "", daysOfWeek: [], startTime: "", endTime: "", rate: "" };

function AddCourtForm() {
  const create = useCreateCourt();
  const [name, setName] = useState("");
  const [surfaceType, setSurfaceType] = useState("");
  const [isIndoor, setIsIndoor] = useState(false);
  const [hourlyRate, setHourlyRate] = useState("");
  const [displayOrder, setDisplayOrder] = useState("");
  const [tiers, setTiers] = useState<TierDraft[]>([]);

  const setTier = (index: number, patch: Partial<TierDraft>) =>
    setTiers(tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)));

  const reset = () => {
    setName("");
    setSurfaceType("");
    setIsIndoor(false);
    setHourlyRate("");
    setDisplayOrder("");
    setTiers([]);
  };

  return (
    <section>
      <h2 className="mb-2 font-bold">Add court</h2>
      <form
        className="flex max-w-2xl flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(
            {
              name,
              surfaceType: surfaceType || null,
              isIndoor,
              hourlyRate: Number(hourlyRate),
              displayOrder: displayOrder ? Number(displayOrder) : undefined,
              rateRules:
                tiers.length > 0
                  ? tiers.map((t) => ({
                      label: t.label,
                      daysOfWeek: t.daysOfWeek,
                      startTime: t.startTime,
                      endTime: t.endTime,
                      rate: Number(t.rate),
                    }))
                  : undefined,
            },
            { onSuccess: reset },
          );
        }}
      >
        <div className="flex flex-wrap gap-3">
          <Field label="Name">
            <input
              className={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
          <Field label="Surface type">
            <input
              className={input}
              value={surfaceType}
              onChange={(e) => setSurfaceType(e.target.value)}
            />
          </Field>
          <Field label="Display order">
            <input
              type="number"
              min={0}
              className={input}
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
            />
          </Field>
        </div>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={isIndoor}
            onChange={(e) => setIsIndoor(e.target.checked)}
          />
          Indoor
        </label>

        <h3 className="font-bold">Pricing</h3>
        <Field label="Base hourly rate">
          <input
            type="number"
            min={0}
            step="0.01"
            className={input}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            required
          />
        </Field>
        {tiers.map((tier, i) => (
          <div key={i} className="flex flex-col gap-2 border border-black p-2">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Label">
                <input
                  className={input}
                  value={tier.label}
                  onChange={(e) => setTier(i, { label: e.target.value })}
                  required
                />
              </Field>
              <Field label="Start">
                <input
                  type="time"
                  className={input}
                  value={tier.startTime}
                  onChange={(e) => setTier(i, { startTime: e.target.value })}
                  required
                />
              </Field>
              <Field label="End">
                <input
                  type="time"
                  className={input}
                  value={tier.endTime}
                  onChange={(e) => setTier(i, { endTime: e.target.value })}
                  required
                />
              </Field>
              <Field label="Rate">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={input}
                  value={tier.rate}
                  onChange={(e) => setTier(i, { rate: e.target.value })}
                  required
                />
              </Field>
              <button
                type="button"
                className={button}
                onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
              >
                Remove tier
              </button>
            </div>
            <Field
              label={`Days (${tier.daysOfWeek.map((d) => DAY_LABELS[d]).join(", ") || "none"})`}
            >
              <DaysOfWeekPicker
                value={tier.daysOfWeek}
                onChange={(days) => setTier(i, { daysOfWeek: days })}
              />
            </Field>
          </div>
        ))}
        <div>
          <button type="button" className={button} onClick={() => setTiers([...tiers, emptyTier])}>
            Add rate tier
          </button>
        </div>
        <div>
          <button type="submit" className={button} disabled={create.isPending}>
            Create court
          </button>
        </div>
        {create.error && <p className="text-sm">{create.error.message}</p>}
      </form>
    </section>
  );
}
