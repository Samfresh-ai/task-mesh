import { getActivityView, getDashboardView, getMarketDetailView, getMarketsOverviewView, getSignalsView } from "@/server/intel";
import { GET as getSummary } from "@/app/api/summary/route";
import { GET as getMarkets } from "@/app/api/markets/route";
import { GET as getMarket } from "@/app/api/markets/[id]/route";
import { GET as getEvidence } from "@/app/api/markets/[id]/evidence/route";
import { GET as getSignal } from "@/app/api/markets/[id]/signal/route";

async function main() {
  const dashboard = await getDashboardView();
  if (!dashboard.markets.length) {
    throw new Error("No markets returned by dashboard view");
  }

  const marketId = dashboard.markets[0].id;
  const marketsOverview = await getMarketsOverviewView();
  const signalsView = await getSignalsView();
  const activityView = await getActivityView();
  const marketDetail = await getMarketDetailView(marketId);

  if (!marketDetail) {
    throw new Error(`Market detail missing for ${marketId}`);
  }

  const summaryRes = await getSummary();
  const marketsRes = await getMarkets();
  const marketRes = await getMarket(new Request(`http://localhost/api/markets/${marketId}`), {
    params: Promise.resolve({ id: marketId }),
  });
  const evidenceRes = await getEvidence(new Request(`http://localhost/api/markets/${marketId}/evidence`), {
    params: Promise.resolve({ id: marketId }),
  });
  const signalRes = await getSignal(new Request(`http://localhost/api/markets/${marketId}/signal`), {
    params: Promise.resolve({ id: marketId }),
  });

  const [summaryJson, marketsJson, marketJson, evidenceJson, signalJson] = await Promise.all([
    summaryRes.json(),
    marketsRes.json(),
    marketRes.json(),
    evidenceRes.json(),
    signalRes.json(),
  ]);

  console.log(
    JSON.stringify(
      {
        dashboardMarkets: dashboard.markets.length,
        dashboardOpportunities: dashboard.opportunities.length,
        overviewMarkets: marketsOverview.markets.length,
        signalsListed: signalsView.signals.length,
        activityItems: activityView.activity.length,
        marketDetailState: marketDetail.market.scanState,
        summaryMarketCount: summaryJson.stats?.monitoredMarkets ?? null,
        apiMarketsCount: Array.isArray(marketsJson.markets) ? marketsJson.markets.length : null,
        apiMarketId: marketJson.market?.id ?? null,
        apiEvidenceCount: Array.isArray(evidenceJson.evidence) ? evidenceJson.evidence.length : null,
        apiSignalStatus: signalJson.signal?.status ?? null,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
