#![no_std]

use soroban_sdk::{
    auth::{Context, CustomAccountInterface},
    contract, contracterror, contractimpl, contracttype,
    crypto::Hash,
    panic_with_error, Address, BytesN, Env, Symbol, TryIntoVal, Vec,
};

const TRANSFER_FN: &str = "transfer";

#[contract]
pub struct AgentAccount;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Signers,
    AllowedContracts,
    AllowedRecipients,
    SpendAsset,
    MaxPerAuth,
    DailyCap,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AccSignature {
    pub public_key: BytesN<32>,
    pub signature: BytesN<64>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PolicyConfig {
    pub signers: Vec<BytesN<32>>,
    pub allowed_contracts: Vec<Address>,
    pub allowed_recipients: Vec<Address>,
    pub spend_asset: Address,
    pub max_per_auth: i128,
    pub daily_cap: i128,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum AccError {
    InvalidConfig = 1,
    BadSignatureOrder = 2,
    UnknownSigner = 3,
    UnauthorizedContract = 4,
    UnauthorizedRecipient = 5,
    NegativeAmount = 6,
    SpendLimitExceeded = 7,
    UnsupportedFunction = 8,
    CreateContractDenied = 9,
}

#[contractimpl]
impl AgentAccount {
    pub fn __constructor(
        env: Env,
        signers: Vec<BytesN<32>>,
        allowed_contracts: Vec<Address>,
        allowed_recipients: Vec<Address>,
        spend_asset: Address,
        max_per_auth: i128,
        daily_cap: i128,
    ) {
        if signers.is_empty()
            || spend_asset == env.current_contract_address()
            || max_per_auth <= 0
            || daily_cap <= 0
            || max_per_auth > daily_cap
        {
            panic_with_error!(&env, AccError::InvalidConfig);
        }

        env.storage().instance().set(&DataKey::Signers, &signers);
        env.storage()
            .instance()
            .set(&DataKey::AllowedContracts, &allowed_contracts);
        env.storage()
            .instance()
            .set(&DataKey::AllowedRecipients, &allowed_recipients);
        env.storage().instance().set(&DataKey::SpendAsset, &spend_asset);
        env.storage().instance().set(&DataKey::MaxPerAuth, &max_per_auth);
        env.storage().instance().set(&DataKey::DailyCap, &daily_cap);
    }

    pub fn policy(env: Env) -> PolicyConfig {
        PolicyConfig {
            signers: get_signers(&env),
            allowed_contracts: get_allowed_contracts(&env),
            allowed_recipients: get_allowed_recipients(&env),
            spend_asset: get_spend_asset(&env),
            max_per_auth: get_i128(&env, &DataKey::MaxPerAuth),
            daily_cap: get_i128(&env, &DataKey::DailyCap),
        }
    }
}

#[contractimpl]
impl CustomAccountInterface for AgentAccount {
    type Signature = Vec<AccSignature>;
    type Error = AccError;

    #[allow(non_snake_case)]
    fn __check_auth(
        env: Env,
        signature_payload: Hash<32>,
        signatures: Self::Signature,
        auth_contexts: Vec<Context>,
    ) -> Result<(), Self::Error> {
        authenticate(&env, &signature_payload, &signatures)?;
        let daily_cap = get_i128(&env, &DataKey::DailyCap);
        let mut batch_spend = 0_i128;

        for context in auth_contexts.iter() {
            batch_spend += verify_authorization_policy(&env, &context)?;
            if batch_spend > daily_cap {
                return Err(AccError::SpendLimitExceeded);
            }
        }

        Ok(())
    }
}

fn authenticate(
    env: &Env,
    signature_payload: &Hash<32>,
    signatures: &Vec<AccSignature>,
) -> Result<(), AccError> {
    let signers = get_signers(env);

    for i in 0..signatures.len() {
        let signature = signatures.get_unchecked(i);
        if i > 0 {
            let prev_signature = signatures.get_unchecked(i - 1);
            if prev_signature.public_key >= signature.public_key {
                return Err(AccError::BadSignatureOrder);
            }
        }

        if !contains_public_key(&signers, &signature.public_key) {
            return Err(AccError::UnknownSigner);
        }

        env.crypto().ed25519_verify(
            &signature.public_key,
            &signature_payload.clone().into(),
            &signature.signature,
        );
    }

    Ok(())
}

fn verify_authorization_policy(env: &Env, context: &Context) -> Result<i128, AccError> {
    let contract_context = match context {
        Context::Contract(contract_context) => contract_context,
        Context::CreateContractHostFn(_) | Context::CreateContractWithCtorHostFn(_) => {
            return Err(AccError::CreateContractDenied);
        }
    };

    let spend_asset = get_spend_asset(env);
    if contract_context.contract == spend_asset {
        if contract_context.fn_name != Symbol::new(env, TRANSFER_FN) {
            return Err(AccError::UnsupportedFunction);
        }

        let recipient: Address = contract_context
            .args
            .get(1)
            .unwrap()
            .try_into_val(env)
            .unwrap();
        if !contains_address(&get_allowed_recipients(env), &recipient) {
            return Err(AccError::UnauthorizedRecipient);
        }

        let amount: i128 = contract_context
            .args
            .get(2)
            .unwrap()
            .try_into_val(env)
            .unwrap();
        if amount < 0 {
            return Err(AccError::NegativeAmount);
        }

        let max_per_auth = get_i128(env, &DataKey::MaxPerAuth);
        if amount > max_per_auth {
            return Err(AccError::SpendLimitExceeded);
        }

        return Ok(amount);
    }

    if contains_address(&get_allowed_contracts(env), &contract_context.contract) {
        return Ok(0);
    }

    Err(AccError::UnauthorizedContract)
}

fn contains_public_key(signers: &Vec<BytesN<32>>, expected: &BytesN<32>) -> bool {
    for i in 0..signers.len() {
        if signers.get_unchecked(i) == *expected {
            return true;
        }
    }
    false
}

fn contains_address(values: &Vec<Address>, expected: &Address) -> bool {
    for i in 0..values.len() {
        if values.get_unchecked(i) == *expected {
            return true;
        }
    }
    false
}

fn get_signers(env: &Env) -> Vec<BytesN<32>> {
    env.storage()
        .instance()
        .get(&DataKey::Signers)
        .unwrap_or_else(|| panic_with_error!(env, AccError::InvalidConfig))
}

fn get_allowed_contracts(env: &Env) -> Vec<Address> {
    env.storage()
        .instance()
        .get(&DataKey::AllowedContracts)
        .unwrap_or_else(|| Vec::new(env))
}

fn get_allowed_recipients(env: &Env) -> Vec<Address> {
    env.storage()
        .instance()
        .get(&DataKey::AllowedRecipients)
        .unwrap_or_else(|| Vec::new(env))
}

fn get_spend_asset(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::SpendAsset)
        .unwrap_or_else(|| panic_with_error!(env, AccError::InvalidConfig))
}

fn get_i128(env: &Env, key: &DataKey) -> i128 {
    env.storage()
        .instance()
        .get(key)
        .unwrap_or_else(|| panic_with_error!(env, AccError::InvalidConfig))
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod test {
    use super::*;
    use ed25519_dalek::{Signer as _, SigningKey};
    use rand::rngs::OsRng;
    use soroban_sdk::{testutils::Address as _, vec, IntoVal, Val};

    fn signing_key() -> SigningKey {
        SigningKey::generate(&mut OsRng)
    }

    fn public_key_bytes(env: &Env, signing_key: &SigningKey) -> BytesN<32> {
        signing_key.verifying_key().to_bytes().into_val(env)
    }

    fn sign(env: &Env, signing_key: &SigningKey, payload: &BytesN<32>) -> Val {
        let signature = signing_key.sign(payload.to_array().as_slice()).to_bytes();
        AccSignature {
            public_key: public_key_bytes(env, signing_key),
            signature: signature.into_val(env),
        }
        .into_val(env)
    }

    fn transfer_context(env: &Env, token: &Address, from: &Address, to: &Address, amount: i128) -> Context {
        Context::Contract(soroban_sdk::auth::ContractContext {
            contract: token.clone(),
            fn_name: Symbol::new(env, TRANSFER_FN),
            args: (from.clone(), to.clone(), amount).into_val(env),
        })
    }

    fn payload(env: &Env, seed: u8) -> BytesN<32> {
        BytesN::from_array(env, &[seed; 32])
    }

    #[test]
    fn allows_contract_and_allowlisted_transfer() {
        let env = Env::default();
        let signer = signing_key();
        let bounty_board = Address::generate(&env);
        let reviewer = Address::generate(&env);
        let token = Address::generate(&env);
        let account_id = env.register(
            AgentAccount,
            (
                vec![&env, public_key_bytes(&env, &signer)],
                vec![&env, bounty_board.clone()],
                vec![&env, reviewer.clone()],
                token.clone(),
                100_i128,
                100_i128,
            ),
        );

        let payload_bytes = payload(&env, 1);
        env.try_invoke_contract_check_auth::<AccError>(
            &account_id,
            &payload_bytes,
            vec![&env, sign(&env, &signer, &payload_bytes)].into(),
            &vec![
                &env,
                Context::Contract(soroban_sdk::auth::ContractContext {
                    contract: bounty_board,
                    fn_name: Symbol::new(&env, "accept_bounty"),
                    args: Vec::<Val>::new(&env),
                }),
                transfer_context(&env, &token, &account_id, &reviewer, 2),
            ],
        )
        .unwrap();
    }

    #[test]
    fn rejects_unauthorized_recipient() {
        let env = Env::default();
        let signer = signing_key();
        let reviewer = Address::generate(&env);
        let intruder = Address::generate(&env);
        let token = Address::generate(&env);
        let account_id = env.register(
            AgentAccount,
            (
                vec![&env, public_key_bytes(&env, &signer)],
                Vec::<Address>::new(&env),
                vec![&env, reviewer],
                token.clone(),
                100_i128,
                100_i128,
            ),
        );

        let payload_bytes = payload(&env, 2);
        assert_eq!(
            env.try_invoke_contract_check_auth::<AccError>(
                &account_id,
                &payload_bytes,
                vec![&env, sign(&env, &signer, &payload_bytes)].into(),
                &vec![&env, transfer_context(&env, &token, &account_id, &intruder, 2)],
            )
            .err()
            .unwrap()
            .unwrap(),
            AccError::UnauthorizedRecipient
        );
    }

    #[test]
    fn rejects_daily_cap_exhaustion() {
        let env = Env::default();
        let signer = signing_key();
        let reviewer = Address::generate(&env);
        let token = Address::generate(&env);
        let account_id = env.register(
            AgentAccount,
            (
                vec![&env, public_key_bytes(&env, &signer)],
                Vec::<Address>::new(&env),
                vec![&env, reviewer.clone()],
                token.clone(),
                4_i128,
                5_i128,
            ),
        );

        let payload_bytes = payload(&env, 3);
        assert_eq!(
            env.try_invoke_contract_check_auth::<AccError>(
                &account_id,
                &payload_bytes,
                vec![&env, sign(&env, &signer, &payload_bytes)].into(),
                &vec![
                    &env,
                    transfer_context(&env, &token, &account_id, &reviewer, 3),
                    transfer_context(&env, &token, &account_id, &reviewer, 3),
                ],
            )
            .err()
            .unwrap()
            .unwrap(),
            AccError::SpendLimitExceeded
        );
    }
}
