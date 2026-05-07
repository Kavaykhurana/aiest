import type { Metadata } from "next"
import { DM_Sans, IBM_Plex_Mono } from "next/font/google"

import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
})

export const metadata: Metadata = {
  title: "CellScan",
  description: "Case management dashboard for malaria red blood cell diagnostics.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${ibmPlexMono.variable}`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var theme = window.localStorage.getItem("cellscan-theme") || "dark";
                  document.documentElement.classList.toggle("dark", theme === "dark");
                  document.documentElement.style.colorScheme = theme;
                } catch (_) {
                  document.documentElement.classList.add("dark");
                }
              })();
            `,
          }}
        />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
