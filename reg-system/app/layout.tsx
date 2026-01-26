import type { Metadata } from "next";
import "./globals.css";
import { OfflineProvider } from "@/components/offline-provider";

export const metadata: Metadata = {
  title: "We Can Academy",
  description: "Weekend Skills Development System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased" style={{ fontFamily: 'Roboto, system-ui, sans-serif' }}>
        <OfflineProvider>
          {children}
        </OfflineProvider>
      </body>
    </html>
  );
}
