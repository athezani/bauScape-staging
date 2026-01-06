/**
 * MobileNav Component
 * Mobile navigation drawer for provider portal
 */

import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, PawPrint, ClipboardList, LayoutDashboard, BarChart3, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface MobileNavProps {
  onLogout: () => void;
}

export const MobileNav = ({ onLogout }: MobileNavProps) => {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/orders", label: "Gestione ordini", icon: ClipboardList },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
              <PawPrint className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-lg">FlixDog</SheetTitle>
              <p className="text-sm text-muted-foreground">Provider Portal</p>
            </div>
          </div>
        </SheetHeader>
        
        <nav className="flex flex-col gap-1 mt-6">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-4 right-4">
          <Button 
            onClick={() => {
              onLogout();
              setOpen(false);
            }} 
            variant="outline" 
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
