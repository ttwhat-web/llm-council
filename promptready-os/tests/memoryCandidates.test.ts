import { beforeEach, describe, expect, it } from "vitest";
import {
  detectLanguageHint,
  languageCandidateFromApprovedSend,
  toneCandidateFromEdit,
  avoidCandidateFromFeedback,
  behaviorCandidateFromCalendarMove
} from "@/services/memory/candidates";
import { useMemoryCandidatesStore } from "@/store/memoryCandidates";
import { useOperatorMemoryStore } from "@/store/operatorMemory";
import { renderMemoryForPrompt } from "@/services/operator/memorySeed";

beforeEach(() => {
  useMemoryCandidatesStore.getState().reset();
  useOperatorMemoryStore.getState().reset();
});

describe("detectLanguageHint · small deterministic word-list heuristic", () => {
  it("detects German from common markers", () => {
    expect(detectLanguageHint("Vielen Dank für Ihre Nachricht, freundliche Grüße")).toBe("German");
  });

  it("detects Turkish from common markers", () => {
    expect(detectLanguageHint("Merhaba, teşekkürler, iyi günler")).toBe("Turkish");
  });

  it("says nothing when the signal is ambiguous or absent", () => {
    expect(detectLanguageHint("Hi there, thanks so much, see you soon")).toBeNull();
  });
});

describe("candidate drafts · pure, no invented facts", () => {
  it("languageCandidateFromApprovedSend produces a specific, subject-named fact", () => {
    const c = languageCandidateFromApprovedSend({
      subjectLabel: "Hans Müller",
      subjectKey: "hans@acme.de",
      draftBody: "Vielen Dank für Ihre Anfrage, freundliche Grüße"
    });
    expect(c).not.toBeNull();
    expect(c!.text).toBe("Hans Müller prefers German.");
    expect(c!.kind).toBe("language");
  });

  it("languageCandidateFromApprovedSend returns null with no language signal", () => {
    expect(
      languageCandidateFromApprovedSend({
        subjectLabel: "John Smith",
        subjectKey: "john@example.com",
        draftBody: "Thanks for reaching out, talk soon."
      })
    ).toBeNull();
  });

  it("toneCandidateFromEdit names the specific edit reason, not a generic tone label", () => {
    const c = toneCandidateFromEdit({
      subjectLabel: "Bridge & Co.",
      subjectKey: "ops@bridge.co",
      originalBody: "Dear Sir, please find attached the requested documentation.",
      finalBody: "Hey! Attached the docs.",
      editReason: "too_formal"
    });
    expect(c).not.toBeNull();
    expect(c!.text).toContain("Bridge & Co.");
    expect(c!.text).toContain("too formal");
  });

  it("toneCandidateFromEdit returns null when nothing actually changed", () => {
    expect(
      toneCandidateFromEdit({
        subjectLabel: "Bridge & Co.",
        subjectKey: "ops@bridge.co",
        originalBody: "Same text",
        finalBody: "Same text",
        editReason: "tone"
      })
    ).toBeNull();
  });

  it("avoidCandidateFromFeedback quotes the founder's own correction", () => {
    const c = avoidCandidateFromFeedback({
      subjectLabel: "Klein Reisen",
      subjectKey: "info@klein-reisen.de",
      correction: "Should have offered a refund, not a discount."
    });
    expect(c!.text).toBe("For Klein Reisen: Should have offered a refund, not a discount.");
    expect(c!.kind).toBe("avoid");
  });

  it("behaviorCandidateFromCalendarMove names the specific meeting", () => {
    const c = behaviorCandidateFromCalendarMove({ summary: "Bridge demo" });
    expect(c!.text).toBe('"Bridge demo" meetings have needed rescheduling more than once.');
    expect(c!.kind).toBe("behavior");
  });
});

