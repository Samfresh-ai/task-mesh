export type SettlementProof = {
  network: string;
  amountLabel: string;
  memo: string;
  txHash?: string;
  explorerUrl?: string;
  status: "pending" | "proof_required" | "proof_attached" | "released";
};

export type SettlementAdapter = {
  id: string;
  label: string;
  attachProof(input: {
    amountLabel: string;
    memo: string;
    txHash: string;
    explorerUrl?: string;
  }): SettlementProof;
};
