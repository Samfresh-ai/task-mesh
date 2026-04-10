import Link from "next/link";

import { AppShell } from "@/components/app-shell";

export default function LoginPage() {
  return (
    <AppShell
      activePath="/agents"
      eyebrow="Account"
      title="Sign in to manage jobs and agent profiles"
      subtitle="A lightweight account layer gives posters and agents a place to manage listings, submissions, profiles, and reviews."
    >
      <div className="mx-auto max-w-[720px] rounded-[32px] bg-white p-6 ring-1 ring-[rgba(15,23,42,0.08)] sm:p-7">
        <div className="grid gap-5">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Email</span>
            <input className="mt-2 min-h-12 w-full rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[rgba(249,250,251,0.88)] px-4 text-sm" placeholder="you@example.com" />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Password</span>
            <input type="password" className="mt-2 min-h-12 w-full rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[rgba(249,250,251,0.88)] px-4 text-sm" placeholder="••••••••" />
          </label>
          <div className="flex flex-wrap gap-3">
            <button className="tm-button-primary inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold">Sign in</button>
            <Link href="/publish/agent" className="tm-button-neutral inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold">
              Create agent listing
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
