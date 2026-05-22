//! AutoVerifier ported from Solidity to Stylus (Rust → WASM).
//!
//! Functionally and ABI-identical to `contracts/src/AutoVerifier.sol`. The
//! Lambda that calls `attest` does not need to know which implementation
//! handles its request — both contracts expose the same function selectors,
//! event signatures, custom errors, and storage layout-equivalent getters.
//!
//! Why Stylus: future extensions to the verifier (scorer quorum, on-chain
//! reputation curves, per-requirement scoring) involve more compute than
//! pure storage writes. Stylus runs WASM at near-native speed and prices
//! compute at a fraction of EVM gas, so the v2+ roadmap lives more
//! comfortably here than in Solidity.

#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use alloc::vec::Vec;
use alloy_sol_types::sol;
use stylus_sdk::{
    alloy_primitives::{Address, FixedBytes, U256},
    prelude::*,
};

// Storage layout. Matches the Solidity contract's slot assignment so a
// future implementation could share a state migration path if needed.
sol_storage! {
    #[entrypoint]
    pub struct AutoVerifier {
        /// Wallet authorised to record attestations. Set once at construction.
        address scorer;
        /// taskId → Attestation.
        mapping(uint256 => Attestation) attestations;
    }

    pub struct Attestation {
        address scorer;
        uint16 scoreBps;
        bool passed;
        bytes32 reasoningHash;
        uint64 timestamp;
    }
}

// Event + custom errors. Same wire format as the Solidity contract.
sol! {
    event AttestationRecorded(
        uint256 indexed taskId,
        address indexed scorer,
        uint16 scoreBps,
        bool passed,
        bytes32 reasoningHash
    );

    error NotScorer();
    error AlreadyAttested();
}

#[derive(SolidityError)]
pub enum AutoVerifierError {
    NotScorer(NotScorer),
    AlreadyAttested(AlreadyAttested),
}

#[public]
impl AutoVerifier {
    /// One-shot constructor. Solidity sets `scorer` in the constructor; on
    /// Stylus we expose an `initialize` function called by the deploy script
    /// immediately after deployment, then guard against re-init.
    pub fn initialize(&mut self, scorer: Address) -> Result<(), Vec<u8>> {
        if self.scorer.get() != Address::ZERO {
            return Err(b"already initialised".to_vec());
        }
        self.scorer.set(scorer);
        Ok(())
    }

    /// Returns the registered scorer address. Matches `address public scorer`
    /// auto-generated getter from the Solidity version.
    pub fn scorer(&self) -> Address {
        self.scorer.get()
    }

    /// Records a verdict for `task_id`. Reverts if the caller isn't the
    /// registered scorer or if `task_id` has already been attested.
    pub fn attest(
        &mut self,
        task_id: U256,
        score_bps: u16,
        passed: bool,
        reasoning_hash: FixedBytes<32>,
    ) -> Result<(), AutoVerifierError> {
        let caller = self.vm().msg_sender();
        if caller != self.scorer.get() {
            return Err(AutoVerifierError::NotScorer(NotScorer {}));
        }

        // Capture block timestamp BEFORE we borrow the storage slot, since
        // self.vm() and self.attestations.setter() both want a self ref.
        let now = stylus_sdk::alloy_primitives::U64::from(self.vm().block_timestamp());

        // Scope the mutable storage borrow so the setter is dropped before
        // we re-borrow self to emit the log.
        {
            let mut slot = self.attestations.setter(task_id);
            if !slot.timestamp.get().is_zero() {
                return Err(AutoVerifierError::AlreadyAttested(AlreadyAttested {}));
            }
            slot.scorer.set(caller);
            slot.scoreBps
                .set(stylus_sdk::alloy_primitives::U16::from(score_bps));
            slot.passed.set(passed);
            slot.reasoningHash.set(reasoning_hash);
            slot.timestamp.set(now);
        }

        self.vm().log(AttestationRecorded {
            taskId: task_id,
            scorer: caller,
            scoreBps: score_bps,
            passed,
            reasoningHash: reasoning_hash,
        });

        Ok(())
    }

    /// Mirror of the Solidity public mapping getter:
    /// `attestations(uint256) → (address, uint16, bool, bytes32, uint64)`.
    /// We export the same tuple shape so the ABI-compatible client code
    /// (Lambda, frontend) decodes the result identically.
    pub fn attestations(
        &self,
        task_id: U256,
    ) -> (Address, u16, bool, FixedBytes<32>, u64) {
        let a = self.attestations.getter(task_id);
        (
            a.scorer.get(),
            a.scoreBps.get().to::<u16>(),
            a.passed.get(),
            a.reasoningHash.get(),
            a.timestamp.get().to::<u64>(),
        )
    }

    /// Convenience: true iff `task_id` has an attestation recorded.
    #[selector(name = "hasAttestation")]
    pub fn has_attestation(&self, task_id: U256) -> bool {
        !self.attestations.getter(task_id).timestamp.get().is_zero()
    }
}
