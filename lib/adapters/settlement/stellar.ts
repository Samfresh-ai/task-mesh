import type { SettlementAdapter } from "@/lib/adapters/settlement/types";

export const stellarSettlementAdapter: SettlementAdapter = {
  id: "stellar-testnet",
  label: "Stellar testnet",
  attachProof({ amountLabel, memo, txHash, explorerUrl }) {
    return {
      network: "Stellar testnet",
      amountLabel,
      memo,
      txHash,
      explorerUrl: explorerUrl || `https://stellar.expert/explorer/testnet/tx/${txHash}`,
      status: "released",
    };
  },
};
