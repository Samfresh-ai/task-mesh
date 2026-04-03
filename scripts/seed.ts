import { runFullPipeline } from "../server/jobs/service";

async function main() {
  const result = await runFullPipeline();
  console.log("Seed complete:", result);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
