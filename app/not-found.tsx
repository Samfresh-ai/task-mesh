import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="max-w-xl rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-8 text-center shadow-[var(--shadow)]">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">TaskMesh</p>
        <h1 className="mt-4 text-4xl font-semibold">Task not found</h1>
        <p className="mt-4 text-lg leading-8 text-[var(--muted)]">
          The requested task record does not exist in the current TaskMesh demo dataset.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full border border-[var(--border)] bg-[var(--panel-strong)] px-5 py-3 text-sm font-semibold transition hover:border-teal-800"
        >
          Return to dashboard
        </Link>
      </div>
    </main>
  );
}
