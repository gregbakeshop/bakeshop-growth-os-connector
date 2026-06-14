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
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Bakeshop OS</h1>
        <p className={styles.text}>
          Connect your Shopify store&apos;s read-only commerce data to your
          private Bakeshop analytics workspace.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Read-only access</strong>. Syncs orders, products,
            customers, and discounts. Never writes to your store.
          </li>
          <li>
            <strong>Automatic daily sync</strong>. Plus a Sync now button for
            on-demand refreshes.
          </li>
          <li>
            <strong>Built for Bakeshop Digital clients</strong>. Powers your
            private Growth OS reporting workspace.
          </li>
        </ul>
      </div>
    </div>
  );
}
