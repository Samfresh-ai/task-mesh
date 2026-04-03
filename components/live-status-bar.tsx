"use client";

import { Activity, Bot, ShieldCheck, Wallet } from "lucide-react";
import { useMemo } from "react";

import { getDashboardData, getTasks } from "@/lib/taskmesh-data";
import { cn, formatRelativeTime } from "@/lib/utils";

export function LiveStatusBar() {
  const dashboard = getDashboardData();
  const tasks = getTasks();

  const syncLabel = useMemo(() => {
    const latest = tasks
      .flatMap((task) => [task.updatedAt, ...task.activity.map((item) => item.at)])
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
    return latest ? `${formatRelativeTime(latest)} latest update` : "No activity yet";
  }, [tasks]);

  const cards = [
    {
      icon: Activity,
      label: "Open loop",
      value: `${dashboard.stats.openTasks} open tasks`,
      meta: `${dashboard.stats.activeTasks} in progress • ${dashboard.stats.deliveredTasks} delivered`,
      progress: dashboard.stats.totalTasks === 0 ? 0 : (dashboard.stats.openTasks + dashboard.stats.activeTasks) / dashboard.stats.totalTasks,
      accent: "from-cyan-400/80 to-sky-300/70",
    },
    {
      icon: Bot,
      label: "Agent liquidity",
      value: `${dashboard.stats.availableAgents} agents available`,
      meta: `${dashboard.stats.busyAgents} busy • directory live`,
      progress: (dashboard.stats.availableAgents + dashboard.stats.busyAgents) === 0 ? 0 : dashboard.stats.availableAgents / (dashboard.stats.availableAgents + dashboard.stats.busyAgents),
      accent: "from-emerald-400/80 to-teal-300/70",
    },
    {
      icon: Wallet,
      label: "Settlement",
      value: `${dashboard.stats.settledTasks} released`,
      meta: `${dashboard.stats.deliveredTasks} waiting proof • Stellar testnet surface`,
      progress: dashboard.stats.totalTasks === 0 ? 0 : dashboard.stats.settledTasks / dashboard.stats.totalTasks,
      accent: "from-amber-300/80 to-orange-300/70",
    },
    {
      icon: ShieldCheck,
      label: "MVP scope",
      value: `${dashboard.stats.totalRewards} XLM mocked`,
      meta: "Tight loop only • no escrow or orchestration",
      progress: 0.76,
      accent: "from-violet-400/80 to-cyan-300/70",
    },
  ];

  return (
    <div className="border-b border-[var(--border)] bg-[rgba(255,255,255,0.78)] px-5 py-4 backdrop-blur sm:px-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
        <div className="flex items-center gap-3">
          <span className={cn("inline-flex h-2.5 w-2.5 rounded-full status-pulse bg-emerald-300")} />
          <span>Mocked market loop live</span>
        </div>
        <span>{syncLabel}</span>
      </div>
      <div className="grid gap-3 xl:grid-cols-4">
        {cards.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="group rounded-[26px] border border-[var(--border)] bg-[var(--panel)] px-4 py-4 transition duration-300 hover:border-[rgba(17,32,51,0.14)] hover:bg-[rgba(255,255,255,0.94)]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(17,120,242,0.08)] text-[#1178f2] shadow-[inset_0_0_0_1px_rgba(17,120,242,0.06)]">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
                </div>
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{item.meta}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(17,32,51,0.08)]">
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r transition-[width] duration-700", item.accent)}
                  style={{ width: `${Math.max(item.progress * 100, 8)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
