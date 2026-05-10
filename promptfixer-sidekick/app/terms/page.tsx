import { MarketingShell } from "@/components/MarketingShell";

export const metadata = {
  title: "Terms · operator.center",
  description: "Terms of service for operator.center. Placeholder pending counsel review."
};

export default function TermsPage() {
  return (
    <MarketingShell>
      <article className="prose-page">
        <h1>Terms of service</h1>
        <p className="muted">
          Placeholder copy. Replace with counsel-reviewed Terms before public
          launch.
        </p>

        <h2>Use of the service</h2>
        <p>
          operator.center is provided as a workflow runtime. You agree to use it
          for lawful purposes, you are responsible for the content of the
          missions you dispatch, and you will not attempt to circumvent the
          safety screen, quotas, or rate limits.
        </p>

        <h2>Plans and billing</h2>
        <p>
          Free plan: 10 daily missions, no card required. Pro: $19 / month.
          Team: $39 / seat / month. Founder Lifetime: $99 one-time, capped at
          first 100 operators. Plans renew automatically through Stripe;
          self-serve cancellation is available via the Customer Portal.
        </p>

        <h2>Refunds</h2>
        <p>
          For the first 100 paid customers we offer a no-questions refund
          within 30 days. After that, refunds are evaluated case-by-case.
        </p>

        <h2>Liability</h2>
        <p>
          The service is provided &ldquo;as-is.&rdquo; operator.center is not liable for
          downstream actions taken by external models you route through it.
          Always review safety-screened outputs before shipping them.
        </p>

        <h2>Contact</h2>
        <p>
          Questions: <a href="mailto:hello@operator.center">hello@operator.center</a>.
        </p>
      </article>
    </MarketingShell>
  );
}
