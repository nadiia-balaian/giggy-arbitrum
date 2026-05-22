// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AutoVerifier} from "../src/AutoVerifier.sol";

contract AutoVerifierTest is Test {
    AutoVerifier internal verifier;
    address internal scorer = address(0xBEEF);
    address internal other  = address(0xDEAD);

    event AttestationRecorded(
        uint256 indexed taskId,
        address indexed scorer,
        uint16 scoreBps,
        bool passed,
        bytes32 reasoningHash
    );

    function setUp() public {
        verifier = new AutoVerifier(scorer);
    }

    function test_scorerStoredAtConstruction() public view {
        assertEq(verifier.scorer(), scorer);
    }

    function test_attest_recordsAttestation() public {
        bytes32 hash = keccak256("the report meets all criteria");

        vm.expectEmit(true, true, false, true);
        emit AttestationRecorded(42, scorer, 9456, true, hash);

        vm.prank(scorer);
        verifier.attest(42, 9456, true, hash);

        (address s, uint16 score, bool passed, bytes32 rh, uint64 ts) =
            verifier.attestations(42);
        assertEq(s, scorer);
        assertEq(score, 9456);
        assertTrue(passed);
        assertEq(rh, hash);
        assertGt(ts, 0);
    }

    function test_attest_revertsForNonScorer() public {
        vm.prank(other);
        vm.expectRevert(AutoVerifier.NotScorer.selector);
        verifier.attest(1, 5000, true, bytes32(0));
    }

    function test_attest_revertsOnDoubleAttest() public {
        vm.prank(scorer);
        verifier.attest(7, 7000, true, bytes32(uint256(1)));

        vm.prank(scorer);
        vm.expectRevert(AutoVerifier.AlreadyAttested.selector);
        verifier.attest(7, 8000, true, bytes32(uint256(2)));
    }

    function test_hasAttestation() public {
        assertFalse(verifier.hasAttestation(1));

        vm.prank(scorer);
        verifier.attest(1, 8000, true, bytes32(uint256(0xab)));

        assertTrue(verifier.hasAttestation(1));
    }

    function test_failureVerdictIsPersisted() public {
        vm.prank(scorer);
        verifier.attest(99, 2300, false, keccak256("report is off-topic"));

        (, uint16 score, bool passed,, ) = verifier.attestations(99);
        assertEq(score, 2300);
        assertFalse(passed);
    }
}
