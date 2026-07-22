"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { Field } from "@/components/ui/field";
import { useCourts } from "@/hooks/use-courts";
import {
  useCustomer,
  useCustomerBookings,
  useCustomerSales,
  useUpdateCustomer,
} from "@/hooks/use-customers";
import type { CustomerResponse } from "@/validators/customer.validator";

const hhmm = (t: string) => t.slice(0, 5);
const input = "border border-black px-2 py-1";
const button = "border border-black px-2 py-1 disabled:opacity-50";
const cell = "border border-black px-2 py-1";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const customer = useCustomer(id);
  const bookings = useCustomerBookings(id);
  const sales = useCustomerSales(id);
  const courts = useCourts();

  const courtName = (courtId: string) =>
    courts.data?.find((c) => c.id === courtId)?.name ?? courtId;

  if (customer.isLoading) return <p className="text-sm">Loading...</p>;
  if (customer.error) return <p className="text-sm">{customer.error.message}</p>;
  if (!customer.data) return null;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-bold">{customer.data.fullName}</h1>
        <EditCustomerForm key={customer.data.updatedAt} customer={customer.data} />
      </section>

      <section>
        <h2 className="mb-2 font-bold">Bookings</h2>
        {bookings.isLoading && <p className="text-sm">Loading...</p>}
        {bookings.error && <p className="text-sm">{bookings.error.message}</p>}
        {bookings.data?.length === 0 && <p className="text-sm">No bookings.</p>}
        {bookings.data && bookings.data.length > 0 && (
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className={`${cell} text-left`}>Date</th>
                <th className={`${cell} text-left`}>Time</th>
                <th className={`${cell} text-left`}>Court</th>
                <th className={`${cell} text-left`}>Status</th>
                <th className={`${cell} text-left`}>Payment</th>
                <th className={`${cell} text-left`}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {bookings.data.map((b) => (
                <tr key={b.id}>
                  <td className={cell}>{b.bookingDate}</td>
                  <td className={cell}>
                    {hhmm(b.startTime)}-{hhmm(b.endTime)}
                  </td>
                  <td className={cell}>{courtName(b.courtId)}</td>
                  <td className={cell}>{b.status}</td>
                  <td className={cell}>{b.paymentStatus}</td>
                  <td className={cell}>₱{b.rateAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-bold">Sales</h2>
        {sales.isLoading && <p className="text-sm">Loading...</p>}
        {sales.error && <p className="text-sm">{sales.error.message}</p>}
        {sales.data?.length === 0 && <p className="text-sm">No sales.</p>}
        {sales.data && sales.data.length > 0 && (
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className={`${cell} text-left`}>Date</th>
                <th className={`${cell} text-left`}>Type</th>
                <th className={`${cell} text-left`}>Description</th>
                <th className={`${cell} text-left`}>Amount</th>
                <th className={`${cell} text-left`}>Method</th>
                <th className={`${cell} text-left`}>Voided</th>
              </tr>
            </thead>
            <tbody>
              {sales.data.map((s) => (
                <tr key={s.id} className={s.voidedAt ? "line-through" : undefined}>
                  <td className={cell}>{s.saleDate}</td>
                  <td className={cell}>{s.saleType}</td>
                  <td className={cell}>{s.description}</td>
                  <td className={cell}>₱{s.amount.toFixed(2)}</td>
                  <td className={cell}>{s.paymentMethod}</td>
                  <td className={cell}>{s.voidedAt ? (s.voidReason ?? "Voided") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function EditCustomerForm({ customer }: { customer: CustomerResponse }) {
  const update = useUpdateCustomer();
  const [fullName, setFullName] = useState(customer.fullName);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [email, setEmail] = useState(customer.email ?? "");
  const [isRegular, setIsRegular] = useState(customer.isRegular);
  const [notes, setNotes] = useState(customer.notes ?? "");

  return (
    <form
      className="flex max-w-xl flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate({
          id: customer.id,
          input: {
            fullName,
            phone: phone || null,
            email: email || null,
            isRegular,
            notes: notes || null,
          },
        });
      }}
    >
      <div className="flex flex-wrap gap-3">
        <Field label="Full name">
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
      </div>
      <label className="flex items-center gap-1 text-sm">
        <input
          type="checkbox"
          checked={isRegular}
          onChange={(e) => setIsRegular(e.target.checked)}
        />
        Regular
      </label>
      <Field label="Notes">
        <textarea
          className={input}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <div>
        <button type="submit" className={button} disabled={update.isPending}>
          Save
        </button>
      </div>
      {update.error && <p className="text-sm">{update.error.message}</p>}
      {update.isSuccess && !update.isPending && <p className="text-sm">Saved.</p>}
    </form>
  );
}
