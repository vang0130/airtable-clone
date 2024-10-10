"use client";
import "~/styles/globals.css";
import { TRPCReactProvider } from "~/trpc/react";
import Head from "next/head";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <SessionProvider>
        <Head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
        </Head>
        <body className={`${inter.className} bg-gray-100`}>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </body>
      </SessionProvider>
    </html>
  );
}
