"use client";

import {
  Activity, Bell, Bot, Braces, ChevronsLeft, ChevronsRight, CircleUserRound,
  ClipboardCheck, Command, Cpu, HeartPulse, LayoutDashboard, Menu, Moon, Search,
  ShieldCheck, Sun, X, DatabaseZap, Siren, ScrollText, Store, Target,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const navigation = [
  { href: "/", label: "Executive", icon: LayoutDashboard },
  { href: "/executive-analytics", label: "Board analytics", icon: Activity },
  { href: "/compliance", label: "Compliance", icon: ClipboardCheck },
  { href: "/security", label: "Security", icon: ShieldCheck },
  { href: "/risk", label: "Risk", icon: Target },
  { href: "/incidents", label: "Incidents", icon: Siren },
  { href: "/audit", label: "Audit logs", icon: ScrollText },
  { href: "/phi-access", label: "PHI access", icon: HeartPulse },
  { href: "/data-streams", label: "Data streams", icon: DatabaseZap },
  { href: "/iomt", label: "IoMT fleet", icon: Cpu },
  { href: "/iomt-security", label: "IoMT security", icon: ShieldCheck },
  { href: "/ai-security", label: "AI / ML", icon: Bot },
  { href: "/developer", label: "Developer", icon: Braces },
  { href: "/marketplace", label: "Marketplace", icon: Store },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { sidebarCollapsed, mobileNavOpen, toggleSidebar, setMobileNav, theme, setTheme, globalSearch, setGlobalSearch } = useUiStore();
  return (
    <div className="min-h-screen overflow-x-clip">
      {mobileNavOpen && <button className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setMobileNav(false)} aria-label="Close navigation overlay" />}
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-hidden border-r border-border bg-card/95 shadow-xl backdrop-blur-xl transition-[width,transform] duration-300 lg:translate-x-0 lg:shadow-none", sidebarCollapsed && "lg:w-[76px]", mobileNavOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-white shadow-glow"><Activity className="size-4" /></div>
          {!sidebarCollapsed && <div><div className="text-sm font-bold tracking-tight">HealthGov</div><div className="text-[10px] text-foreground/45">CONTROL PLANE</div></div>}
          <Button className="ml-auto lg:hidden" variant="ghost" size="icon" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X className="size-4" /></Button>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-3" aria-label="Primary">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return <Link key={href} href={href} title={sidebarCollapsed ? label : undefined} onClick={() => setMobileNav(false)} className={cn("focus-ring flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-foreground/58 transition hover:bg-muted/70 hover:text-foreground", active && "bg-primary/10 text-primary", sidebarCollapsed && "lg:justify-center lg:px-0")}><Icon className="size-[18px] shrink-0" />{!sidebarCollapsed && <span>{label}</span>}{active && !sidebarCollapsed && <span className="ml-auto size-1.5 rounded-full bg-primary" />}</Link>;
          })}
        </nav>
        <div className="border-t border-border p-3">
          <button onClick={() => void logout()} title="Sign out" className={cn("flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted/70", sidebarCollapsed && "lg:justify-center")}><div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-cyan-500 text-xs font-bold text-white">JA</div>{!sidebarCollapsed && <div className="min-w-0"><div className="truncate text-xs font-semibold">Joy Abu</div><div className="truncate text-[10px] text-foreground/45">Security admin · Sign out</div></div>}</button>
        </div>
      </aside>
      <div className={cn("min-w-0 transition-[padding] duration-300 lg:pl-64", sidebarCollapsed && "lg:pl-[76px]")}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu className="size-5" /></Button>
          <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={toggleSidebar} aria-label="Collapse navigation">{sidebarCollapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}</Button>
          <div className="relative hidden max-w-md flex-1 md:block"><Search className="absolute left-3 top-2.5 size-4 text-foreground/35" /><input value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Search controls, assets, events…" className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary/25" aria-label="Global search" /><kbd className="absolute right-3 top-2.5 rounded border border-border px-1.5 text-[10px] text-foreground/40"><Command className="mr-0.5 inline size-3" />K</kbd></div>
          <div className="ml-auto flex items-center gap-1">
            <span className="mr-2 hidden items-center gap-2 text-[11px] font-semibold text-foreground/50 sm:flex"><span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />All systems operational</span>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}</Button>
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative"><Bell className="size-4" /><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-danger" /></Button>
            <Button variant="ghost" size="icon" aria-label="User menu"><CircleUserRound className="size-5" /></Button>
          </div>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
