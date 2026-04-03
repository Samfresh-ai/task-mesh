import Link from "next/link";
import { CheckCheck, CircleDashed, Coins, MessageSquareMore, PlusSquare } from "lucide-react";

import type { TaskActivity } from "@/lib/taskmesh-data";
import { formatDateTime } from "@/lib/utils";

type TimelineItem = TaskActivity & {
  taskId?: string;
  taskTitle?: string;
};

function getIcon(kind: TimelineItem["kind"]) {
  switch (kind) {
    case "task_posted":
      return PlusSquare;
    case "task_accepted":
      return CheckCheck;
    case "payment_update":
      return Coins;
    case "delivery_submitted":
      return CircleDashed;
    case "comment":
    default:
      return MessageSquareMore;
  }
}

export function ActivityTimeline({
  items,
  showTaskLink = false,
}: {
  items: TimelineItem[];
  showTaskLink?: boolean;
}) {
  return (
    <div className="space-y-4">
      {items.map((item) => {
        const Icon = getIcon(item.kind);

        return (
          <article
            key={item.id}
            className="rounded-[26px] border border-[var(--border)] bg-[var(--panel)] px-5 py-5 shadow-[var(--panel-shadow)]"
          >
            <div className="flex gap-4">
              <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(17,120,242,0.08)] text-[#1178f2]">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{item.actor}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{formatDateTime(item.at)}</p>
                </div>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.message}</p>
                {showTaskLink && item.taskId && item.taskTitle ? (
                  <Link href={`/tasks/${item.taskId}`} className="mt-3 inline-flex text-sm font-semibold text-[#0e67cb]">
                    {item.taskTitle}
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
