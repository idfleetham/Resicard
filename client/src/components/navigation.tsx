import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { MapPin, Bell, User, LogOut, Settings, CreditCard } from "lucide-react";
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
    <nav className="bg-surface shadow-sm border-b border-dim">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={() => setLocation('/')}
              className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity"
            >
              <MapPin className="h-6 w-6 text-primary mr-2" />
              <span className="text-xl font-bold text-fg">Resicard</span>
              <span className="text-sm text-soft ml-2">St Andrews</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRoleNavigation}
                  className="text-soft hover:text-fg"
                >
                  <User className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-soft hover:text-fg"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-soft hover:text-fg">
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
                >
                  Login
                </Button>
                <Button
                  size="sm"
                  onClick={() => setLocation('/register')}
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
