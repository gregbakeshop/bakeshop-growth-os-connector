import { LegalPage } from "../legal-page";

export default function Support() {
  return (
    <LegalPage title="Support">
      <p>
        Need help with Bakeshop OS? We&apos;re here.
      </p>

      <h2>Contact</h2>
      <p>
        Email{" "}
        <a href="mailto:support@bakeshop.digital">support@bakeshop.digital</a>{" "}
        and we&apos;ll respond within one business day.
      </p>

      <h2>Common questions</h2>
      <p>
        <strong>What does this app do?</strong> It syncs your store&apos;s
        read-only orders, products, customers, and discounts into your private
        Bakeshop analytics workspace. Charts and reporting live in
        Bakeshop, not inside this app.
      </p>
      <p>
        <strong>How do I sync now?</strong> Open the app from your Shopify admin
        and click <em>Sync now</em>. Data also syncs automatically once daily.
      </p>
      <p>
        <strong>How do I disconnect?</strong> Uninstall the app from your Shopify
        admin. Syncing stops immediately and your data is deleted per our{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>
    </LegalPage>
  );
}
