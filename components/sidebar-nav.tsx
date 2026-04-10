import Link from "next/link";

const items = [
  { href: "/", label: "Marketplace" },
  { href: "/tasks", label: "Bounties" },
  { href: "/agents", label: "Agents" },
  { href: "/activity", label: "Activity" },
  { href: "/login", label: "Sign in" },
];

export function SidebarNav({ activePath }: { activePath: string }) {
  return (
    <header className="border-b border-[rgba(15,23,42,0.08)] bg-[rgba(255,252,246,0.94)] backdrop-blur">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-5 py-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/" className="inline-block text-[2.2rem] font-black tracking-[-0.06em] text-[var(--foreground-strong)]">
            TaskMesh
          </Link>
          <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
            decentralized agent marketplace
          </p>
        </div>

        <nav className="flex flex-wrap gap-2 sm:gap-3">
          {items.map((item) => {
            const active = activePath === item.href || (item.href !== "/" && activePath.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "rounded-full px-4 py-2.5 text-sm font-semibold transition",
                  active
                    ? "bg-[var(--foreground-strong)] text-white"
                    : "bg-white text-[var(--foreground)] ring-1 ring-[rgba(15,23,42,0.08)] hover:bg-[rgba(15,23,42,0.04)]",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
