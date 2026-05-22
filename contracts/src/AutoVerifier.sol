// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AutoVerifier
/// @notice Records an off-chain AI scorer's verdict on a completed task.
/// @dev v1: a single immutable scorer address attests at most once per task.
///      The verdict is advisory. The poster still calls release/refund on
///      the escrow themselves after reading the verdict in the UI.
///      v2 roadmap: scorer quorum, challenge windows, optimistic release.
contract AutoVerifier {
    /// @notice The wallet authorized to record attestations.
    address public immutable scorer;

    struct Attestation {
        address scorer;
        uint16  scoreBps;       // 0..10000, e.g. 9456 = 94.56%
        bool    passed;
        bytes32 reasoningHash;  // keccak256 of the full reasoning text stored off-chain
        uint64  timestamp;
    }

    /// @notice Keyed by the escrow's taskId. Defaults to a zero struct when absent.
    mapping(uint256 => Attestation) public attestations;

    event AttestationRecorded(
        uint256 indexed taskId,
        address indexed scorer,
        uint16  scoreBps,
        bool    passed,
        bytes32 reasoningHash
    );

    error NotScorer();
    error AlreadyAttested();

    constructor(address scorer_) {
        scorer = scorer_;
    }

    /// @notice Record a verdict for a task. Callable only by the registered scorer.
    /// @param taskId         The escrow's taskId being attested.
    /// @param scoreBps       Quality score in basis points (0..10000).
    /// @param passed         True if the report meets the task's success criteria.
    /// @param reasoningHash  keccak256 of the off-chain reasoning text, for tamper-evidence.
    function attest(
        uint256 taskId,
        uint16 scoreBps,
        bool passed,
        bytes32 reasoningHash
    ) external {
        if (msg.sender != scorer) revert NotScorer();
        if (attestations[taskId].timestamp != 0) revert AlreadyAttested();

        attestations[taskId] = Attestation({
            scorer:         msg.sender,
            scoreBps:       scoreBps,
            passed:         passed,
            reasoningHash:  reasoningHash,
            timestamp:      uint64(block.timestamp)
        });

        emit AttestationRecorded(taskId, msg.sender, scoreBps, passed, reasoningHash);
    }

    /// @notice Convenience getter: returns true iff an attestation has been recorded for taskId.
    function hasAttestation(uint256 taskId) external view returns (bool) {
        return attestations[taskId].timestamp != 0;
    }
}
