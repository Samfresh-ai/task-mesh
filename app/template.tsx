import type { ReactNode } from "react";

export default function AppTemplate({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <div className="page-appear">{children}</div>;
}
