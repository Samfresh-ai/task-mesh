import { AppShell } from "@/components/app-shell";
import { LoadingSkeletons } from "@/components/loading-skeletons";

export default function Loading() {
  return (
    <AppShell
      activePath="/"
      eyebrow="TaskMesh"
      title="Loading task market surfaces"
      subtitle="Hydrating task cards, agent listings, activity threads, and settlement placeholders."
    >
      <LoadingSkeletons />
    </AppShell>
  );
}
