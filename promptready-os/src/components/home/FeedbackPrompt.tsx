"use client";

/**
 * Founder Feedback · the 1-tap reaction after a completed send.
 *
 * 👍 Perfect · 👌 Needed edits · 👎 Not usable. Whatever the founder
 * taps becomes supervised training data (see store/feedback.ts) — this
 * component never guesses a rating from behavior, it only records what
 * was explicitly tapped.
 */

import { useState } from "react";
import { useFeedbackStore, EDIT_REASONS, type EditReason } from "@/store/feedback";
import { useMetricsStore, getActionTiming } from "@/store/metrics";
import { levenshteinDistance } from "@/services/text/editDistance";

type Step = "idle" | "reasons" | "correction" | "done";

export function FeedbackPrompt({
  actionId,
  promptVersion,
  model,
  originalBody,
  finalBody
}: {
  actionId: string;
  promptVersion: string;
  model: string;
  originalBody: string;
  finalBody: string;
}) {
  const already = useFeedbackStore((s) => s.hasFeedback(actionId));
  const recordPerfect = useFeedbackStore((s) => s.recordPerfect);
  const recordNeededEdits = useFeedbackStore((s) => s.recordNeededEdits);
  const recordNotUsable = useFeedbackStore((s) => s.recordNotUsable);
  const metricsEvents = useMetricsStore((s) => s.events);

  const [step, setStep] = useState<Step>("idle");
  const [otherPicked, setOtherPicked] = useState(false);
  const [otherText, setOtherText] = useState("");
  const [correctionText, setCorrectionText] = useState("");

  if (already || step === "done") {
    return <p className="text-[11px] text-white/35">Feedback noted — thank you.</p>;
  }

  const onPerfect = () => {
    const timing = getActionTiming(metricsEvents, actionId);
    recordPerfect({
      actionId,
      promptVersion,
      model,
      approvalWithoutEdit: !timing.wasEdited,
      timeToApproveMs: timing.timeToApproveMs
    });
    setStep("done");
  };

  const submitReason = (reason: EditReason, otherTextVal?: string) => {
    recordNeededEdits({
      actionId,
      promptVersion,
      model,
      editDistance: levenshteinDistance(originalBody, finalBody),
      editReason: reason,
      editReasonOther: otherTextVal
    });
    setStep("done");
  };

  const onPickReason = (value: EditReason) => {
    if (value === "other") {
      setOtherPicked(true);
      return;
    }
    submitReason(value);
  };

  const onSaveOther = () => {
    if (!otherText.trim()) return;
    submitReason("other", otherText);
  };

  const onSubmitCorrection = () => {
    if (!correctionText.trim()) return;
    recordNotUsable({ actionId, promptVersion, model, correction: correctionText });
    setStep("done");
  };

  if (step === "reasons") {
    return (
      <div className="flex flex-col gap-1.5 pt-1">
        <span className="text-[11.5px] text-white/55">What needed changing?</span>
        <div className="flex flex-wrap gap-1.5">
          {EDIT_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onPickReason(r.value)}
              className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-white/75 transition hover:bg-white/[0.09]"
            >
              {r.label}
            </button>
          ))}
        </div>
        {otherPicked && (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="What, specifically?"
              autoFocus
              className="flex-1 rounded-md bg-black/30 px-2 py-1 text-[12px] text-white placeholder:text-white/30 focus:outline-none"
            />
            <button
              type="button"
              onClick={onSaveOther}
              disabled={!otherText.trim()}
              className="rounded-md bg-white/[0.08] px-2 py-1 text-[11px] text-white/85 transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save
            </button>
          </div>
        )}
      </div>
    );
  }

  if (step === "correction") {
    return (
      <div className="flex flex-col gap-1.5 pt-1">
        <span className="text-[11.5px] text-white/55">What should Operator have done instead?</span>
        <textarea
          value={correctionText}
          onChange={(e) => setCorrectionText(e.target.value)}
          rows={2}
          autoFocus
          placeholder="Tell Operator what the right move was…"
          className="w-full resize-none rounded-md bg-black/30 px-2 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:outline-none"
        />
        <button
          type="button"
          onClick={onSubmitCorrection}
          disabled={!correctionText.trim()}
          className="w-fit rounded-md bg-white/[0.08] px-2.5 py-1 text-[11px] text-white/85 transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Submit
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[11.5px] text-white/45">How was this reply?</span>
      <button
        type="button"
        onClick={onPerfect}
        aria-label="Perfect"
        title="Perfect — no edits needed"
        className="rounded-full bg-white/[0.05] px-2 py-1 text-[13px] transition hover:bg-white/[0.09]"
      >
        👍
      </button>
      <button
        type="button"
        onClick={() => setStep("reasons")}
        aria-label="Needed edits"
        title="Needed edits"
        className="rounded-full bg-white/[0.05] px-2 py-1 text-[13px] transition hover:bg-white/[0.09]"
      >
        👌
      </button>
      <button
        type="button"
        onClick={() => setStep("correction")}
        aria-label="Not usable"
        title="Not usable"
        className="rounded-full bg-white/[0.05] px-2 py-1 text-[13px] transition hover:bg-white/[0.09]"
      >
        👎
      </button>
    </div>
  );
}
