import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_URL || "http://localhost:3300"),
  title: { default: "Velaroute — the agentic inbound engine", template: "%s · Velaroute" },
  description: "Velaroute guards, enriches, routes and books every inbound lead in seconds — then makes sure someone replies inside your SLA.",
  icons: { icon: "/favicon.svg" },
  openGraph: { title: "Velaroute — the agentic inbound engine", description: "Every inbound lead, to the right rep, in minutes.", images: ["/og.png"] },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f6f6fb" }, { media: "(prefers-color-scheme: dark)", color: "#0d0e16" }] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${grotesk.variable}`}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
