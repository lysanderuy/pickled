"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useMe } from "@/hooks/use-me";
import { staffRoleLabels } from "@/validators/staff.validator";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/bookings", label: "Bookings" },
  { href: "/calendar", label: "Calendar" },
  { href: "/courts", label: "Courts" },
  { href: "/rates", label: "Rates" },
  { href: "/customers", label: "Customers" },
  { href: "/recurring-bookings", label: "Recurring" },
  { href: "/sales", label: "Sales" },
  { href: "/team", label: "Team" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();
  const { data: me } = useMe();
  const firstName = me?.fullName.split(" ")[0] ?? "";

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-white p-4">
      <p className="mb-6 border-b border-neutral-200 pb-4 text-[24px] font-bold tracking-tight">
        Pickled
      </p>
      <nav className="flex flex-col gap-1 text-[14px] font-medium">
        {links.map((link) => {
          if (link.href === "/team" && me?.role !== "owner_admin") return null;
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                active
                  ? "rounded-md bg-neutral-900 px-3 py-2 text-white"
                  : "rounded-md px-3 py-2 text-neutral-700 hover:bg-neutral-100"
              }
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-neutral-200 pt-3">
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            title="Sign out"
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-neutral-100"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-medium text-neutral-700">
              {firstName.slice(0, 1).toUpperCase()}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[10px] font-medium tracking-wide text-neutral-400 uppercase">
                {me?.role ? staffRoleLabels[me.role] : ""}
              </span>
              <span className="truncate text-[12px] text-neutral-700">{firstName}</span>
            </span>
          </button>
        </form>
      </div>
    </aside>
  );
}
