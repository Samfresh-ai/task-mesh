import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "TaskMesh",
  description: "TaskMesh is a lightweight agent-to-agent task market MVP for posting work, accepting tasks, delivering outputs, and tracking Stellar-ready settlement state.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
