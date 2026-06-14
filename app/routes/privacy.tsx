import { LegalPage } from "../legal-page";

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        <strong>Last updated: June 13, 2026.</strong>
      </p>
      <p>
        Bakeshop OS (&ldquo;the App&rdquo;) is operated by
        Bakeshop Digital. The App connects a Shopify store&apos;s read-only
        commerce data to the merchant&apos;s private Bakeshop Growth OS analytics
        workspace.
      </p>

      <h2>What we access</h2>
      <p>
        With the store owner&apos;s authorization, the App reads the following
        data through the Shopify Admin API: orders, products, customers, and
        discounts. Access is <strong>read-only</strong>. The App does not modify
        any data in the Shopify store.
      </p>

      <h2>How we use it</h2>
      <p>
        Data is synced into a secure data store and used solely to provide
        reporting, growth analysis, and performance insights to the merchant
        through Bakeshop Digital&apos;s services. We do not sell data and do not
        share it with third parties for their own marketing.
      </p>

      <h2>Storage and security</h2>
      <p>
        Shopify access tokens are encrypted at rest (AES-256-GCM). Data is stored
        on infrastructure controlled by Bakeshop Digital. Access is limited to
        authorized Bakeshop personnel.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        When the App is uninstalled, syncing stops immediately. In line with
        Shopify&apos;s requirements, all data associated with a store is deleted
        upon a <code>shop/redact</code> request (sent ~48 hours after
        uninstall). Individual customer data is deleted on a{" "}
        <code>customers/redact</code> request. To request deletion at any time,
        email{" "}
        <a href="mailto:support@bakeshop.digital">support@bakeshop.digital</a>.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy:{" "}
        <a href="mailto:support@bakeshop.digital">support@bakeshop.digital</a>.
      </p>
    </LegalPage>
  );
}
