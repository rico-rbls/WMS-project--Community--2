import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { Role, UserStatus } from "../lib/permissions";

export interface UserAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  lastLogin?: string;
  phone?: string;
  address?: UserAddress;
}

// Stored user includes password (for mock auth)
interface StoredUser extends User {
  password: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
  // User management (admin only)
  getAllUsers: () => StoredUser[];
  getPendingUsers: () => StoredUser[];
  approveUser: (userId: string) => void;
  rejectUser: (userId: string) => void;
  updateUserRole: (userId: string, role: Role) => void;
  updateUserStatus: (userId: string, status: UserStatus) => void;
  deleteUser: (userId: string) => void;
  // Profile management
  updateProfile: (updates: { name?: string; phone?: string; address?: UserAddress }) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "wms_auth_user";
const REMEMBER_ME_KEY = "wms_remember_me";
const USERS_STORAGE_KEY = "wms_users";

// Default users (seeded on first load)
const DEFAULT_USERS: StoredUser[] = [
  {
    id: "0",
    email: "owner@wms.com",
    password: "owner123",
    name: "System Owner",
    role: "Owner",
    status: "Active",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "1",
    email: "admin@wms.com",
    password: "admin123",
    name: "Admin User",
    role: "Admin",
    status: "Active",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    email: "operator@wms.com",
    password: "operator123",
    name: "Operator User",
    role: "Operator",
    status: "Active",
    createdAt: "2024-01-15T00:00:00Z",
  },
];

// Helper to get users from localStorage
function getStoredUsers(): StoredUser[] {
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error reading users from storage:", error);
  }
  return [];
}

// Helper to save users to localStorage
function saveUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

