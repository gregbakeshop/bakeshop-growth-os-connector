import { LegalPage } from "../legal-page";

export default function Terms() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        <strong>Last updated: June 13, 2026.</strong>
      </p>
      <p>
        By installing Bakeshop Growth OS Connector (&ldquo;the App&rdquo;) you
        agree to these terms. The App is provided by Bakeshop Digital to its
        clients to connect Shopify commerce data to a private analytics
        workspace.
      </p>

      <h2>Use of the App</h2>
      <p>
        The App reads store data on a read-only basis and syncs it for reporting
        and analytics. You may uninstall the App at any time from your Shopify
        admin, which stops all data syncing.
      </p>

      <h2>Availability</h2>
      <p>
        The App is provided on an &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo; basis. We make reasonable efforts to keep it running but
        do not guarantee uninterrupted availability.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Bakeshop Digital is not liable
        for any indirect or consequential damages arising from use of the App.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms; material changes will be reflected by the
        &ldquo;last updated&rdquo; date above.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:support@bakeshop.digital">support@bakeshop.digital</a>.
      </p>
    </LegalPage>
  );
}
