import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Instrument_Serif } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-editorial", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_URL || "http://localhost:3300"),
  title: { default: "Velaroute — the agentic inbound engine", template: "%s · Velaroute" },
  description: "Velaroute guards, enriches, routes and books every inbound lead in seconds — then makes sure someone replies inside your SLA.",
  icons: { icon: "/favicon.svg" },
  openGraph: { title: "Velaroute — the agentic inbound engine", description: "Every inbound lead, to the right rep, in minutes.", images: ["/og.png"] },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f7f6f2" }, { media: "(prefers-color-scheme: dark)", color: "#141413" }] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${plex.variable} ${serif.variable}`}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
