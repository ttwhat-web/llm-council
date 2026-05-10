import { MarketingShell } from "@/components/MarketingShell";

export const metadata = {
  title: "Security · operator.center",
  description: "How operator.center secures identity, secrets, missions and audit data."
};

export default function SecurityPage() {
  return (
    <MarketingShell>
      <Page>
        <h1>Security</h1>
        <p className="lede">
          operator.center is a workflow runtime for production work. The security
          model is built around four principles: <em>least privilege</em>, <em>auditable
          execution</em>, <em>operator consent</em> and <em>kill switch</em>.
        </p>

        <h2>Identity</h2>
        <ul>
          <li>
            Anonymous visitors get an HttpOnly session cookie. Their daily quota
            is enforced server-side independently of any localStorage state.
          </li>
          <li>
            Authenticated identities are issued by Clerk (configured via
            <code> NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> +{" "}
            <code> CLERK_SECRET_KEY</code>) and resolved server-side via the
            auth seam in <code>lib/auth/identity.ts</code>.
          </li>
          <li>
            Cookies are SameSite=Lax, secure in production, with explicit TTLs.
          </li>
        </ul>

        <h2>Subscription state</h2>
        <ul>
          <li>
            Plan resolution always reads from the durable <code>BillingStore</code>
            (Upstash Redis in production; file-backed in development). The browser
            is never trusted for billing decisions.
          </li>
          <li>
            Stripe webhook signatures are verified with{" "}
            <code>stripe.webhooks.constructEvent</code> using{" "}
            <code>STRIPE_WEBHOOK_SECRET</code>. Unsigned or mis-signed deliveries
            are rejected with 401.
          </li>
        </ul>

        <h2>Missions</h2>
        <ul>
          <li>
            Cloud-bound generation routes (<code>/api/fix</code>,{" "}
            <code>/api/architect</code>, <code>/api/skills/run</code>,{" "}
            <code>/api/workflows/run</code>) all open with{" "}
            <code>runBillingGate</code>: token-bucket rate limit + plan
            resolution + per-action quota.
          </li>
          <li>
            Every mission runs through the safety screen. Destructive shell
            commands (<code>rm -rf</code>, <code>mkfs</code>, fork-bombs, raw{" "}
            <code>dd</code>, <code>DROP TABLE</code>, …) are refused at export
            time. The Terminal Safe Command export refuses to coerce non-shell
            prompts into shell.
          </li>
          <li>
            Tools carry a risk tag (<code>safe</code> · <code>approval</code> ·{" "}
            <code>dangerous</code>). Approval-class tools require an explicit
            confirmation. Dangerous tools require workspace admin enablement.
          </li>
        </ul>

        <h2>Audit</h2>
        <ul>
          <li>
            Quota denials, rate-limit denials, checkout completions, debug
            grants and revocations all append a typed{" "}
            <code>BillingAuditEvent</code>. Pro retains 1k events; Team 50k;
            Enterprise streams to S3 / Datadog / Splunk.
          </li>
          <li>
            Audit logs include identity fingerprints, never raw secrets.
          </li>
        </ul>

        <h2>Data residency</h2>
        <ul>
          <li>
            Cloud route: requests transit your selected provider (Anthropic /
            OpenAI) and return. We don&apos;t train on your data; the providers
            don&apos;t train on yours under their own commercial agreements.
          </li>
          <li>
            Local route: with the desktop shell + Ollama, your input never leaves
            the machine. The server never hosts heavy models.
          </li>
          <li>
            BYOK (Pro+) routes cloud spend through your provider keys. Available
            at a 20% plan discount.
          </li>
        </ul>

        <h2>Compliance posture</h2>
        <ul>
          <li>SOC 2 Type 1 in progress.</li>
          <li>SOC 2 Type 2 attested before Enterprise GA.</li>
          <li>DPA available on request for Team and Enterprise.</li>
        </ul>

        <p className="muted">
          Found something off? <a href="mailto:security@operator.center">security@operator.center</a>.
        </p>
      </Page>
    </MarketingShell>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return <article className="prose-page">{children}</article>;
}
