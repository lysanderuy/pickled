"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useMe } from "@/hooks/use-me";

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

  return (
    <aside className="flex w-44 shrink-0 flex-col border-r border-black p-4">
      <p className="mb-4 text-lg font-bold">Pickled</p>
      <nav className="flex flex-col gap-1 text-sm">
        {links.map((link) => {
          if (link.href === "/team" && me?.role !== "owner_admin") return null;
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link key={link.href} href={link.href} className={active ? "font-bold" : undefined}>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <form action="/api/auth/logout" method="post" className="mt-auto pt-6">
        <button type="submit" className="border border-black px-2 py-1 text-sm">
          Sign out
        </button>
      </form>
    </aside>
  );
}
