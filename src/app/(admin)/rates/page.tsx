"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { DAY_LABELS, DaysOfWeekPicker } from "@/components/ui/days-of-week-picker";
import { Field } from "@/components/ui/field";
import { useCourts } from "@/hooks/use-courts";
import {
  useCreateRateRule,
  useDeleteRateRule,
  useRateRules,
  useUpdateRateRule,
} from "@/hooks/use-rate-rules";
import type { CourtResponse } from "@/validators/court.validator";
import type { RateRuleResponse } from "@/validators/rate-rule.validator";

const hhmm = (t: string) => t.slice(0, 5);
const input = "border border-black px-2 py-1";
const button = "border border-black px-2 py-1 disabled:opacity-50";
const cell = "border border-black px-2 py-1";

type RuleValues = {
  courtId: string | null;
  label: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  rate: number;
  priority: number;
  isActive: boolean;
};

export default function RatesPage() {
  return (
    <Suspense fallback={<p className="text-sm">Loading...</p>}>
      <RatesContent />
    </Suspense>
  );
}

function RatesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courtId = searchParams.get("courtId") ?? "";

  const rules = useRateRules(courtId || undefined);
  const courts = useCourts();
  const update = useUpdateRateRule();
  const remove = useDeleteRateRule();
  const create = useCreateRateRule();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const courtName = (id: string | null) =>
    id === null ? "All courts" : (courts.data?.find((c) => c.id === id)?.name ?? id);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-bold">Rates</h1>
        <div className="mb-4 flex items-end gap-3">
          <Field label="Court filter">
            <select
              className={input}
              value={courtId}
              onChange={(e) =>
                router.replace(e.target.value ? `/rates?courtId=${e.target.value}` : "/rates")
              }
            >
              <option value="">All rules</option>
              {courts.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {actionError && <p className="mb-2 text-sm">{actionError}</p>}
        {rules.isLoading && <p className="text-sm">Loading...</p>}
        {rules.error && <p className="text-sm">{rules.error.message}</p>}
        {rules.data?.length === 0 && <p className="text-sm">No rate rules.</p>}
        {rules.data && rules.data.length > 0 && (
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className={`${cell} text-left`}>Label</th>
                <th className={`${cell} text-left`}>Court</th>
                <th className={`${cell} text-left`}>Days</th>
                <th className={`${cell} text-left`}>Window</th>
                <th className={`${cell} text-left`}>Rate</th>
                <th className={`${cell} text-left`}>Priority</th>
                <th className={`${cell} text-left`}>Active</th>
                <th className={`${cell} text-left`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.data.map((r) => (
                <RuleRows
                  key={r.id}
                  rule={r}
                  courts={courts.data ?? []}
                  courtName={courtName(r.courtId)}
                  editing={editingId === r.id}
                  onToggleEdit={() => setEditingId(editingId === r.id ? null : r.id)}
                  onToggleActive={() =>
                    update.mutate(
                      { id: r.id, input: { isActive: !r.isActive } },
                      {
                        onSuccess: () => setActionError(null),
                        onError: (e) => setActionError(e.message),
                      },
                    )
                  }
                  onDelete={() =>
                    remove.mutate(r.id, {
                      onSuccess: () => setActionError(null),
                      onError: (e) => setActionError(e.message),
                    })
                  }
                />
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-bold">Create rate rule</h2>
        <RuleForm
          key={courtId}
          courts={courts.data ?? []}
          initial={courtId ? { courtId } : undefined}
          pending={create.isPending}
          error={create.error?.message ?? null}
          onSubmit={(values, done) =>
            create.mutate(
              {
                courtId: values.courtId,
                label: values.label,
                daysOfWeek: values.daysOfWeek,
                startTime: values.startTime,
                endTime: values.endTime,
                rate: values.rate,
                priority: values.priority,
                isActive: values.isActive,
              },
              { onSuccess: done },
            )
          }
        />
      </section>
    </div>
  );
}

function RuleRows({
  rule,
  courts,
  courtName,
  editing,
  onToggleEdit,
  onToggleActive,
  onDelete,
}: {
  rule: RateRuleResponse;
  courts: CourtResponse[];
  courtName: string;
  editing: boolean;
  onToggleEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const update = useUpdateRateRule();

  return (
    <>
      <tr>
        <td className={cell}>{rule.label}</td>
        <td className={cell}>{courtName}</td>
        <td className={cell}>{rule.daysOfWeek.map((d) => DAY_LABELS[d]).join(", ")}</td>
        <td className={cell}>
          {hhmm(rule.startTime)}-{hhmm(rule.endTime)}
        </td>
        <td className={cell}>₱{rule.rate.toFixed(2)}/hr</td>
        <td className={cell}>{rule.priority}</td>
        <td className={cell}>{rule.isActive ? "Yes" : "No"}</td>
        <td className={cell}>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} onClick={onToggleActive}>
              {rule.isActive ? "Deactivate" : "Activate"}
            </button>
            <button type="button" className={button} onClick={onToggleEdit}>
              Edit
            </button>
            <button type="button" className={button} onClick={onDelete}>
              Delete
            </button>
          </div>
        </td>
      </tr>
      {editing && (
        <tr>
          <td className={cell} colSpan={8}>
            <RuleForm
              courts={courts}
              initial={{
                courtId: rule.courtId,
                label: rule.label,
                daysOfWeek: rule.daysOfWeek,
                startTime: hhmm(rule.startTime),
                endTime: hhmm(rule.endTime),
                rate: rule.rate,
                priority: rule.priority,
                isActive: rule.isActive,
              }}
              pending={update.isPending}
              error={update.error?.message ?? null}
              onCancel={onToggleEdit}
              onSubmit={(values) =>
                update.mutate({ id: rule.id, input: values }, { onSuccess: onToggleEdit })
              }
            />
          </td>
        </tr>
      )}
    </>
  );
}

function RuleForm({
  courts,
  initial,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  courts: CourtResponse[];
  initial?: Partial<RuleValues>;
  pending: boolean;
  error: string | null;
  onSubmit: (values: RuleValues, done: () => void) => void;
  onCancel?: () => void;
}) {
  const [courtId, setCourtId] = useState(initial?.courtId ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initial?.daysOfWeek ?? []);
  const [startTime, setStartTime] = useState(initial?.startTime ?? "");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "");
  const [rate, setRate] = useState(initial?.rate !== undefined ? String(initial.rate) : "");
  const [priority, setPriority] = useState(
    initial?.priority !== undefined ? String(initial.priority) : "0",
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const reset = () => {
    setLabel("");
    setDaysOfWeek([]);
    setStartTime("");
    setEndTime("");
    setRate("");
    setPriority("0");
    setIsActive(true);
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(
          {
            courtId: courtId || null,
            label,
            daysOfWeek,
            startTime,
            endTime,
            rate: Number(rate),
            priority: Number(priority),
            isActive,
          },
          reset,
        );
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Label">
          <input
            className={input}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </Field>
        <Field label="Court">
          <select
            className={input}
            value={courtId ?? ""}
            onChange={(e) => setCourtId(e.target.value)}
          >
            <option value="">All courts</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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
        <Field label="Rate">
          <input
            type="number"
            min={0}
            step="0.01"
            className={input}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
          />
        </Field>
        <Field label="Priority">
          <input
            type="number"
            className={input}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          />
        </Field>
      </div>
      <DaysOfWeekPicker value={daysOfWeek} onChange={setDaysOfWeek} />
      <label className="flex items-center gap-1 text-sm">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active
      </label>
      <div className="flex gap-2">
        <button type="submit" className={button} disabled={pending}>
          Save rule
        </button>
        {onCancel && (
          <button type="button" className={button} onClick={onCancel}>
            Close
          </button>
        )}
      </div>
      {error && <p className="text-sm">{error}</p>}
    </form>
  );
}
