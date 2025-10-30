import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type SuperAdmin } from "@shared/schema";

interface SuperAdminAuthContextType {
  superAdmin: SuperAdmin | null;
  login: (admin: SuperAdmin) => void;
  logout: () => void;
  isLoading: boolean;
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextType | undefined>(undefined);

export function SuperAdminAuthProvider({ children }: { children: ReactNode }) {
  const [superAdmin, setSuperAdmin] = useState<SuperAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedAdmin = localStorage.getItem("superAdmin");
    if (storedAdmin) {
      try {
        setSuperAdmin(JSON.parse(storedAdmin));
      } catch (error) {
        localStorage.removeItem("superAdmin");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (admin: SuperAdmin) => {
    setSuperAdmin(admin);
    localStorage.setItem("superAdmin", JSON.stringify(admin));
  };

  const logout = () => {
    setSuperAdmin(null);
    localStorage.removeItem("superAdmin");
  };

  return (
    <SuperAdminAuthContext.Provider value={{ superAdmin, login, logout, isLoading }}>
      {children}
    </SuperAdminAuthContext.Provider>
  );
}

export function useSuperAdminAuth() {
  const context = useContext(SuperAdminAuthContext);
  if (context === undefined) {
    throw new Error("useSuperAdminAuth must be used within a SuperAdminAuthProvider");
  }
  return context;
}
