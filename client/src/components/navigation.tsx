import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { MapPin, Bell, User, LogOut, Settings, CreditCard, Menu, X } from "lucide-react";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navigation() {
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleRoleNavigation = () => {
    if (!user) return;
    
    switch (user.role) {
      case 'resident':
        setLocation('/resident');
        break;
      case 'merchant':
        setLocation('/merchant');
        break;
      case 'admin':
        setLocation('/admin');
        break;
      default:
        setLocation('/');
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={() => setLocation('/')}
              className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity"
            >
              <MapPin className="h-6 w-6 text-primary mr-2" />
              <span className="text-xl font-bold text-slate-900">Resicard</span>
              <span className="text-sm text-slate-600 ml-2 hidden sm:inline">St Andrews</span>
            </button>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRoleNavigation}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <User className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-600 hover:text-slate-900"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                      <User className="h-4 w-4 mr-2" />
                      {user?.username}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-surface2 border-dim">
                    <DropdownMenuItem onClick={handleRoleNavigation} className="text-fg hover:bg-surface">
                      <User className="h-4 w-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation('/edit-profile')} className="text-fg hover:bg-surface">
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Profile
                    </DropdownMenuItem>
                    {user?.role === 'resident' && (
                      <DropdownMenuItem onClick={() => {
                        handleRoleNavigation();
                        // Navigate to subscription tab would be handled by dashboard state
                      }} className="text-fg hover:bg-surface">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Subscription
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={logout} className="text-fg hover:bg-surface">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation('/login')}
                  className="text-slate-600 hover:text-slate-900"
                >
                  Login
                </Button>
                <Button
                  size="sm"
                  onClick={() => setLocation('/register')}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-600 hover:text-slate-900"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="px-4 py-2 space-y-2">
              {isAuthenticated ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      handleRoleNavigation();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setLocation('/edit-profile');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  {user?.role === 'resident' && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        handleRoleNavigation();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Subscription
                    </Button>
                  )}
                  <div className="pt-2 border-t border-slate-200">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout ({user?.username})
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setLocation('/login');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  >
                    Login
                  </Button>
                  <Button
                    onClick={() => {
                      setLocation('/register');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
