import type { PropsWithChildren } from "react";
import Navbar from "./Navbar";

interface AppShellProps extends PropsWithChildren {
  mainClassName?: string;
}

const AppShell = ({ children, mainClassName = "flex-1" }: AppShellProps) => (
  <div
    className="flex min-h-dvh flex-col bg-linear-to-br from-slate-100 via-white to-slate-200 text-slate-900"
    style={{ minHeight: "var(--app-viewport-height, 100dvh)" }}
  >
    <Navbar />
    <main className={`flex min-h-0 flex-1 flex-col overflow-hidden ${mainClassName}`}>{children}</main>
  </div>
);

export default AppShell;
