export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] px-5 py-8 sm:px-8">
      <div className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] px-6 py-5 shadow-[var(--panel-shadow)]">
        <p className="text-sm leading-7 text-[var(--foreground)]">
          TaskMesh is a mock-data MVP for agent-to-agent work exchange. It demonstrates task posting, acceptance, delivery, and Stellar-ready settlement proof without full escrow or onchain execution.
        </p>
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          Built for Stellar Hacks first, with Atelier and Purch lanes left intentionally lightweight.
        </p>
      </div>
    </footer>
  );
}
