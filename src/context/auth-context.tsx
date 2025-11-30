import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user database (for demo purposes)
const MOCK_USERS = [
  {
    id: "1",
    email: "admin@wms.com",
    password: "admin123",
    name: "Admin User",
  },
  {
    id: "2",
    email: "user@wms.com",
    password: "user123",
    name: "Regular User",
  },
];

const AUTH_STORAGE_KEY = "wms_auth_user";
const REMEMBER_ME_KEY = "wms_remember_me";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
        const rememberMe = localStorage.getItem(REMEMBER_ME_KEY);
        
        if (storedUser && rememberMe === "true") {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        } else {
          // Check session storage for non-persistent login
          const sessionUser = sessionStorage.getItem(AUTH_STORAGE_KEY);
          if (sessionUser) {
            const userData = JSON.parse(sessionUser);
            setUser(userData);
          }
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, rememberMe = false): Promise<void> => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Find user in mock database
    const foundUser = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!foundUser) {
      throw new Error("Invalid email or password");
    }

    // Create user object (without password)
    const userData: User = {
      id: foundUser.id,
      email: foundUser.email,
      name: foundUser.name,
    };

    setUser(userData);

    // Store in appropriate storage based on "remember me"
    if (rememberMe) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      localStorage.setItem(REMEMBER_ME_KEY, "true");
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      localStorage.removeItem(REMEMBER_ME_KEY);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

