import type {Metadata} from "next";
import {Inter} from "next/font/google";
import {NotificationBanner} from "@/components/common/NotificationBanner";
import {ThemeProvider} from "@/components/common/ThemeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LD OPEN HUB — 公益站导航",
  description: "公益站导航，由社区共建。",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
    <head>
        <script
            dangerouslySetInnerHTML={{
                __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
            }}
        />
    </head>
      <body
        className={`${inter.variable} min-h-screen font-sans antialiased`}
        suppressHydrationWarning
      >
      <ThemeProvider>
          <NotificationBanner/>
          {children}
      </ThemeProvider>
      </body>
    </html>
  );
}
