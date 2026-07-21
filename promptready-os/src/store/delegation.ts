"use client";

/**
 * Delegation store · one founder sentence → a real, prepared plan.
 *
 * Ephemeral (not persisted) — a plan is a live preview of what was
 * just prepared in the Action Queue this session, not a record to
 * keep. The actions themselves already live in the Action Queue (the
 * permanent, persisted source of truth); this store only tracks which
 * of those ids belong to the plan currently being shown, so Approve
 * All can act on exactly this request and nothing else pending on Home.
 */

import { create } from "zustand";
import { useActionQueue } from "@/services/executors";
import { useSourcesStore } from "@/store/sources";
import { useAiProviderStore } from "@/store/aiProvider";
import { getActiveMemoryView } from "@/services/memory/distillation";
import { getActiveCompanyBrainContext } from "@/services/companyBrain/retrieve";
import { delegate } from "@/services/delegation/buildPlan";
import type { DelegationPlan } from "@/services/delegation/types";

interface DelegationState {
  status: "idle" | "interpreting" | "ready" | "error";
  plan: DelegationPlan | null;
  /** Real error text only when the request itself couldn't be run at
   *  all (e.g. a thrown exception) — a plan with zero actions and some
   *  issues is "ready", not "error", since it's still an honest result. */
  error: string | null;

  run(text: string): Promise<void>;
  dismiss(): void;
  /** Approve every not-yet-approved action in the current plan — scoped
   *  to this request, never every pending action on Home. */
  approveAll(): void;
}

export const useDelegationStore = create<DelegationState>((set, get) => ({
  status: "idle",
  plan: null,
  error: null,

  async run(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    set({ status: "interpreting", plan: null, error: null });
    try {
      const sources = useSourcesStore.getState();
      const plan = await delegate(trimmed, {
        snapshot: sources.snapshot,
        memory: getActiveMemoryView(),
        anthropicKey: useAiProviderStore.getState().anthropicKey,
        calendarWriteGranted: sources.google.calendarWriteGranted,
        gmailModifyGranted: sources.google.gmailModifyGranted,
        companyBrainContext: getActiveCompanyBrainContext()
      });
      set({ status: "ready", plan });
    } catch (e) {
      set({ status: "error", plan: null, error: (e as Error).message });
    }
  },

  dismiss() {
    set({ status: "idle", plan: null, error: null });
  },

  approveAll() {
    const plan = get().plan;
    if (!plan) return;
    const { items, approve } = useActionQueue.getState();
    for (const action of plan.actions) {
      const item = items[action.queueId];
      const isPending =
        !item ||
        item.status === "prepared" ||
        item.status === "cancelled" ||
        (item.status === "waiting_approval" && item.approvedAt == null);
      if (isPending) approve(action.queueId);
    }
  }
}));
