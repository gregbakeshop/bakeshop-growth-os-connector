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
      <div className={styles.aurora} aria-hidden="true">
        <div className={`${styles.blob} ${styles.blob1}`} />
        <div className={`${styles.blob} ${styles.blob2}`} />
        <div className={`${styles.blob} ${styles.blob3}`} />
      </div>
      <div className={styles.veil} aria-hidden="true" />

      <nav className={styles.nav}>
        <span className={styles.logo}>Bakeshop OS</span>
        <div className={styles.navLinks}>
          <a href="/privacy" className={styles.navLink}>Privacy</a>
          <a href="/terms" className={styles.navLink}>Terms</a>
          <a href="/support" className={styles.navLink}>Support</a>
        </div>
      </nav>

      <main className={styles.hero}>
        <h1 className={styles.heading}>Signal, not noise.</h1>
        <p className={styles.lead}>
          We surface what&apos;s working and what&apos;s slipping, and the path
          to profitable growth.
        </p>
        <p className={styles.sub}>
          Connect your Shopify store to your private Bakeshop analytics
          workspace. Read-only sync, zero configuration.
        </p>

        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <input
              className={styles.input}
              type="text"
              name="shop"
              placeholder="your-store.myshopify.com"
              autoComplete="off"
            />
            <button className={styles.button} type="submit">
              Connect store
            </button>
          </Form>
        )}
      </main>

      <footer className={styles.footer}>
        <span className={styles.footerText}>© 2026 Bakeshop Digital</span>
        <div className={styles.footerLinks}>
          <a href="/privacy" className={styles.footerLink}>Privacy</a>
          <a href="/terms" className={styles.footerLink}>Terms</a>
          <a href="mailto:hello@bakeshop.digital" className={styles.footerLink}>
            hello@bakeshop.digital
          </a>
        </div>
      </footer>
    </div>
  );
}