describe("useMemoryCandidatesStore · ask before saving, never silent", () => {
  it("approved send creates a language candidate only after repetition (not a one-off guess)", () => {
    const draft = () =>
      languageCandidateFromApprovedSend({
        subjectLabel: "Hans Müller",
        subjectKey: "hans@acme.de",
        draftBody: "Vielen Dank, freundliche Grüße"
      });
    useMemoryCandidatesStore.getState().observe(draft());
    expect(useMemoryCandidatesStore.getState().pendingCandidates()).toHaveLength(0);
    useMemoryCandidatesStore.getState().observe(draft());
    const pending = useMemoryCandidatesStore.getState().pendingCandidates();
    expect(pending).toHaveLength(1);
    expect(pending[0].text).toBe("Hans Müller prefers German.");
    expect(pending[0].status).toBe("pending");
  });

  it("an edited draft creates a tone/specificity candidate after repetition", () => {
    const draft = () =>
      toneCandidateFromEdit({
        subjectLabel: "Bridge & Co.",
        subjectKey: "ops@bridge.co",
        originalBody: "Dear Sir, please find attached the requested documentation.",
        finalBody: "Hey! Attached the docs.",
        editReason: "too_formal"
      });
    useMemoryCandidatesStore.getState().observe(draft());
    useMemoryCandidatesStore.getState().observe(draft());
    const pending = useMemoryCandidatesStore.getState().pendingCandidates();
    expect(pending).toHaveLength(1);
    expect(pending[0].kind).toBe("tone");
  });

  it("negative feedback creates an avoid-rule candidate on the first occurrence", () => {
    useMemoryCandidatesStore.getState().observe(
      avoidCandidateFromFeedback({
        subjectLabel: "Klein Reisen",
        subjectKey: "info@klein-reisen.de",
        correction: "Should have offered a refund, not a discount."
      })
    );
    const pending = useMemoryCandidatesStore.getState().pendingCandidates();
    expect(pending).toHaveLength(1);
    expect(pending[0].kind).toBe("avoid");
  });

  it("blocked memory never appears again, even with fresh evidence", () => {
    const draft = () =>
      avoidCandidateFromFeedback({
        subjectLabel: "Klein Reisen",
        subjectKey: "info@klein-reisen.de",
        correction: "Never offer a discount without checking margin first."
      });
    useMemoryCandidatesStore.getState().observe(draft());
    const [pending] = useMemoryCandidatesStore.getState().pendingCandidates();
    useMemoryCandidatesStore.getState().block(pending.key);
    expect(useMemoryCandidatesStore.getState().pendingCandidates()).toHaveLength(0);

    // Fresh evidence for the exact same fact — must not resurface it.
    useMemoryCandidatesStore.getState().observe(draft());
    useMemoryCandidatesStore.getState().observe(draft());
    expect(useMemoryCandidatesStore.getState().pendingCandidates()).toHaveLength(0);
    expect(useMemoryCandidatesStore.getState().candidates[pending.key].status).toBe("blocked");
  });

  it("ignored candidates can resurface later on fresh evidence", () => {
    const draft = () =>
      languageCandidateFromApprovedSend({
        subjectLabel: "Anna Klein",
        subjectKey: "anna@klein.de",
        draftBody: "Vielen Dank, freundliche Grüße"
      });
    useMemoryCandidatesStore.getState().observe(draft());
    useMemoryCandidatesStore.getState().observe(draft());
    const [pending] = useMemoryCandidatesStore.getState().pendingCandidates();
    useMemoryCandidatesStore.getState().ignore(pending.key);
    expect(useMemoryCandidatesStore.getState().pendingCandidates()).toHaveLength(0);

    useMemoryCandidatesStore.getState().observe(draft());
    expect(useMemoryCandidatesStore.getState().pendingCandidates()).toHaveLength(1);
  });

  it("never shows a candidate for a null draft (nothing detected)", () => {
    useMemoryCandidatesStore.getState().observe(null);
    expect(Object.keys(useMemoryCandidatesStore.getState().candidates)).toHaveLength(0);
  });

  it("saved memory is injected into draft prompts via rememberThese/avoidThese", () => {
    useMemoryCandidatesStore.getState().observe(
      avoidCandidateFromFeedback({
        subjectLabel: "Klein Reisen",
        subjectKey: "info@klein-reisen.de",
        correction: "Should have offered a refund, not a discount."
      })
    );
    const [pending] = useMemoryCandidatesStore.getState().pendingCandidates();
    useMemoryCandidatesStore.getState().save(pending.key);

    expect(useMemoryCandidatesStore.getState().candidates[pending.key].status).toBe("saved");

    const memory = useOperatorMemoryStore.getState().memory;
    expect(memory.avoidThese).toContain("Should have offered a refund, not a discount.");

    const prompt = renderMemoryForPrompt(memory);
    expect(prompt).toContain("Should have offered a refund, not a discount.");
  });

  it("saves a language/tone candidate into rememberThese, not avoidThese", () => {
    const draft = () =>
      languageCandidateFromApprovedSend({
        subjectLabel: "Hans Müller",
        subjectKey: "hans@acme.de",
        draftBody: "Vielen Dank, freundliche Grüße"
      });
    useMemoryCandidatesStore.getState().observe(draft());
    useMemoryCandidatesStore.getState().observe(draft());
    const [pending] = useMemoryCandidatesStore.getState().pendingCandidates();
    useMemoryCandidatesStore.getState().save(pending.key);

    const memory = useOperatorMemoryStore.getState().memory;
    expect(memory.rememberThese).toContain("Hans Müller prefers German.");
    expect(memory.avoidThese).not.toContain("Hans Müller");
  });
});
