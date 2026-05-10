import { MarketingShell } from "@/components/MarketingShell";

export const metadata = {
  title: "Privacy · operator.center",
  description: "What operator.center collects, why, and what you can do about it."
};

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <article className="prose-page">
        <h1>Privacy notice</h1>
        <p className="muted">
          Placeholder copy. Replaced with counsel-reviewed text before public
          launch. Use this page as the structural map.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>Account email when you sign up via Clerk.</li>
          <li>Mission inputs and outputs you dispatch.</li>
          <li>
            Usage telemetry per identity (daily mission count, plan, audit
            events). No third-party advertising trackers.
          </li>
          <li>Stripe customer id and subscription status when you pay.</li>
        </ul>

        <h2>What we never collect</h2>
        <ul>
          <li>Your provider API keys, when you supply them as BYOK secrets.</li>
          <li>Mission inputs from anonymous sessions beyond the rolling rate window.</li>
        </ul>

        <h2>Where it goes</h2>
        <ul>
          <li>Cloud generation: routed to Anthropic / OpenAI per mission.</li>
          <li>Local generation: stays on your machine via Ollama.</li>
          <li>
            Subscription state: Stripe + our durable BillingStore (Upstash
            Redis in production).
          </li>
        </ul>

        <h2>Your rights</h2>
        <p>
          Email <a href="mailto:privacy@operator.center">privacy@operator.center</a>{" "}
          for export, correction or deletion of your records. We respond within 30 days.
        </p>
      </article>
    </MarketingShell>
  );
}