// Initialize users if not present
function initializeUsers(): void {
  const existing = getStoredUsers();
  if (existing.length === 0) {
    saveUsers(DEFAULT_USERS);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize users on mount
  useEffect(() => {
    initializeUsers();
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
        const rememberMe = localStorage.getItem(REMEMBER_ME_KEY);

        if (storedUser && rememberMe === "true") {
          const userData = JSON.parse(storedUser);
          // Verify user still exists and is active
          const users = getStoredUsers();
          const currentUser = users.find(u => u.id === userData.id);
          if (currentUser && currentUser.status === "Active") {
            setUser({
              id: currentUser.id,
              email: currentUser.email,
              name: currentUser.name,
              role: currentUser.role,
              status: currentUser.status,
              createdAt: currentUser.createdAt,
              lastLogin: currentUser.lastLogin,
            });
          }
        } else {
          // Check session storage for non-persistent login
          const sessionUser = sessionStorage.getItem(AUTH_STORAGE_KEY);
          if (sessionUser) {
            const userData = JSON.parse(sessionUser);
            const users = getStoredUsers();
            const currentUser = users.find(u => u.id === userData.id);
            if (currentUser && currentUser.status === "Active") {
              setUser({
                id: currentUser.id,
                email: currentUser.email,
                name: currentUser.name,
                role: currentUser.role,
                status: currentUser.status,
                createdAt: currentUser.createdAt,
                lastLogin: currentUser.lastLogin,
              });
            }
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

    // Find user in stored users
    const users = getStoredUsers();

    // First check if email exists
    const userByEmail = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!userByEmail) {
      throw new Error("NO_ACCOUNT:No account found with this email address. Would you like to create one?");
    }

    // Check password
    if (userByEmail.password !== password) {
      throw new Error("WRONG_PASSWORD:Incorrect password. Please try again.");
    }

    const foundUser = userByEmail;

    // Check if user is active
    if (foundUser.status === "Pending") {
      throw new Error("PENDING:Your account is pending approval. Please wait for an administrator to approve your account.");
    }

    if (foundUser.status === "Inactive") {
      throw new Error("INACTIVE:Your account has been deactivated. Please contact an administrator.");
    }

    // Update last login
    const updatedUsers = users.map(u =>
      u.id === foundUser.id
        ? { ...u, lastLogin: new Date().toISOString() }
        : u
    );
    saveUsers(updatedUsers);

    // Create user object (without password)
    const userData: User = {
      id: foundUser.id,
      email: foundUser.email,
      name: foundUser.name,
      role: foundUser.role,
      status: foundUser.status,
      createdAt: foundUser.createdAt,
      lastLogin: new Date().toISOString(),
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

  const register = async (email: string, password: string, name: string): Promise<void> => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const users = getStoredUsers();

    // Check if email already exists
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with this email already exists");
    }

    // Create new user with Pending status
    const newUser: StoredUser = {
      id: `user_${Date.now()}`,
      email,
      password,
      name,
      role: "Operator", // New users default to Operator role
      status: "Pending", // Requires admin approval
      createdAt: new Date().toISOString(),
    };

    saveUsers([...users, newUser]);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  };

  // User management functions (admin only)
  const getAllUsers = useCallback((): StoredUser[] => {
    return getStoredUsers();
  }, []);

  const getPendingUsers = useCallback((): StoredUser[] => {
    return getStoredUsers().filter(u => u.status === "Pending");
  }, []);

  const approveUser = useCallback((userId: string): void => {
    const users = getStoredUsers();
    const updatedUsers = users.map(u =>
      u.id === userId ? { ...u, status: "Active" as UserStatus } : u
    );
    saveUsers(updatedUsers);
  }, []);

  const rejectUser = useCallback((userId: string): void => {
    const users = getStoredUsers();
    const updatedUsers = users.filter(u => u.id !== userId);
    saveUsers(updatedUsers);
  }, []);

  const updateUserRole = useCallback((userId: string, role: Role): void => {
    const users = getStoredUsers();
    const updatedUsers = users.map(u =>
      u.id === userId ? { ...u, role } : u
    );
    saveUsers(updatedUsers);
    // Update current user if they changed their own role
    if (user && user.id === userId) {
      setUser({ ...user, role });
    }
  }, [user]);

  const updateUserStatus = useCallback((userId: string, status: UserStatus): void => {
    const users = getStoredUsers();
    const updatedUsers = users.map(u =>
      u.id === userId ? { ...u, status } : u
    );
    saveUsers(updatedUsers);
    // Log out if current user is deactivated
    if (user && user.id === userId && status !== "Active") {
      logout();
    }
  }, [user]);

  const deleteUser = useCallback((userId: string): void => {
    const users = getStoredUsers();
    const updatedUsers = users.filter(u => u.id !== userId);
    saveUsers(updatedUsers);
    // Log out if current user is deleted
    if (user && user.id === userId) {
      logout();
    }
  }, [user]);

  // Profile management
  const updateProfile = useCallback((updates: { name?: string; phone?: string; address?: UserAddress }): void => {
    if (!user) return;
    const users = getStoredUsers();
    const updatedUsers = users.map(u =>
      u.id === user.id ? { ...u, ...updates } : u
    );
    saveUsers(updatedUsers);
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    // Update stored session
    const rememberMe = localStorage.getItem(REMEMBER_ME_KEY);
    if (rememberMe === "true") {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    }
  }, [user]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!user) throw new Error("Not authenticated");

    await new Promise((resolve) => setTimeout(resolve, 500));

    const users = getStoredUsers();
    const currentUser = users.find(u => u.id === user.id);

    if (!currentUser || currentUser.password !== currentPassword) {
      throw new Error("Current password is incorrect");
    }

    const updatedUsers = users.map(u =>
      u.id === user.id ? { ...u, password: newPassword } : u
    );
    saveUsers(updatedUsers);
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register,
    getAllUsers,
    getPendingUsers,
    approveUser,
    rejectUser,
    updateUserRole,
    updateUserStatus,
    deleteUser,
    updateProfile,
    changePassword,
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

