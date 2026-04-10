import type { ReactNode } from "react";

import { SidebarNav } from "@/components/sidebar-nav";
import { SiteFooter } from "@/components/site-footer";

export function AppShell({
  activePath,
  title,
  eyebrow,
  subtitle,
  children,
  actionsSlot,
  statusSlot,
}: {
  activePath: string;
  title: string;
  eyebrow: string;
  subtitle: string;
  children: ReactNode;
  actionsSlot?: ReactNode;
  statusSlot?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(17,120,242,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(15,159,110,0.12),transparent_24%),radial-gradient(circle_at_center,rgba(249,115,22,0.06),transparent_34%)]" />
      <div className="relative min-h-screen">
        <SidebarNav activePath={activePath} />
        <main className="mx-auto w-full max-w-[1240px] px-5 py-6 sm:px-8 sm:py-8">
          <section className="rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.84)] px-5 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:px-7 sm:py-7">
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">{eyebrow}</p>
            <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-4xl">
                <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--foreground-strong)] sm:text-[2.8rem]">{title}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">{subtitle}</p>
              </div>
              <div className="flex w-full flex-col gap-4 xl:w-auto xl:min-w-[320px] xl:items-end">
                {actionsSlot ? <div className="flex w-full flex-wrap gap-3 xl:justify-end">{actionsSlot}</div> : null}
                {statusSlot}
              </div>
            </div>
          </section>
          <div className="py-6 sm:py-8">{children}</div>
          <SiteFooter />
        </main>
      </div>
    </div>
  );
}
