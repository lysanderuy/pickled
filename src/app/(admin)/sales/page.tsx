"use client";

import { useState } from "react";

import { Field } from "@/components/ui/field";
import { useCustomers } from "@/hooks/use-customers";
import { useMe } from "@/hooks/use-me";
import {
  useCreateSale,
  useSales,
  useUpdateSale,
  useVoidSale,
  type PaymentMethod,
  type SaleType,
} from "@/hooks/use-sales";
import type { CustomerResponse } from "@/validators/customer.validator";
import { paymentMethods, saleTypes, type SaleResponse } from "@/validators/sale.validator";

const input = "border border-black px-2 py-1";
const button = "border border-black px-2 py-1 disabled:opacity-50";
const cell = "border border-black px-2 py-1";

export default function SalesPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState<SaleType | "">("");
  const [method, setMethod] = useState<PaymentMethod | "">("");

  const sales = useSales({
    from: from || undefined,
    to: to || undefined,
    type: type || undefined,
    paymentMethod: method || undefined,
  });
  const customers = useCustomers();
  const me = useMe();
  const isOwnerAdmin = me.data?.role === "owner_admin";

  const [expanded, setExpanded] = useState<{ id: string; mode: "edit" | "void" } | null>(null);

  const customerName = (id: string | null) =>
    id === null ? "-" : (customers.data?.find((c) => c.id === id)?.fullName ?? id);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-bold">Sales</h1>
        <div className="mb-4 flex flex-wrap items-end gap-3">
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
          <Field label="Type">
            <select
              className={input}
              value={type}
              onChange={(e) => setType(e.target.value as SaleType | "")}
            >
              <option value="">All</option>
              {saleTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Method">
            <select
              className={input}
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod | "")}
            >
              <option value="">All</option>
              {paymentMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {sales.isLoading && <p className="text-sm">Loading...</p>}
        {sales.error && <p className="text-sm">{sales.error.message}</p>}
        {sales.data?.length === 0 && <p className="text-sm">No sales match.</p>}
        {sales.data && sales.data.length > 0 && (
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className={`${cell} text-left`}>Date</th>
                <th className={`${cell} text-left`}>Type</th>
                <th className={`${cell} text-left`}>Description</th>
                <th className={`${cell} text-left`}>Customer</th>
                <th className={`${cell} text-left`}>Amount</th>
                <th className={`${cell} text-left`}>Method</th>
                <th className={`${cell} text-left`}>Voided</th>
                <th className={`${cell} text-left`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.data.map((s) => (
                <SaleRows
                  key={s.id}
                  sale={s}
                  customerName={customerName(s.customerId)}
                  isOwnerAdmin={isOwnerAdmin}
                  expanded={expanded?.id === s.id ? expanded.mode : null}
                  onExpand={(mode) => setExpanded(mode ? { id: s.id, mode } : null)}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>

      <LogSaleForm customers={customers.data ?? []} />
    </div>
  );
}

function SaleRows({
  sale,
  customerName,
  isOwnerAdmin,
  expanded,
  onExpand,
}: {
  sale: SaleResponse;
  customerName: string;
  isOwnerAdmin: boolean;
  expanded: "edit" | "void" | null;
  onExpand: (mode: "edit" | "void" | null) => void;
}) {
  const voided = sale.voidedAt !== null;
  const struck = voided ? "line-through" : undefined;

  return (
    <>
      <tr>
        <td className={cell}>
          <span className={struck}>{sale.saleDate}</span>
        </td>
        <td className={cell}>
          <span className={struck}>{sale.saleType}</span>
        </td>
        <td className={cell}>
          <span className={struck}>{sale.description}</span>
        </td>
        <td className={cell}>
          <span className={struck}>{customerName}</span>
        </td>
        <td className={cell}>
          <span className={struck}>₱{sale.amount.toFixed(2)}</span>
        </td>
        <td className={cell}>
          <span className={struck}>{sale.paymentMethod}</span>
        </td>
        <td className={cell}>{voided ? (sale.voidReason ?? "Voided") : "-"}</td>
        <td className={cell}>
          {!voided && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={button}
                onClick={() => onExpand(expanded === "edit" ? null : "edit")}
              >
                Edit
              </button>
              {isOwnerAdmin && (
                <button
                  type="button"
                  className={button}
                  onClick={() => onExpand(expanded === "void" ? null : "void")}
                >
                  Void
                </button>
              )}
            </div>
          )}
        </td>
      </tr>
      {expanded === "edit" && (
        <tr>
          <td className={cell} colSpan={8}>
            <EditSaleForm sale={sale} onDone={() => onExpand(null)} />
          </td>
        </tr>
      )}
      {expanded === "void" && (
        <tr>
          <td className={cell} colSpan={8}>
            <VoidSaleForm saleId={sale.id} onDone={() => onExpand(null)} />
          </td>
        </tr>
      )}
    </>
  );
}

function EditSaleForm({ sale, onDone }: { sale: SaleResponse; onDone: () => void }) {
  const update = useUpdateSale();
  const [saleType, setSaleType] = useState<SaleType>(sale.saleType);
  const [description, setDescription] = useState(sale.description);
  const [amount, setAmount] = useState(String(sale.amount));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(sale.paymentMethod);

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate(
          {
            id: sale.id,
            input: { saleType, description, amount: Number(amount), paymentMethod },
          },
          { onSuccess: onDone },
        );
      }}
    >
      <Field label="Type">
        <select
          className={input}
          value={saleType}
          onChange={(e) => setSaleType(e.target.value as SaleType)}
        >
          {saleTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Description">
        <input
          className={input}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </Field>
      <Field label="Amount">
        <input
          type="number"
          min={0}
          step="0.01"
          className={input}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </Field>
      <Field label="Method">
        <select
          className={input}
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
        >
          {paymentMethods.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
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

function VoidSaleForm({ saleId, onDone }: { saleId: string; onDone: () => void }) {
  const voidSale = useVoidSale();
  const [reason, setReason] = useState("");

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        voidSale.mutate({ id: saleId, voidReason: reason || undefined }, { onSuccess: onDone });
      }}
    >
      <Field label="Void reason">
        <input className={input} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <button type="submit" className={button} disabled={voidSale.isPending}>
        Confirm void
      </button>
      <button type="button" className={button} onClick={onDone}>
        Close
      </button>
      {voidSale.error && <p className="text-sm">{voidSale.error.message}</p>}
    </form>
  );
}

function LogSaleForm({ customers }: { customers: CustomerResponse[] }) {
  const create = useCreateSale();
  const [saleType, setSaleType] = useState<SaleType>("walk_in");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerId, setCustomerId] = useState("");

  const reset = () => {
    setSaleType("walk_in");
    setDescription("");
    setAmount("");
    setPaymentMethod("cash");
    setCustomerId("");
  };

  return (
    <section>
      <h2 className="mb-2 font-bold">Log sale</h2>
      <form
        className="flex max-w-2xl flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(
            {
              saleType,
              description,
              amount: Number(amount),
              paymentMethod,
              customerId: customerId || undefined,
            },
            { onSuccess: reset },
          );
        }}
      >
        <Field label="Type">
          <select
            className={input}
            value={saleType}
            onChange={(e) => setSaleType(e.target.value as SaleType)}
          >
            {saleTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description">
          <input
            className={input}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </Field>
        <Field label="Amount">
          <input
            type="number"
            min={0}
            step="0.01"
            className={input}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>
        <Field label="Method">
          <select
            className={input}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          >
            {paymentMethods.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Customer (optional)">
          <select
            className={input}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">None</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" className={button} disabled={create.isPending}>
          Log sale
        </button>
        {create.error && <p className="text-sm">{create.error.message}</p>}
      </form>
    </section>
  );
}
