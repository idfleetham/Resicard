import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { homePathForRole } from "@/lib/auth";

export default function Navigation() {
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  const go = (path: string) => {
    setOpen(false);
    setLocation(path);
  };

  const homeLabel = user?.role === "merchant" ? "Portal" : user?.role === "admin" ? "Admin" : "My card";

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 text-slate-900" onClick={() => setOpen(false)}>
            <MapPin className="h-5 w-5 text-blue-600" />
            <span className="text-lg font-bold">Resicard</span>
            <span className="text-sm text-slate-500 hidden sm:inline">St Andrews</span>
          </Link>

          <div className="hidden sm:flex items-center gap-1">
            {isAuthenticated && user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => go(homePathForRole(user.role))}>
                  {homeLabel}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => go("/edit-profile")}>
                  Profile
                </Button>
                <Button variant="outline" size="sm" onClick={logout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => go("/login")}>
                  Log in
                </Button>
                <Button size="sm" onClick={() => go("/register")}>
                  Join
                </Button>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {open && (
          <div className="sm:hidden border-t border-slate-200 py-2 flex flex-col gap-1">
            {isAuthenticated && user ? (
              <>
                <Button variant="ghost" className="justify-start h-12 text-base" onClick={() => go(homePathForRole(user.role))}>
                  {homeLabel}
                </Button>
                <Button variant="ghost" className="justify-start h-12 text-base" onClick={() => go("/edit-profile")}>
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start h-12 text-base text-red-600"
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                >
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" className="justify-start h-12 text-base" onClick={() => go("/login")}>
                  Log in
                </Button>
                <Button className="h-12 text-base" onClick={() => go("/register")}>
                  Join Resicard
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
