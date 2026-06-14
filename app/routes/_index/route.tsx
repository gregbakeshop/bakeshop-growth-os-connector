import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <span className={styles.logo}>Bakeshop OS</span>
        <div className={styles.navLinks}>
          <a href="/privacy" className={styles.navLink}>Privacy</a>
          <a href="/terms" className={styles.navLink}>Terms</a>
          <a href="/support" className={styles.navLink}>Support</a>
        </div>
      </nav>

      <main className={styles.hero}>
        <div className={styles.badge}>
          <span className={styles.dot} />
          Built for Bakeshop Digital clients
        </div>

        <h1 className={styles.heading}>Your store data,<br />where you need it.</h1>

        <p className={styles.subheading}>
          Connect your Shopify store to your private Bakeshop analytics
          workspace. Read-only sync, zero configuration.
        </p>

        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <div className={styles.inputWrap}>
              <input
                className={styles.input}
                type="text"
                name="shop"
                placeholder="your-store.myshopify.com"
                autoComplete="off"
              />
            </div>
            <button className={styles.button} type="submit">
              Connect store
            </button>
          </Form>
        )}

        <div className={styles.features}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>🔒</div>
            <p className={styles.featureTitle}>Read-only access</p>
            <p className={styles.featureText}>
              Syncs orders, products, and discounts. Never writes to your store.
            </p>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>⚡</div>
            <p className={styles.featureTitle}>Automatic daily sync</p>
            <p className={styles.featureText}>
              Runs every night at 4 AM UTC, plus on-demand with Sync now.
            </p>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>📊</div>
            <p className={styles.featureTitle}>Private analytics</p>
            <p className={styles.featureText}>
              Data flows into your Bakeshop Growth OS workspace. Reporting lives there, not here.
            </p>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <span className={styles.footerText}>© 2026 Bakeshop Digital</span>
        <div className={styles.footerLinks}>
          <a href="/privacy" className={styles.footerLink}>Privacy</a>
          <a href="/terms" className={styles.footerLink}>Terms</a>
          <a href="mailto:hello@bakeshop.digital" className={styles.footerLink}>hello@bakeshop.digital</a>
        </div>
      </footer>
    </div>
  );
}
