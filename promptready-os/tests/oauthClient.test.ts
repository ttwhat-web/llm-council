import { describe, expect, it } from "vitest";
import {
  buildAuthorizationUrl,
  CALENDAR_WRITE_SCOPE,
  GMAIL_MODIFY_SCOPE,
  hasCalendarWriteScope,
  hasGmailModifyScope,
  validateClientId
} from "@/services/google/oauthClient";

const VALID_CLIENT_ID = "123-abc.apps.googleusercontent.com";

describe("validateClientId", () => {
  it("rejects an empty id", () => {
    expect(validateClientId("")).not.toBeNull();
  });

  it("rejects an id without the expected suffix", () => {
    expect(validateClientId("not-a-google-client-id")).not.toBeNull();
  });

  it("accepts a well-formed Google client id", () => {
    expect(validateClientId(VALID_CLIENT_ID)).toBeNull();
  });
});

describe("buildAuthorizationUrl · Calendar write is never bundled by default", () => {
  it("requests only the base scopes when no extraScopes are given", () => {
    const url = new URL(buildAuthorizationUrl(VALID_CLIENT_ID));
    const scope = url.searchParams.get("scope") ?? "";
    expect(scope).toContain("gmail.readonly");
    expect(scope).toContain("calendar.readonly");
    expect(scope).not.toContain(CALENDAR_WRITE_SCOPE);
  });

  it("adds the Calendar write scope only when explicitly requested", () => {
    const url = new URL(buildAuthorizationUrl(VALID_CLIENT_ID, [CALENDAR_WRITE_SCOPE]));
    const scope = url.searchParams.get("scope") ?? "";
    expect(scope).toContain(CALENDAR_WRITE_SCOPE);
    // The base scopes are still present — incremental, not a replacement.
    expect(scope).toContain("gmail.readonly");
  });

  it("throws on an invalid client id instead of building a broken URL", () => {
    expect(() => buildAuthorizationUrl("not-valid")).toThrow();
  });
});

describe("hasCalendarWriteScope", () => {
  it("defaults to false with no stored tokens", () => {
    expect(hasCalendarWriteScope()).toBe(false);
  });
});

describe("buildAuthorizationUrl · Gmail modify is never bundled by default", () => {
  it("requests only the base scopes when no extraScopes are given", () => {
    const url = new URL(buildAuthorizationUrl(VALID_CLIENT_ID));
    const scope = url.searchParams.get("scope") ?? "";
    expect(scope).not.toContain(GMAIL_MODIFY_SCOPE);
  });

  it("adds the Gmail modify scope only when explicitly requested", () => {
    const url = new URL(buildAuthorizationUrl(VALID_CLIENT_ID, [GMAIL_MODIFY_SCOPE]));
    const scope = url.searchParams.get("scope") ?? "";
    expect(scope).toContain(GMAIL_MODIFY_SCOPE);
    expect(scope).toContain("gmail.readonly");
  });
});

describe("hasGmailModifyScope", () => {
  it("defaults to false with no stored tokens", () => {
    expect(hasGmailModifyScope()).toBe(false);
  });
});
