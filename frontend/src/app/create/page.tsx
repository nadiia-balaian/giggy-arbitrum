"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAccount,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { keccak256, toBytes, parseEventLogs } from "viem";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { api } from "@/lib/api/client";
import { ESCROW_ADDRESS, USDC_ADDRESS, escrowAbi, usdcAbi, parseUsdc } from "@/lib/contracts";
import type { CreateMissionInput, Mission, WorkerType } from "@/types";

const WORKER_OPTIONS: { value: WorkerType; label: string }[] = [
  { value: "any", label: "Any Available Worker" },
  { value: "aws_agent", label: "AWS Agent Only" },
  { value: "human", label: "Human Only" },
];

type Step = "idle" | "approving" | "creating" | "syncing" | "done" | "error";

const STEP_LABELS: Record<Step, string> = {
  idle: "Fund & Create Mission",
  approving: "Step 1/3 — Approve USDC...",
  creating: "Step 2/3 — Locking funds in escrow...",
  syncing: "Step 3/3 — Syncing with backend...",
  done: "Done!",
  error: "Try again",
};

export default function CreateMissionPage() {
  const router = useRouter();
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: arbitrumSepolia.id });
  const { writeContractAsync } = useWriteContract();
  const onWrongChain = isConnected && walletChainId !== arbitrumSepolia.id;
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateMissionInput>({
    title: "",
    description: "",
    rewardUsd: 0,
    x402ClaimPriceUsd: 0,
    workerType: "any",
    deadline: "",
    successCriteria: "",
  });

  function update<K extends keyof CreateMissionInput>(
    key: K,
    value: CreateMissionInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step !== "idle" && step !== "error") return;
    if (!isConnected || !address) {
      setError("Connect your wallet first");
      return;
    }
    if (!publicClient) {
      setError("Network not ready");
      return;
    }

    setError(null);
    const bounty = parseUsdc(form.rewardUsd);
    const specText = `${form.title}\n${form.description}\n${form.successCriteria}`;
    const specHash = keccak256(toBytes(specText));

    try {
      // Step 0: Force Arbitrum Sepolia. The escrow + USDC contracts only exist there.
      if (walletChainId !== arbitrumSepolia.id) {
        await switchChainAsync({ chainId: arbitrumSepolia.id });
      }

      // Step 1: Approve USDC. `chainId` here is a safety guard — wagmi will
      // refuse to send if the wallet is somehow still on the wrong chain.
      setStep("approving");
      const approveTx = await writeContractAsync({
        chainId: arbitrumSepolia.id,
        address: USDC_ADDRESS,
        abi: usdcAbi,
        functionName: "approve",
        args: [ESCROW_ADDRESS, bounty],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      // RPC propagation guard: waitForTransactionReceipt returns when the tx
      // is mined, but state visibility lags on different RPC endpoints. If we
      // call createTask immediately, MetaMask's gas estimator may simulate
      // against a stale allowance=0 state, transferFrom reverts inside, and
      // viem rephrases the failure as "exceeds max transaction gas limit".
      //
      // Poll our public client until allowance reflects the approve, then add
      // a grace window for MetaMask's separate RPC to catch up.
      const allowanceDeadline = Date.now() + 10_000;
      while (Date.now() < allowanceDeadline) {
        const allowance = (await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: usdcAbi,
          functionName: "allowance",
          args: [address, ESCROW_ADDRESS],
        })) as bigint;
        if (allowance >= bounty) break;
        await new Promise((r) => setTimeout(r, 800));
      }
      // Extra grace — MetaMask uses its own RPC for gas estimation.
      await new Promise((r) => setTimeout(r, 1200));

      // Step 2: Create task on-chain (locks USDC in escrow)
      setStep("creating");
      const createTx = await writeContractAsync({
        chainId: arbitrumSepolia.id,
        address: ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: "createTask",
        args: [bounty, specHash],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: createTx });

      // Parse TaskCreated event to get the on-chain taskId
      const logs = parseEventLogs({
        abi: escrowAbi,
        logs: receipt.logs,
        eventName: "TaskCreated",
      });
      const taskId = logs[0]?.args?.taskId?.toString() ?? `m_${Date.now()}`;

      // Step 3: Mirror to backend
      setStep("syncing");
      const requirements = form.successCriteria
        .split(/\n|;|\r/)
        .map((s) => s.trim())
        .filter(Boolean);

      await api<Mission>("/api/missions", {
        method: "POST",
        body: JSON.stringify({
          id: taskId,
          title: form.title.trim() || "Untitled Mission",
          description: form.description.trim(),
          requirements,
          rewardUsd: Number(form.rewardUsd) || 0,
          x402ClaimPriceUsd: Number(form.x402ClaimPriceUsd) || 0,
          workerType: form.workerType,
          deadline: form.deadline,
          poster: address,
          specHash,
        }),
      });

      setStep("done");
      router.push(`/mission/${taskId}`);
    } catch (err: unknown) {
      setStep("error");
      const msg = err instanceof Error ? err.message : "Transaction failed";
      // Shorten long wallet error messages
      setError(msg.length > 120 ? msg.slice(0, 120) + "..." : msg);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="text-center">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Create New Mission
        </h1>
        <p className="mt-1 text-sm text-ink/70">
          Deploy human intelligence or AI agents to your task.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="rounded-3xl border-ink-3 bg-coral p-8 shadow-doodle-lg"
      >
        <div className="flex flex-col gap-5">
          <Input
            label="Mission Title"
            placeholder="e.g., Audit Smart Contract for logic flaws"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            required
          />

          <Textarea
            label="Task Description"
            placeholder="Define the scope, required tools, and specific steps to follow..."
            rows={5}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            required
          />

          <Input
            label="Reward Amount (USDC)"
            type="number"
            min={0}
            step={0.01}
            placeholder="0.00"
            value={form.rewardUsd || ""}
            onChange={(e) => update("rewardUsd", Number(e.target.value))}
            required
          />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Select
              label="Worker Type Preference"
              options={WORKER_OPTIONS}
              value={form.workerType}
              onChange={(e) =>
                update("workerType", e.target.value as WorkerType)
              }
            />
            <Input
              label="Mission Deadline"
              type="date"
              value={form.deadline}
              onChange={(e) => update("deadline", e.target.value)}
              required
            />
          </div>

          <Textarea
            label="Approval / Success Criteria"
            placeholder="e.g., PDF Report must contain at least 3 valid findings"
            rows={3}
            value={form.successCriteria}
            onChange={(e) => update("successCriteria", e.target.value)}
            required
          />

          {onWrongChain && (
            <p className="rounded-xl bg-yellow-100 px-4 py-2 text-sm text-yellow-900">
              Wrong network. You'll be asked to switch to Arbitrum Sepolia when you submit.
            </p>
          )}

          {error && (
            <p className="rounded-xl bg-red-100 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={step !== "idle" && step !== "error"}
            className="mt-2 w-full"
          >
            {!isConnected
              ? "Connect wallet first"
              : onWrongChain && step === "idle"
                ? "Switch to Arbitrum Sepolia & Create"
                : STEP_LABELS[step]}
          </Button>
        </div>
      </form>
    </div>
  );
}
