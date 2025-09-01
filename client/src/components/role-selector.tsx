import { Button } from "@/components/ui/button";
import { MapPin, Home, Store, Shield, X } from "lucide-react";
import { useLocation } from "wouter";

interface RoleSelectorProps {
  onSelect?: (role: string) => void;
  isVisible: boolean;
  onClose?: () => void;
}

export default function RoleSelector({ onSelect, isVisible, onClose }: RoleSelectorProps) {
  const [, setLocation] = useLocation();

  const handleRoleSelect = (role: string) => {
    if (onSelect) {
      onSelect(role);
    } else {
      // Default behavior - navigate to registration with role
      setLocation(`/register?role=${role}`);
    }
    
    if (onClose) {
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-3xl shadow-2xl border-0 p-8 ring-1 ring-gray-100 max-w-md w-full">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
                Welcome to Resicard©
              </h2>
              <p className="text-muted-foreground text-center">
                Exclusive deals for local residents and businesses
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="ml-2 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-3">
            <Button
              variant="default"
              className="w-full p-4 h-auto coastal-gradient text-white hover:opacity-90"
              onClick={() => handleRoleSelect('resident')}
            >
              <div className="flex items-center text-left w-full">
                <Home className="h-6 w-6 mr-4 flex-shrink-0" />
                <div>
                  <div className="font-semibold">I'm a Local Resident</div>
                  <div className="text-sm opacity-90">Browse and redeem exclusive deals</div>
                </div>
              </div>
            </Button>
            
            <Button
              variant="secondary"
              className="w-full p-4 h-auto bg-slate-600 text-white hover:bg-slate-700"
              onClick={() => handleRoleSelect('merchant')}
            >
              <div className="flex items-center text-left w-full">
                <Store className="h-6 w-6 mr-4 flex-shrink-0" />
                <div>
                  <div className="font-semibold">I'm a Business Owner</div>
                  <div className="text-sm opacity-90">Manage deals and track performance</div>
                </div>
              </div>
            </Button>
            
            <Button
              variant="secondary"
              className="w-full p-4 h-auto bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => handleRoleSelect('admin')}
            >
              <div className="flex items-center text-left w-full">
                <Shield className="h-6 w-6 mr-4 flex-shrink-0" />
                <div>
                  <div className="font-semibold">Platform Admin</div>
                  <div className="text-sm opacity-90">Manage platform and verify businesses</div>
                </div>
              </div>
            </Button>
          </div>
      </div>
    </div>
  );
}
