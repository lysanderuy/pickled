"use client";

import { useState } from "react";

import { Field } from "@/components/ui/field";
import { useMe } from "@/hooks/use-me";
import {
  useDisableStaff,
  useInviteStaff,
  useReinstateStaff,
  useStaffList,
  useUpdateStaff,
} from "@/hooks/use-staff";
import type { StaffResponse } from "@/validators/staff.validator";
import { staffRoles } from "@/validators/staff.validator";

const input = "border border-black px-2 py-1";
const button = "border border-black px-2 py-1 disabled:opacity-50";
const cell = "border border-black px-2 py-1";

type StaffRole = (typeof staffRoles)[number];

export default function TeamPage() {
  const me = useMe();

  if (me.isLoading) return <p className="text-sm">Loading...</p>;
  if (me.data?.role !== "owner_admin") {
    return (
      <div>
        <h1 className="mb-4 text-xl font-bold">Team</h1>
        <p className="text-sm">Owner admin access required.</p>
      </div>
    );
  }

  return <TeamContent />;
}

function TeamContent() {
  const staffList = useStaffList();
  const disable = useDisableStaff();
  const reinstate = useReinstateStaff();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const onError = (e: Error) => setActionError(e.message);
  const onSuccess = () => setActionError(null);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-bold">Team</h1>
        {actionError && <p className="mb-2 text-sm">{actionError}</p>}
        {staffList.isLoading && <p className="text-sm">Loading...</p>}
        {staffList.error && <p className="text-sm">{staffList.error.message}</p>}
        {staffList.data && (
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className={`${cell} text-left`}>Name</th>
                <th className={`${cell} text-left`}>Email</th>
                <th className={`${cell} text-left`}>Phone</th>
                <th className={`${cell} text-left`}>Role</th>
                <th className={`${cell} text-left`}>Status</th>
                <th className={`${cell} text-left`}>Invited</th>
                <th className={`${cell} text-left`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffList.data.map((s) => (
                <StaffRows
                  key={s.id}
                  member={s}
                  editing={editingId === s.id}
                  onToggleEdit={() => setEditingId(editingId === s.id ? null : s.id)}
                  onDisable={() => disable.mutate(s.id, { onSuccess, onError })}
                  onReinstate={() => reinstate.mutate(s.id, { onSuccess, onError })}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>

      <InviteStaffForm />
    </div>
  );
}

function StaffRows({
  member,
  editing,
  onToggleEdit,
  onDisable,
  onReinstate,
}: {
  member: StaffResponse;
  editing: boolean;
  onToggleEdit: () => void;
  onDisable: () => void;
  onReinstate: () => void;
}) {
  return (
    <>
      <tr>
        <td className={cell}>{member.fullName}</td>
        <td className={cell}>{member.email}</td>
        <td className={cell}>{member.phone ?? "-"}</td>
        <td className={cell}>{member.role}</td>
        <td className={cell}>{member.status}</td>
        <td className={cell}>{member.invitedAt ? member.invitedAt.slice(0, 10) : "-"}</td>
        <td className={cell}>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} onClick={onToggleEdit}>
              Edit
            </button>
            {member.status !== "disabled" ? (
              <button type="button" className={button} onClick={onDisable}>
                Disable
              </button>
            ) : (
              <button type="button" className={button} onClick={onReinstate}>
                Reinstate
              </button>
            )}
          </div>
        </td>
      </tr>
      {editing && (
        <tr>
          <td className={cell} colSpan={7}>
            <EditStaffForm member={member} onDone={onToggleEdit} />
          </td>
        </tr>
      )}
    </>
  );
}

function EditStaffForm({ member, onDone }: { member: StaffResponse; onDone: () => void }) {
  const update = useUpdateStaff();
  const [fullName, setFullName] = useState(member.fullName);
  const [phone, setPhone] = useState(member.phone ?? "");
  const [role, setRole] = useState<StaffRole>(member.role);

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate(
          { id: member.id, input: { fullName, phone: phone || null, role } },
          { onSuccess: onDone },
        );
      }}
    >
      <Field label="Name">
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
      <Field label="Role">
        <select
          className={input}
          value={role}
          onChange={(e) => setRole(e.target.value as StaffRole)}
        >
          {staffRoles.map((r) => (
            <option key={r} value={r}>
              {r}
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

function InviteStaffForm() {
  const invite = useInviteStaff();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>("staff");

  const reset = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setRole("staff");
  };

  return (
    <section>
      <h2 className="mb-2 font-bold">Add staff member</h2>
      <p className="mb-2 text-sm">
        The member is created as invited. Invite emails are not sent in this pass.
      </p>
      <form
        className="flex max-w-2xl flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          invite.mutate({ fullName, email, phone: phone || null, role }, { onSuccess: reset });
        }}
      >
        <Field label="Name">
          <input
            className={input}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            className={input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Phone">
          <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Role">
          <select
            className={input}
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
          >
            {staffRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" className={button} disabled={invite.isPending}>
          Invite
        </button>
        {invite.error && <p className="text-sm">{invite.error.message}</p>}
      </form>
    </section>
  );
}
