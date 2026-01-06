/**
 * DashboardHeader Component
 * Main navigation header for provider portal
 */

import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, PawPrint, ClipboardList, LayoutDashboard, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileNav } from "./MobileNav";

interface DashboardHeaderProps {
  onLogout: () => void;
}

export const DashboardHeader = ({ onLogout }: DashboardHeaderProps) => {
  const location = useLocation();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/orders", label: "Gestione ordini", icon: ClipboardList },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-6">
          <MobileNav onLogout={onLogout} />
          <div className="flex items-center gap-2 md:gap-3">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary flex items-center justify-center">
              <PawPrint className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-foreground">FlixDog</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Provider Portal</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <Button onClick={onLogout} variant="outline" size="sm" className="hidden md:flex">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
};
