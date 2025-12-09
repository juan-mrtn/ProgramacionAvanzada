import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Banking Transactions - Kafka Events",
  description: "Real-time banking transaction system with Kafka",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-background text-foreground">
        {/* Load fallback CSS from public to provide basic utilities when Tailwind isn't available */}
        <link rel="stylesheet" href="/fallback.css" />
        <header className="topbar">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="brand">
              <div className="brand-logo">↯</div>
              <div>
                <div className="brand-title">Banking Events System</div>
                <div className="brand-sub">Real-time transaction processing with Kafka</div>
              </div>
            </div>

            <div>
              <span className="status-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 14l2-2 2 2"/></svg>
                Disconnected
              </span>
            </div>
          </div>
        </header>

        <main className="app-page">{children}</main>
      </body>
    </html>
  )
}
