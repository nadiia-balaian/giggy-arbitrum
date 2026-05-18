// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TaskEscrow} from "../src/TaskEscrow.sol";
import {IERC20} from "../src/IERC20.sol";

/// Minimal ERC20 mock for tests. Mints unlimited to anyone calling `mint`.
contract MockUSDC is IERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external { balanceOf[to] += amount; }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}

contract TaskEscrowTest is Test {
    TaskEscrow escrow;
    MockUSDC usdc;
    address poster = address(0xA1);
    address agent = address(0xA2);
    address other = address(0xA3);

    bytes32 constant SPEC = keccak256("research humanoid robotics");
    bytes32 constant REPORT = keccak256("the report body");
    uint256 constant BOUNTY = 2_000_000; // 2 USDC at 6 decimals

    function setUp() public {
        usdc = new MockUSDC();
        escrow = new TaskEscrow(usdc, agent);

        usdc.mint(poster, 100_000_000);
        vm.prank(poster);
        usdc.approve(address(escrow), type(uint256).max);
    }

    function test_HappyPath_PostPickupSubmitRelease() public {
        vm.prank(poster);
        uint256 id = escrow.createTask(BOUNTY, SPEC);
        assertEq(usdc.balanceOf(address(escrow)), BOUNTY);

        vm.prank(agent);
        escrow.pickup(id);

        vm.prank(agent);
        escrow.submitProof(id, REPORT);

        vm.prank(poster);
        escrow.release(id);

        assertEq(usdc.balanceOf(agent), BOUNTY);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    function test_RefundBeforePickup() public {
        vm.prank(poster);
        uint256 id = escrow.createTask(BOUNTY, SPEC);

        vm.prank(poster);
        escrow.refund(id);

        assertEq(usdc.balanceOf(poster), 100_000_000);
    }

    function test_RefundAfterSubmit() public {
        vm.prank(poster);
        uint256 id = escrow.createTask(BOUNTY, SPEC);
        vm.prank(agent);
        escrow.pickup(id);
        vm.prank(agent);
        escrow.submitProof(id, REPORT);

        vm.prank(poster);
        escrow.refund(id);

        assertEq(usdc.balanceOf(poster), 100_000_000);
    }

    function test_RevertWhen_NonAgentPickup() public {
        vm.prank(poster);
        uint256 id = escrow.createTask(BOUNTY, SPEC);
        vm.prank(other);
        vm.expectRevert(TaskEscrow.NotAgent.selector);
        escrow.pickup(id);
    }

    function test_RevertWhen_NonPosterRelease() public {
        vm.prank(poster);
        uint256 id = escrow.createTask(BOUNTY, SPEC);
        vm.prank(agent);
        escrow.pickup(id);
        vm.prank(agent);
        escrow.submitProof(id, REPORT);

        vm.prank(other);
        vm.expectRevert(TaskEscrow.NotPoster.selector);
        escrow.release(id);
    }

    function test_RevertWhen_RefundAfterRelease() public {
        vm.prank(poster);
        uint256 id = escrow.createTask(BOUNTY, SPEC);
        vm.prank(agent);
        escrow.pickup(id);
        vm.prank(agent);
        escrow.submitProof(id, REPORT);
        vm.prank(poster);
        escrow.release(id);

        vm.prank(poster);
        vm.expectRevert();
        escrow.refund(id);
    }

    function test_RevertWhen_ZeroBounty() public {
        vm.prank(poster);
        vm.expectRevert(TaskEscrow.ZeroBounty.selector);
        escrow.createTask(0, SPEC);
    }
}
