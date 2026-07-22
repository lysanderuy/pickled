"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Field } from "@/components/ui/field";
import { useCreateCustomer, useCustomers } from "@/hooks/use-customers";
import { useDebounce } from "@/hooks/use-debounce";
import { ApiError } from "@/lib/api/client";

const input = "border border-black px-2 py-1";
const button = "border border-black px-2 py-1 disabled:opacity-50";
const cell = "border border-black px-2 py-1";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [regularFilter, setRegularFilter] = useState<"" | "true" | "false">("");
  const debouncedSearch = useDebounce(search);

  const customers = useCustomers({
    search: debouncedSearch || undefined,
    isRegular: regularFilter === "" ? undefined : regularFilter === "true",
  });

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-bold">Customers</h1>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Field label="Search">
            <input
              className={input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, phone, or email"
            />
          </Field>
          <Field label="Regulars">
            <select
              className={input}
              value={regularFilter}
              onChange={(e) => setRegularFilter(e.target.value as "" | "true" | "false")}
            >
              <option value="">All</option>
              <option value="true">Regulars only</option>
              <option value="false">Non-regulars only</option>
            </select>
          </Field>
        </div>

        {customers.isLoading && <p className="text-sm">Loading...</p>}
        {customers.error && <p className="text-sm">{customers.error.message}</p>}
        {customers.data?.length === 0 && <p className="text-sm">No customers match.</p>}
        {customers.data && customers.data.length > 0 && (
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className={`${cell} text-left`}>Name</th>
                <th className={`${cell} text-left`}>Phone</th>
                <th className={`${cell} text-left`}>Email</th>
                <th className={`${cell} text-left`}>Regular</th>
                <th className={`${cell} text-left`}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {customers.data.map((c) => (
                <tr key={c.id}>
                  <td className={cell}>
                    <Link href={`/customers/${c.id}`} className="underline">
                      {c.fullName}
                    </Link>
                  </td>
                  <td className={cell}>{c.phone ?? "-"}</td>
                  <td className={cell}>{c.email ?? "-"}</td>
                  <td className={cell}>{c.isRegular ? "Yes" : "No"}</td>
                  <td className={cell}>{c.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <AddCustomerForm onOpenExisting={(term) => setSearch(term)} />
    </div>
  );
}

function AddCustomerForm({ onOpenExisting }: { onOpenExisting: (term: string) => void }) {
  const router = useRouter();
  const create = useCreateCustomer();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isRegular, setIsRegular] = useState(false);
  const [notes, setNotes] = useState("");
  const [duplicate, setDuplicate] = useState<{ message: string; customerId?: string } | null>(null);

  const buildInput = (allowDuplicate?: boolean) => ({
    fullName,
    phone: phone || null,
    email: email || null,
    isRegular,
    notes: notes || null,
    allowDuplicate,
  });

  const reset = () => {
    setFullName("");
    setPhone("");
    setEmail("");
    setIsRegular(false);
    setNotes("");
    setDuplicate(null);
  };

  const submit = (allowDuplicate?: boolean) =>
    create.mutate(buildInput(allowDuplicate), {
      onSuccess: reset,
      onError: (e) => {
        if (e instanceof ApiError && e.code === "duplicate_customer") {
          const customerId = e.details?.customerId;
          setDuplicate({
            message: e.message,
            customerId: typeof customerId === "string" ? customerId : undefined,
          });
        } else {
          setDuplicate(null);
        }
      },
    });

  return (
    <section>
      <h2 className="mb-2 font-bold">Add customer</h2>
      <form
        className="flex max-w-xl flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
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
          <Field label="Notes">
            <input className={input} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
        <div>
          <button type="submit" className={button} disabled={create.isPending}>
            Add customer
          </button>
        </div>
        {duplicate ? (
          <div className="border border-black p-2 text-sm">
            <p>{duplicate.message}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className={button}
                onClick={() => {
                  if (duplicate.customerId) {
                    router.push(`/customers/${duplicate.customerId}`);
                  } else {
                    onOpenExisting(phone || email || fullName);
                  }
                  setDuplicate(null);
                }}
              >
                Open existing
              </button>
              <button
                type="button"
                className={button}
                disabled={create.isPending}
                onClick={() => submit(true)}
              >
                Create anyway
              </button>
            </div>
          </div>
        ) : (
          create.error && <p className="text-sm">{create.error.message}</p>
        )}
      </form>
    </section>
  );
}
