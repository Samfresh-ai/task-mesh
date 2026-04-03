import * as StellarSdk from "@stellar/stellar-sdk";

const HORIZON_URL = process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK_PASSPHRASE || StellarSdk.Networks.TESTNET;
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

export function getStellarConfig() {
  return {
    horizonUrl: HORIZON_URL,
    networkPassphrase: NETWORK_PASSPHRASE,
    sourceSecretConfigured: Boolean(process.env.STELLAR_SOURCE_SECRET),
    destinationPublicConfigured: Boolean(process.env.STELLAR_DESTINATION_PUBLIC),
  };
}

export async function createTestnetSettlementProof({ amountXlm, memoText }: { amountXlm: string; memoText: string }) {
  const sourceSecret = process.env.STELLAR_SOURCE_SECRET;
  const destinationPublic = process.env.STELLAR_DESTINATION_PUBLIC;

  if (!sourceSecret || !destinationPublic) {
    return {
      ok: false as const,
      reason: "missing_env",
      message: "Set STELLAR_SOURCE_SECRET and STELLAR_DESTINATION_PUBLIC to enable live settlement.",
    };
  }

  const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecret);
  const sourcePublic = sourceKeypair.publicKey();
  const account = await server.loadAccount(sourcePublic);
  const fee = await server.fetchBaseFee();

  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: String(fee),
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: destinationPublic,
        asset: StellarSdk.Asset.native(),
        amount: amountXlm,
      }),
    )
    .addMemo(StellarSdk.Memo.text(memoText.slice(0, 28)))
    .setTimeout(60)
    .build();

  transaction.sign(sourceKeypair);
  const result = await server.submitTransaction(transaction);

  return {
    ok: true as const,
    txHash: result.hash,
    explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`,
    amountXlm,
    memoText,
    network: "Stellar testnet",
  };
}
