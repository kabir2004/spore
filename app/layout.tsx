import type { Metadata } from "next";
import { Arimo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/context/themeContext";
import { StoreRehydrate } from "@/lib/components/StoreRehydrate";

const arimo = Arimo({
  variable: "--font-arimo",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "aurora — Your AI workspace",
  description: "Notes, mail, meetings — unified.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('spore-theme');document.documentElement.classList.toggle('dark',t==='dark');})();`,
          }}
        />
      </head>
      <body className={`${arimo.variable} ${jetbrains.variable} font-sans antialiased bg-bg-primary text-text-primary`}>
        <ThemeProvider>
          <StoreRehydrate />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
