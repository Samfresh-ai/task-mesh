import * as StellarSdk from "@stellar/stellar-sdk";

import type { ClientStellarSigner } from "@x402/stellar";

type ContractAccountSignerInput = {
  accountId: string;
  signerSecret: string;
};

type AuthorizePreparedTransactionInput = {
  accountId: string;
  signerSecret: string;
  networkPassphrase: string;
  transaction: StellarSdk.Transaction;
  validUntilLedger: number;
};

function signerKeypair(secret: string) {
  return StellarSdk.Keypair.fromSecret(secret);
}

export function createContractAccountSigner(input: ContractAccountSignerInput): ClientStellarSigner {
  const keypair = signerKeypair(input.signerSecret);

  return {
    address: input.accountId,
    async signAuthEntry(authEntry) {
      const signature = keypair.sign(StellarSdk.hash(Buffer.from(authEntry, "base64"))).toString("base64");
      return {
        signedAuthEntry: signature,
        signerAddress: input.accountId,
      };
    },
    async signTransaction(xdr, opts) {
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        xdr,
        opts?.networkPassphrase ?? StellarSdk.Networks.TESTNET,
      );
      transaction.sign(keypair);
      return {
        signedTxXdr: transaction.toXDR(),
        signerAddress: input.accountId,
      };
    },
  };
}

async function authorizeEntryForContractAccount(input: {
  entry: StellarSdk.xdr.SorobanAuthorizationEntry;
  accountId: string;
  signerSecret: string;
  networkPassphrase: string;
  validUntilLedger: number;
}) {
  const keypair = signerKeypair(input.signerSecret);

  return StellarSdk.authorizeEntry(
    input.entry,
    async (preimage) => ({
      publicKey: keypair.publicKey(),
      signature: keypair.sign(StellarSdk.hash(preimage.toXDR())),
    }),
    input.validUntilLedger,
    input.networkPassphrase,
  );
}

export async function authorizePreparedContractAccountTransaction(
  input: AuthorizePreparedTransactionInput,
) {
  let signedEntries = 0;

  for (const operation of input.transaction.operations) {
    if (!("auth" in operation) || !operation.auth) {
      continue;
    }

    for (let i = 0; i < operation.auth.length; i += 1) {
      const entry = operation.auth[i];
      if (
        entry.credentials().switch().value !==
        StellarSdk.xdr.SorobanCredentialsType.sorobanCredentialsAddress().value
      ) {
        continue;
      }

      const entryAddress = StellarSdk.Address.fromScAddress(entry.credentials().address().address()).toString();
      if (entryAddress !== input.accountId) {
        continue;
      }

      operation.auth[i] = await authorizeEntryForContractAccount({
        entry,
        accountId: input.accountId,
        signerSecret: input.signerSecret,
        networkPassphrase: input.networkPassphrase,
        validUntilLedger: input.validUntilLedger,
      });
      signedEntries += 1;
    }
  }

  return signedEntries;
}
