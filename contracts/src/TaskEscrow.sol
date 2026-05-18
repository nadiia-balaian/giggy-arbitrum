// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./IERC20.sol";

/// @title TaskEscrow
/// @notice Holds USDC bounties for tasks while a registered agent works on them.
/// @dev v1 design: a single immutable agent address is allowed to pick up + submit.
///      Multi-agent / per-task wallets are roadmap items — kept simple here.
contract TaskEscrow {
    enum State {
        None,        // 0 — sentinel for non-existent task
        Open,        // 1 — funded, waiting for agent
        Assigned,    // 2 — agent picked it up
        Submitted,   // 3 — agent submitted a proof hash
        Released,    // 4 — poster released bounty to agent
        Refunded     // 5 — poster refunded themselves
    }

    struct Task {
        address poster;
        uint256 bounty;
        bytes32 specHash;     // keccak256 of off-chain task spec
        bytes32 reportHash;   // keccak256 of off-chain report (set on submitProof)
        State state;
    }

    IERC20 public immutable token;
    address public immutable agent;

    uint256 public nextTaskId;
    mapping(uint256 => Task) public tasks;

    event TaskCreated(uint256 indexed taskId, address indexed poster, uint256 bounty, bytes32 specHash);
    event TaskAssigned(uint256 indexed taskId, address indexed agent);
    event ProofSubmitted(uint256 indexed taskId, bytes32 reportHash);
    event TaskReleased(uint256 indexed taskId, address indexed agent, uint256 bounty);
    event TaskRefunded(uint256 indexed taskId, address indexed poster, uint256 bounty);

    error InvalidState(State expected, State actual);
    error NotPoster();
    error NotAgent();
    error ZeroBounty();
    error TransferFailed();

    constructor(IERC20 token_, address agent_) {
        token = token_;
        agent = agent_;
    }

    /// @notice Lock USDC bounty for a task. Caller must `approve` the bounty first.
    function createTask(uint256 bounty, bytes32 specHash) external returns (uint256 taskId) {
        if (bounty == 0) revert ZeroBounty();

        taskId = ++nextTaskId;
        tasks[taskId] = Task({
            poster: msg.sender,
            bounty: bounty,
            specHash: specHash,
            reportHash: bytes32(0),
            state: State.Open
        });

        if (!token.transferFrom(msg.sender, address(this), bounty)) revert TransferFailed();

        emit TaskCreated(taskId, msg.sender, bounty, specHash);
    }

    /// @notice Agent claims the task. Only the registered agent can call this.
    function pickup(uint256 taskId) external {
        if (msg.sender != agent) revert NotAgent();
        Task storage t = tasks[taskId];
        if (t.state != State.Open) revert InvalidState(State.Open, t.state);

        t.state = State.Assigned;
        emit TaskAssigned(taskId, msg.sender);
    }

    /// @notice Agent commits a hash of the report on-chain.
    function submitProof(uint256 taskId, bytes32 reportHash) external {
        if (msg.sender != agent) revert NotAgent();
        Task storage t = tasks[taskId];
        if (t.state != State.Assigned) revert InvalidState(State.Assigned, t.state);

        t.reportHash = reportHash;
        t.state = State.Submitted;
        emit ProofSubmitted(taskId, reportHash);
    }

    /// @notice Poster approves the work and releases bounty to the agent.
    function release(uint256 taskId) external {
        Task storage t = tasks[taskId];
        if (msg.sender != t.poster) revert NotPoster();
        if (t.state != State.Submitted) revert InvalidState(State.Submitted, t.state);

        t.state = State.Released;
        if (!token.transfer(agent, t.bounty)) revert TransferFailed();

        emit TaskReleased(taskId, agent, t.bounty);
    }

    /// @notice Poster pulls funds back. Allowed at any state before Released.
    /// @dev v1 trades agent-side trust for human-side trust per project spec.
    ///      A dispute window or auto-verifier is a v2 roadmap item.
    function refund(uint256 taskId) external {
        Task storage t = tasks[taskId];
        if (msg.sender != t.poster) revert NotPoster();
        if (t.state == State.None || t.state == State.Released || t.state == State.Refunded) {
            revert InvalidState(State.Open, t.state);
        }

        t.state = State.Refunded;
        if (!token.transfer(t.poster, t.bounty)) revert TransferFailed();

        emit TaskRefunded(taskId, t.poster, t.bounty);
    }
}
