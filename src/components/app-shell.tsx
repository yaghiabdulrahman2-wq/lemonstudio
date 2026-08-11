import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, LogIn, LogOut, Plug, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Projects", icon: LayoutGrid },
  { to: "/plugin", label: "Plugin", icon: Plug },
] as const;

function AccountMenu() {
  const { isAnonymous, email, signOut } = useAuth();

  if (isAnonymous) {
    return (
      <Button asChild size="sm" variant="outline" className="w-full justify-start gap-2">
        <Link to="/auth">
          <LogIn className="size-4" /> Sign in
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" className="w-full justify-start gap-2">
          <UserRound className="size-4" />
          <span className="truncate">{email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <AccountMenu />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3 md:hidden">
          <Logo />
          <div className="flex items-center gap-1">
            {NAV.map((item) => (
              <Button key={item.to} asChild variant="ghost" size="icon" aria-label={item.label}>
                <Link to={item.to}>
                  <item.icon className="size-4" />
                </Link>
              </Button>
            ))}
            <Button asChild variant="ghost" size="icon" aria-label="Account">
              <Link to="/auth">
                <UserRound className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
