import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider } from "@/lib/store/app-provider";
import { AuthProvider } from "@/lib/auth/auth-provider";
import { EnvBanner } from "@/components/layout/env-banner";
import { UATPanel } from "@/components/layout/uat-panel";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "NovaHR",
    template: "%s | NovaHR",
  },
  description: "Modern HR and payroll for growing South African companies.",
  icons: {
    icon: [{ url: "/logo-icon.png", type: "image/png" }],
    apple: { url: "/logo-icon.png", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-svh">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <EnvBanner />
          <AppProvider>
            <AuthProvider>
              <TooltipProvider delayDuration={150}>
                {children}
                <UATPanel />
                <Toaster position="top-right" richColors closeButton />
              </TooltipProvider>
            </AuthProvider>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
