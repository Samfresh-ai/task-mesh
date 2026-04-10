#![no_std]

use soroban_sdk::{
    auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation},
    contract, contracterror, contractimpl, contracttype, panic_with_error, token, Address, Env,
    IntoVal, String, Symbol, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    BountyNotFound = 1,
    InvalidRewardAmount = 2,
    InvalidState = 3,
    WorkerAlreadyAssigned = 4,
    Unauthorized = 5,
    InvalidMetadata = 6,
    InvalidProof = 7,
    InvalidReason = 8,
    InvalidPayoutReference = 9,
    WorkerCannotBePoster = 10,
    SubmissionAlreadyExists = 11,
    PayoutAlreadyRecorded = 12,
    EscrowNotFunded = 13,
    EscrowAlreadyReleased = 14,
    EscrowAlreadyRefunded = 15,
    EscrowInvariantBroken = 16,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BountyStatus {
    Open,
    Accepted,
    Submitted,
    Paid,
    Canceled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WorkSubmission {
    pub proof: String,
    pub submitted_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PayoutReceipt {
    pub released_by: Address,
    pub released_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SubmissionRecord {
    None,
    Submitted(WorkSubmission),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PayoutRecord {
    None,
    Released(PayoutReceipt),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowLedger {
    pub funded: bool,
    pub funded_at: u64,
    pub released: bool,
    pub released_at: Option<u64>,
    pub refunded: bool,
    pub refunded_at: Option<u64>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Bounty {
    pub id: u32,
    pub poster: Address,
    pub description: String,
    pub reward: i128,
    pub asset: Address,
    pub deadline: u64,
    pub status: BountyStatus,
    pub worker: Option<Address>,
    pub submission: SubmissionRecord,
    pub payout: PayoutRecord,
    pub escrow: EscrowLedger,
    pub accepted_at: Option<u64>,
    pub created_at: u64,
    pub updated_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    NextBountyId,
    BountyById(u32),
}

#[contract]
pub struct BountyBoard;

#[contractimpl]
impl BountyBoard {
    // Escrow semantics:
    // - create_bounty transfers tokens from the poster into this contract's balance before state is stored
    // - accept_bounty reserves a single worker while funds stay locked
    // - submit_work records exactly one proof package for the accepted worker
    // - verify_and_payout releases the escrowed balance to the worker exactly once
    // - cancel_bounty refunds the poster only while the bounty is still open

    pub fn create_bounty(
        env: Env,
        poster: Address,
        description: String,
        reward: i128,
        asset: Address,
        deadline: u64,
    ) -> u32 {
        poster.require_auth();
        require_non_empty(&env, &description, Error::InvalidMetadata);

        if reward <= 0 {
            panic_with_error!(&env, Error::InvalidRewardAmount);
        }

        let bounty_id = next_bounty_id(&env);
        let now = env.ledger().timestamp();

        transfer_into_escrow(&env, &asset, &poster, reward);

        let bounty = Bounty {
            id: bounty_id,
            poster: poster.clone(),
            description,
            reward,
            asset: asset.clone(),
            deadline,
            status: BountyStatus::Open,
            worker: None,
            submission: SubmissionRecord::None,
            payout: PayoutRecord::None,
            escrow: EscrowLedger {
                funded: true,
                funded_at: now,
                released: false,
                released_at: None,
                refunded: false,
                refunded_at: None,
            },
            accepted_at: None,
            created_at: now,
            updated_at: now,
        };

        set_bounty(&env, &bounty);
        env.events().publish(
            (Symbol::new(&env, "bounty"), Symbol::new(&env, "create")),
            (bounty_id, poster, asset, reward, deadline),
        );

        bounty_id
    }

    pub fn accept_bounty(env: Env, bounty_id: u32, worker: Address) {
        worker.require_auth();

        let mut bounty = get_bounty(&env, bounty_id);
        require_escrow_funded(&env, &bounty);

        if bounty.status != BountyStatus::Open {
            panic_with_error!(&env, Error::InvalidState);
        }
        if bounty.worker.is_some() {
            panic_with_error!(&env, Error::WorkerAlreadyAssigned);
        }
        if worker == bounty.poster {
            panic_with_error!(&env, Error::WorkerCannotBePoster);
        }

        let accepted_at = env.ledger().timestamp();
        bounty.status = BountyStatus::Accepted;
        bounty.worker = Some(worker.clone());
        bounty.accepted_at = Some(accepted_at);
        bounty.updated_at = accepted_at;

        set_bounty(&env, &bounty);
        env.events().publish(
            (Symbol::new(&env, "bounty"), Symbol::new(&env, "accept")),
            (bounty_id, worker),
        );
    }

    pub fn submit_work(
        env: Env,
        bounty_id: u32,
        proof: String,
    ) {
        require_non_empty(&env, &proof, Error::InvalidProof);

        let mut bounty = get_bounty(&env, bounty_id);
        require_escrow_funded(&env, &bounty);

        if bounty.status != BountyStatus::Accepted {
            panic_with_error!(&env, Error::InvalidState);
        }
        if has_submission(&bounty) {
            panic_with_error!(&env, Error::SubmissionAlreadyExists);
        }

        let worker = bounty
            .worker
            .clone()
            .unwrap_or_else(|| panic_with_error!(&env, Error::EscrowInvariantBroken));
        worker.require_auth();

        let submitted_at = env.ledger().timestamp();
        bounty.status = BountyStatus::Submitted;
        bounty.submission = SubmissionRecord::Submitted(WorkSubmission {
            proof: proof.clone(),
            submitted_at,
        });
        bounty.updated_at = submitted_at;

        set_bounty(&env, &bounty);
        env.events().publish(
            (Symbol::new(&env, "bounty"), Symbol::new(&env, "submit")),
            (bounty_id, worker, proof),
        );
    }

    pub fn verify_and_payout(env: Env, bounty_id: u32, approver: Address) {
        approver.require_auth();

        let mut bounty = get_bounty(&env, bounty_id);
        require_escrow_funded(&env, &bounty);

        if bounty.status != BountyStatus::Submitted {
            panic_with_error!(&env, Error::InvalidState);
        }
        if bounty.poster != approver {
            panic_with_error!(&env, Error::Unauthorized);
        }
        if has_payout(&bounty) {
            panic_with_error!(&env, Error::PayoutAlreadyRecorded);
        }
        if !has_submission(&bounty) {
            panic_with_error!(&env, Error::EscrowInvariantBroken);
        }
        if bounty.escrow.released {
            panic_with_error!(&env, Error::EscrowAlreadyReleased);
        }
        if bounty.escrow.refunded {
            panic_with_error!(&env, Error::EscrowInvariantBroken);
        }

        let released_at = env.ledger().timestamp();
        let worker = bounty
            .worker
            .clone()
            .unwrap_or_else(|| panic_with_error!(&env, Error::EscrowInvariantBroken));

        transfer_out_of_escrow(&env, &bounty.asset, &worker, bounty.reward);

        bounty.status = BountyStatus::Paid;
        bounty.payout = PayoutRecord::Released(PayoutReceipt {
            released_by: approver.clone(),
            released_at,
        });
        bounty.escrow.released = true;
        bounty.escrow.released_at = Some(released_at);
        bounty.updated_at = released_at;

        set_bounty(&env, &bounty);
        env.events().publish(
            (Symbol::new(&env, "bounty"), Symbol::new(&env, "payout")),
            (bounty_id, approver, worker, bounty.reward),
        );
    }

    pub fn cancel_bounty(env: Env, bounty_id: u32) {
        let mut bounty = get_bounty(&env, bounty_id);
        require_escrow_funded(&env, &bounty);
        let poster = bounty.poster.clone();
        poster.require_auth();

        if bounty.status != BountyStatus::Open {
            panic_with_error!(&env, Error::InvalidState);
        }
        if bounty.escrow.released {
            panic_with_error!(&env, Error::EscrowInvariantBroken);
        }
        if bounty.escrow.refunded {
            panic_with_error!(&env, Error::EscrowAlreadyRefunded);
        }

        let refunded_at = env.ledger().timestamp();
        transfer_out_of_escrow(&env, &bounty.asset, &poster, bounty.reward);

        bounty.status = BountyStatus::Canceled;
        bounty.escrow.refunded = true;
        bounty.escrow.refunded_at = Some(refunded_at);
        bounty.updated_at = refunded_at;

        set_bounty(&env, &bounty);
        env.events().publish(
            (Symbol::new(&env, "bounty"), Symbol::new(&env, "cancel")),
            (bounty_id, poster),
        );
    }

    pub fn get_bounty(env: Env, bounty_id: u32) -> Bounty {
        get_bounty(&env, bounty_id)
    }
}

fn next_bounty_id(env: &Env) -> u32 {
    let current = env
        .storage()
        .persistent()
        .get::<_, u32>(&DataKey::NextBountyId)
        .unwrap_or(0);
    let next = current + 1;
    env.storage().persistent().set(&DataKey::NextBountyId, &next);
    next
}

fn get_bounty(env: &Env, bounty_id: u32) -> Bounty {
    env.storage()
        .persistent()
        .get::<_, Bounty>(&DataKey::BountyById(bounty_id))
        .unwrap_or_else(|| panic_with_error!(env, Error::BountyNotFound))
}

fn set_bounty(env: &Env, bounty: &Bounty) {
    env.storage()
        .persistent()
        .set(&DataKey::BountyById(bounty.id), bounty);
}

fn require_non_empty(env: &Env, value: &String, error: Error) {
    if value.len() == 0 {
        panic_with_error!(env, error);
    }
}

fn require_escrow_funded(env: &Env, bounty: &Bounty) {
    if !bounty.escrow.funded {
        panic_with_error!(env, Error::EscrowNotFunded);
    }
}

fn has_submission(bounty: &Bounty) -> bool {
    matches!(bounty.submission, SubmissionRecord::Submitted(_))
}

fn has_payout(bounty: &Bounty) -> bool {
    matches!(bounty.payout, PayoutRecord::Released(_))
}

fn transfer_into_escrow(env: &Env, token_address: &Address, from: &Address, amount: i128) {
    let client = token::Client::new(env, token_address);
    client.transfer(from, &env.current_contract_address(), &amount);
}

fn transfer_out_of_escrow(env: &Env, token_address: &Address, to: &Address, amount: i128) {
    let contract_address = env.current_contract_address();
    let mut auth_entries: Vec<InvokerContractAuthEntry> = Vec::new(env);

    auth_entries.push_back(InvokerContractAuthEntry::Contract(SubContractInvocation {
        context: ContractContext {
            contract: token_address.clone(),
            fn_name: Symbol::new(env, "transfer"),
            args: (contract_address.clone(), to.clone(), amount).into_val(env),
        },
        sub_invocations: Vec::new(env),
    }));

    env.authorize_as_current_contract(auth_entries);

    let client = token::Client::new(env, token_address);
    client.transfer(&contract_address, to, &amount);
}

#[cfg(test)]
extern crate std;

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        token::{Client as TokenClient, StellarAssetClient},
        Address, Env,
    };

    fn install_token(env: &Env) -> (Address, TokenClient<'_>, StellarAssetClient<'_>) {
        let admin = Address::generate(env);
        let token_address = env.register_stellar_asset_contract_v2(admin.clone()).address();
        let token_client = TokenClient::new(env, &token_address);
        let token_admin = StellarAssetClient::new(env, &token_address);

        (token_address, token_client, token_admin)
    }

    #[test]
    fn full_lifecycle_locks_and_pays_escrow() {
        let env = Env::default();
        env.mock_all_auths();

        let (token_address, token_client, token_admin) = install_token(&env);
        let poster = Address::generate(&env);
        let worker = Address::generate(&env);
        let contract_id = env.register(BountyBoard, ());
        let client = BountyBoardClient::new(&env, &contract_id);

        token_admin.mint(&poster, &1_000);

        let bounty_id = client.create_bounty(
            &poster,
            &String::from_str(&env, "Ship the Soroban-native escrow flow"),
            &500,
            &token_address,
            &1_725_310_800,
        );

        assert_eq!(bounty_id, 1);
        assert_eq!(token_client.balance(&poster), 500);
        assert_eq!(token_client.balance(&contract_id), 500);

        client.accept_bounty(&bounty_id, &worker);
        client.submit_work(&bounty_id, &String::from_str(&env, "https://example.com/taskmesh/proof"));
        client.verify_and_payout(&bounty_id, &poster);

        let bounty = client.get_bounty(&bounty_id);

        assert_eq!(bounty.status, BountyStatus::Paid);
        assert_eq!(bounty.worker, Some(worker.clone()));
        assert!(matches!(
            bounty.submission,
            SubmissionRecord::Submitted(_)
        ));
        assert!(matches!(bounty.payout, PayoutRecord::Released(_)));
        assert!(bounty.escrow.released);
        assert_eq!(token_client.balance(&contract_id), 0);
        assert_eq!(token_client.balance(&worker), 500);
    }

    #[test]
    fn cancel_refunds_open_bounty() {
        let env = Env::default();
        env.mock_all_auths();

        let (token_address, token_client, token_admin) = install_token(&env);
        let poster = Address::generate(&env);
        let contract_id = env.register(BountyBoard, ());
        let client = BountyBoardClient::new(&env, &contract_id);

        token_admin.mint(&poster, &750);

        let bounty_id = client.create_bounty(
            &poster,
            &String::from_str(&env, "Cancelable bounty"),
            &300,
            &token_address,
            &1_725_310_800,
        );

        assert_eq!(token_client.balance(&poster), 450);
        assert_eq!(token_client.balance(&contract_id), 300);

        client.cancel_bounty(&bounty_id);

        let bounty = client.get_bounty(&bounty_id);

        assert_eq!(bounty.status, BountyStatus::Canceled);
        assert!(bounty.escrow.refunded);
        assert_eq!(token_client.balance(&contract_id), 0);
        assert_eq!(token_client.balance(&poster), 750);
    }
}
