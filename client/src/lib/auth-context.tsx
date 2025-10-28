import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type Vendor } from "@shared/schema";

interface AuthContextType {
  vendor: Vendor | null;
  login: (vendor: Vendor) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedVendor = localStorage.getItem("vendor");
    if (storedVendor) {
      try {
        setVendor(JSON.parse(storedVendor));
      } catch (error) {
        localStorage.removeItem("vendor");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (vendor: Vendor) => {
    setVendor(vendor);
    localStorage.setItem("vendor", JSON.stringify(vendor));
  };

  const logout = () => {
    setVendor(null);
    localStorage.removeItem("vendor");
  };

  return (
    <AuthContext.Provider value={{ vendor, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
