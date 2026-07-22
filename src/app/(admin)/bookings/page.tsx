"use client";

import { useState } from "react";

import { Field } from "@/components/ui/field";
import {
  useBookings,
  useCancelBooking,
  useCompleteBooking,
  useConfirmBooking,
  useCreateBooking,
  useRatePreview,
  useRecordBookingPayment,
  useUpdateBooking,
  type BookingStatus,
} from "@/hooks/use-bookings";
import { useCourts } from "@/hooks/use-courts";
import { useCustomers } from "@/hooks/use-customers";
import type { BookingResponse } from "@/validators/booking.validator";
import { bookingStatuses } from "@/validators/booking.validator";
import type { CourtResponse } from "@/validators/court.validator";
import { paymentMethods } from "@/validators/sale.validator";

const hhmm = (t: string) => t.slice(0, 5);
const input = "border border-black px-2 py-1";
const button = "border border-black px-2 py-1 disabled:opacity-50";
const cell = "border border-black px-2 py-1";

export default function BookingsPage() {
  const [status, setStatus] = useState<BookingStatus | "">("");
  const [courtId, setCourtId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const bookings = useBookings({
    status: status || undefined,
    courtId: courtId || undefined,
    from: from || undefined,
    to: to || undefined,
  });
  const courts = useCourts();
  const customers = useCustomers();

  const courtName = (id: string) => courts.data?.find((c) => c.id === id)?.name ?? id;
  const customerName = (id: string) => customers.data?.find((c) => c.id === id)?.fullName ?? id;

  const [expanded, setExpanded] = useState<{ id: string; mode: "edit" | "payment" } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const confirm = useConfirmBooking();
  const cancel = useCancelBooking();
  const complete = useCompleteBooking();

  const onError = (e: Error) => setActionError(e.message);
  const onSuccess = () => setActionError(null);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-bold">Bookings</h1>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Field label="Status">
            <select
              className={input}
              value={status}
              onChange={(e) => setStatus(e.target.value as BookingStatus | "")}
            >
              <option value="">All</option>
              {bookingStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Court">
            <select className={input} value={courtId} onChange={(e) => setCourtId(e.target.value)}>
              <option value="">All</option>
              {courts.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="From">
            <input
              type="date"
              className={input}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label="To">
            <input
              type="date"
              className={input}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
        </div>

        {actionError && <p className="mb-2 text-sm">{actionError}</p>}
        {bookings.isLoading && <p className="text-sm">Loading...</p>}
        {bookings.error && <p className="text-sm">{bookings.error.message}</p>}
        {bookings.data?.length === 0 && <p className="text-sm">No bookings match.</p>}
        {bookings.data && bookings.data.length > 0 && (
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className={`${cell} text-left`}>Date</th>
                <th className={`${cell} text-left`}>Time</th>
                <th className={`${cell} text-left`}>Court</th>
                <th className={`${cell} text-left`}>Customer</th>
                <th className={`${cell} text-left`}>Source</th>
                <th className={`${cell} text-left`}>Status</th>
                <th className={`${cell} text-left`}>Payment</th>
                <th className={`${cell} text-left`}>Rate</th>
                <th className={`${cell} text-left`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.data.map((b) => {
                const editable =
                  b.status === "pending_confirmation" ||
                  b.status === "confirmed" ||
                  b.status === "expired";
                return (
                  <BookingRowGroup
                    key={b.id}
                    booking={b}
                    courts={courts.data ?? []}
                    expanded={expanded?.id === b.id ? expanded.mode : null}
                    onExpand={(mode) => setExpanded(mode ? { id: b.id, mode } : null)}
                  >
                    <td className={cell}>{b.bookingDate}</td>
                    <td className={cell}>
                      {hhmm(b.startTime)}-{hhmm(b.endTime)}
                    </td>
                    <td className={cell}>{courtName(b.courtId)}</td>
                    <td className={cell}>{customerName(b.customerId)}</td>
                    <td className={cell}>{b.source}</td>
                    <td className={cell}>{b.status}</td>
                    <td className={cell}>{b.paymentStatus}</td>
                    <td className={cell}>₱{b.rateAmount.toFixed(2)}</td>
                    <td className={cell}>
                      <div className="flex flex-wrap gap-2">
                        {(b.status === "pending_confirmation" || b.status === "expired") && (
                          <button
                            type="button"
                            className={button}
                            disabled={confirm.isPending}
                            onClick={() => confirm.mutate(b.id, { onSuccess, onError })}
                          >
                            Confirm
                          </button>
                        )}
                        {editable && (
                          <button
                            type="button"
                            className={button}
                            disabled={cancel.isPending}
                            onClick={() => cancel.mutate(b.id, { onSuccess, onError })}
                          >
                            Cancel
                          </button>
                        )}
                        {b.status === "confirmed" && (
                          <>
                            <button
                              type="button"
                              className={button}
                              disabled={complete.isPending}
                              onClick={() =>
                                complete.mutate(
                                  { id: b.id, input: { status: "completed" } },
                                  { onSuccess, onError },
                                )
                              }
                            >
                              Completed
                            </button>
                            <button
                              type="button"
                              className={button}
                              disabled={complete.isPending}
                              onClick={() =>
                                complete.mutate(
                                  { id: b.id, input: { status: "no_show" } },
                                  { onSuccess, onError },
                                )
                              }
                            >
                              No-show
                            </button>
                          </>
                        )}
                        {b.paymentStatus !== "paid" && (
                          <button
                            type="button"
                            className={button}
                            onClick={() =>
                              setExpanded(
                                expanded?.id === b.id && expanded.mode === "payment"
                                  ? null
                                  : { id: b.id, mode: "payment" },
                              )
                            }
                          >
                            Payment
                          </button>
                        )}
                        {editable && (
                          <button
                            type="button"
                            className={button}
                            onClick={() =>
                              setExpanded(
                                expanded?.id === b.id && expanded.mode === "edit"
                                  ? null
                                  : { id: b.id, mode: "edit" },
                              )
                            }
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </BookingRowGroup>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <CreateBookingForm courts={courts.data ?? []} />
    </div>
  );
}

function BookingRowGroup({
  booking,
  courts,
  expanded,
  onExpand,
  children,
}: {
  booking: BookingResponse;
  courts: CourtResponse[];
  expanded: "edit" | "payment" | null;
  onExpand: (mode: "edit" | "payment" | null) => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <tr>{children}</tr>
      {expanded === "edit" && (
        <tr>
          <td className={cell} colSpan={9}>
            <EditBookingForm booking={booking} courts={courts} onDone={() => onExpand(null)} />
          </td>
        </tr>
      )}
      {expanded === "payment" && (
        <tr>
          <td className={cell} colSpan={9}>
            <PaymentForm bookingId={booking.id} onDone={() => onExpand(null)} />
          </td>
        </tr>
      )}
    </>
  );
}

function EditBookingForm({
  booking,
  courts,
  onDone,
}: {
  booking: BookingResponse;
  courts: CourtResponse[];
  onDone: () => void;
}) {
  const update = useUpdateBooking();
  const [courtId, setCourtId] = useState(booking.courtId);
  const [bookingDate, setBookingDate] = useState(booking.bookingDate);
  const [startTime, setStartTime] = useState(hhmm(booking.startTime));
  const [endTime, setEndTime] = useState(hhmm(booking.endTime));
  const [notes, setNotes] = useState(booking.notes ?? "");

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate(
          {
            id: booking.id,
            input: { courtId, bookingDate, startTime, endTime, notes: notes || null },
          },
          { onSuccess: onDone },
        );
      }}
    >
      <Field label="Court">
        <select className={input} value={courtId} onChange={(e) => setCourtId(e.target.value)}>
          {courts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Date">
        <input
          type="date"
          className={input}
          value={bookingDate}
          onChange={(e) => setBookingDate(e.target.value)}
          required
        />
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
      <Field label="Notes">
        <input className={input} value={notes} onChange={(e) => setNotes(e.target.value)} />
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

function PaymentForm({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const payment = useRecordBookingPayment();
  const [method, setMethod] = useState<(typeof paymentMethods)[number]>("cash");
  const [createSale, setCreateSale] = useState(true);

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        payment.mutate(
          { id: bookingId, input: { paymentMethod: method, createSale } },
          { onSuccess: onDone },
        );
      }}
    >
      <Field label="Payment method">
        <select
          className={input}
          value={method}
          onChange={(e) => setMethod(e.target.value as (typeof paymentMethods)[number])}
        >
          {paymentMethods.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex items-center gap-1 text-sm">
        <input
          type="checkbox"
          checked={createSale}
          onChange={(e) => setCreateSale(e.target.checked)}
        />
        Also log a sale
      </label>
      <button type="submit" className={button} disabled={payment.isPending}>
        Record payment
      </button>
      <button type="button" className={button} onClick={onDone}>
        Close
      </button>
      {payment.error && <p className="text-sm">{payment.error.message}</p>}
    </form>
  );
}

function CreateBookingForm({ courts }: { courts: CourtResponse[] }) {
  const create = useCreateBooking();
  const [courtId, setCourtId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [holdPending, setHoldPending] = useState(false);

  const previewParams =
    courtId && bookingDate && startTime && endTime && startTime < endTime
      ? { courtId, date: bookingDate, startTime, endTime }
      : null;
  const preview = useRatePreview(previewParams);

  const reset = () => {
    setCourtId("");
    setBookingDate("");
    setStartTime("");
    setEndTime("");
    setFullName("");
    setPhone("");
    setEmail("");
    setNotes("");
    setHoldPending(false);
  };

  return (
    <section>
      <h2 className="mb-2 font-bold">Create booking</h2>
      <form
        className="flex max-w-xl flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(
            {
              courtId,
              bookingDate,
              startTime,
              endTime,
              customer: {
                fullName,
                phone: phone || undefined,
                email: email || undefined,
              },
              status: holdPending ? "pending_confirmation" : undefined,
              notes: notes || undefined,
            },
            { onSuccess: reset },
          );
        }}
      >
        <div className="flex flex-wrap gap-3">
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
                  {c.status !== "active" ? ` (${c.status})` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input
              type="date"
              className={input}
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              required
            />
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
        </div>
        <div className="flex flex-wrap gap-3">
          <Field label="Customer name">
            <input
              className={input}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </Field>
          <Field label="Phone">
            <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Notes">
            <input className={input} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={holdPending}
            onChange={(e) => setHoldPending(e.target.checked)}
          />
          Hold as pending instead of confirming immediately
        </label>
        {previewParams && preview.data && (
          <p className="text-sm">
            Rate preview: ₱{preview.data.rate.toFixed(2)}/hr x {preview.data.hours} hr = ₱
            {preview.data.total.toFixed(2)}
          </p>
        )}
        {previewParams && preview.error && (
          <p className="text-sm">Rate preview: {preview.error.message}</p>
        )}
        <div>
          <button type="submit" className={button} disabled={create.isPending}>
            Create booking
          </button>
        </div>
        {create.error && <p className="text-sm">{create.error.message}</p>}
      </form>
    </section>
  );
}
