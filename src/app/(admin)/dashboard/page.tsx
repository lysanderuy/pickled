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
import { todayIn } from "@/lib/dates";

const hhmm = (t: string) => t.slice(0, 5);

export default function DashboardPage() {
  const facility = useFacility();
  const today = todayIn(facility.data?.timezone ?? "Asia/Manila");
  const pending = useBookings({ status: "pending_confirmation" });
  const todays = useCalendar(today, today);
  const courts = useCourts();
  const customers = useCustomers();
  const confirm = useConfirmBooking();
  const cancel = useCancelBooking();
  const [actionError, setActionError] = useState<string | null>(null);

  const courtName = (id: string) => courts.data?.find((c) => c.id === id)?.name ?? id;
  const customerName = (id: string) => customers.data?.find((c) => c.id === id)?.fullName ?? id;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-bold">Dashboard</h1>
        <h2 className="mb-2 font-bold">Pending confirmations</h2>
        {actionError && <p className="mb-2 text-sm">{actionError}</p>}
        {pending.isLoading && <p className="text-sm">Loading...</p>}
        {pending.error && <p className="text-sm">{pending.error.message}</p>}
        {pending.data?.length === 0 && <p className="text-sm">No pending bookings.</p>}
        {pending.data && pending.data.length > 0 && (
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-black px-2 py-1 text-left">Date</th>
                <th className="border border-black px-2 py-1 text-left">Time</th>
                <th className="border border-black px-2 py-1 text-left">Court</th>
                <th className="border border-black px-2 py-1 text-left">Customer</th>
                <th className="border border-black px-2 py-1 text-left">Rate</th>
                <th className="border border-black px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.data.map((b) => (
                <tr key={b.id}>
                  <td className="border border-black px-2 py-1">{b.bookingDate}</td>
                  <td className="border border-black px-2 py-1">
                    {hhmm(b.startTime)}-{hhmm(b.endTime)}
                  </td>
                  <td className="border border-black px-2 py-1">{courtName(b.courtId)}</td>
                  <td className="border border-black px-2 py-1">{customerName(b.customerId)}</td>
                  <td className="border border-black px-2 py-1">₱{b.rateAmount.toFixed(2)}</td>
                  <td className="border border-black px-2 py-1">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="border border-black px-2 py-1 disabled:opacity-50"
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
                      <button
                        type="button"
                        className="border border-black px-2 py-1 disabled:opacity-50"
                        disabled={cancel.isPending}
                        onClick={() =>
                          cancel.mutate(b.id, {
                            onSuccess: () => setActionError(null),
                            onError: (e) => setActionError(e.message),
                          })
                        }
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-bold">Today&apos;s bookings ({today})</h2>
        {todays.isLoading && <p className="text-sm">Loading...</p>}
        {todays.error && <p className="text-sm">{todays.error.message}</p>}
        {todays.data?.length === 0 && <p className="text-sm">No bookings today.</p>}
        {todays.data && todays.data.length > 0 && (
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-black px-2 py-1 text-left">Time</th>
                <th className="border border-black px-2 py-1 text-left">Court</th>
                <th className="border border-black px-2 py-1 text-left">Customer</th>
                <th className="border border-black px-2 py-1 text-left">Status</th>
                <th className="border border-black px-2 py-1 text-left">Payment</th>
                <th className="border border-black px-2 py-1 text-left">Rate</th>
              </tr>
            </thead>
            <tbody>
              {todays.data.map((b) => (
                <tr key={b.id}>
                  <td className="border border-black px-2 py-1">
                    {hhmm(b.startTime)}-{hhmm(b.endTime)}
                  </td>
                  <td className="border border-black px-2 py-1">{b.courtName}</td>
                  <td className="border border-black px-2 py-1">{b.customerName}</td>
                  <td className="border border-black px-2 py-1">{b.status}</td>
                  <td className="border border-black px-2 py-1">{b.paymentStatus}</td>
                  <td className="border border-black px-2 py-1">₱{b.rateAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
