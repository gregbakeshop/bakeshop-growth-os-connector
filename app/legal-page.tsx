import type { ReactNode } from "react";

// Shared shell for the public legal/support pages. Plain HTML — no auth, no
// Polaris/App Bridge (these are reachable outside the embedded admin). Lives
// outside app/routes so flatRoutes does not treat it as a route.
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "48px 24px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        lineHeight: 1.6,
        color: "#1a1a1a",
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>{title}</h1>
      <p style={{ color: "#6b6b6b", marginTop: 0 }}>
        Bakeshop OS
      </p>
      {children}
      <hr
        style={{
          margin: "40px 0 16px",
          border: "none",
          borderTop: "1px solid #eee",
        }}
      />
      <p style={{ fontSize: 14, color: "#6b6b6b" }}>
        Bakeshop Digital ·{" "}
        <a href="mailto:hello@bakeshop.digital">hello@bakeshop.digital</a> ·{" "}
        <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> ·{" "}
        <a href="/support">Support</a>
      </p>
    </main>
  );
}
