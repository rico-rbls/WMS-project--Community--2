import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db, COLLECTIONS } from "../lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, query } from "firebase/firestore";
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
  // Google account linking
  googleUserId?: string;
  googleEmail?: string;
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
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
  // User management (admin only)
  getAllUsers: () => StoredUser[];
  getPendingUsers: () => StoredUser[];
  approveUser: (userId: string) => Promise<void>;
  rejectUser: (userId: string) => Promise<void>;
  updateUserRole: (userId: string, role: Role) => Promise<void>;
  updateUserStatus: (userId: string, status: UserStatus) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  // Profile management
  updateProfile: (updates: { name?: string; phone?: string; address?: UserAddress }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  // Google account linking
  linkGoogleAccount: () => Promise<void>;
  unlinkGoogleAccount: () => Promise<void>;
  // Refresh users from Firestore
  refreshUsers: () => Promise<void>;
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
    email: "customer@wms.com",
    password: "customer123",
    name: "Customer User",
    role: "Customer",
    status: "Active",
    createdAt: "2024-01-15T00:00:00Z",
  },
];

// Helper to get users from localStorage (cache)
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

// Helper to save users to localStorage (cache)
function saveUsersToLocalStorage(users: StoredUser[]): void {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

// Helper to save a single user to Firestore
async function saveUserToFirestore(user: StoredUser): Promise<void> {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, user.id);
    await setDoc(userRef, user);
  } catch (error) {
    console.error("Error saving user to Firestore:", error);
    throw error;
  }
}

// Helper to get all users from Firestore
async function getUsersFromFirestore(): Promise<StoredUser[]> {
  try {
    const usersRef = collection(db, COLLECTIONS.USERS);
    const snapshot = await getDocs(usersRef);
    const users: StoredUser[] = [];
    snapshot.forEach((doc) => {
      users.push(doc.data() as StoredUser);
    });
    return users;
  } catch (error) {
    console.error("Error getting users from Firestore:", error);
    // Fall back to localStorage if Firestore fails
    const localUsers = getStoredUsers();
    // If localStorage is also empty, return DEFAULT_USERS
    if (localUsers.length === 0) {
      console.log("Falling back to DEFAULT_USERS");
      return DEFAULT_USERS;
    }
    return localUsers;
  }
}

// Helper to update a user in Firestore (creates document if it doesn't exist)
async function updateUserInFirestore(userId: string, updates: Partial<StoredUser>): Promise<void> {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    // First try to update
    try {
      await updateDoc(userRef, updates);
    } catch (updateError: unknown) {
      // If document doesn't exist, check if it's a default user and create it
      if (updateError instanceof Error && updateError.message.includes("No document to update")) {
        const defaultUser = DEFAULT_USERS.find(u => u.id === userId);
        if (defaultUser) {
          // Create the default user in Firestore with the updates
          await setDoc(userRef, { ...defaultUser, ...updates });
          console.log("Created default user in Firestore:", userId);
        } else {
          throw updateError;
        }
      } else {
        throw updateError;
      }
    }
  } catch (error) {
    console.error("Error updating user in Firestore:", error);
    throw error;
  }
}

// Helper to delete a user from Firestore
async function deleteUserFromFirestore(userId: string): Promise<void> {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await deleteDoc(userRef);
  } catch (error) {
    console.error("Error deleting user from Firestore:", error);
    throw error;
  }
}

// Initialize default users in Firestore if not present
async function initializeDefaultUsers(): Promise<StoredUser[]> {
  try {
    const existingUsers = await getUsersFromFirestore();
    if (existingUsers.length === 0) {
      // Seed default users to Firestore
      console.log("Seeding default users to Firestore...");
      for (const user of DEFAULT_USERS) {
        await saveUserToFirestore(user);
      }
      saveUsersToLocalStorage(DEFAULT_USERS);
      console.log("Default users seeded successfully");
      return DEFAULT_USERS;
    } else {
      // Sync Firestore users to localStorage cache
      saveUsersToLocalStorage(existingUsers);
      return existingUsers;
    }
  } catch (error) {
    console.error("Error initializing default users:", error);
    // Fall back to localStorage initialization
    const existing = getStoredUsers();
    if (existing.length === 0) {
      saveUsersToLocalStorage(DEFAULT_USERS);
      return DEFAULT_USERS;
    }
    return existing;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<StoredUser[]>([]);

  // Initialize users on mount and set up Firestore real-time listener
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initialize = async () => {
      await initializeDefaultUsers();

      // Set up real-time listener for users collection
      try {
        const usersRef = collection(db, COLLECTIONS.USERS);
        unsubscribe = onSnapshot(usersRef, (snapshot) => {
          const users: StoredUser[] = [];
          snapshot.forEach((doc) => {
            users.push(doc.data() as StoredUser);
          });
          setAllUsers(users);
          saveUsersToLocalStorage(users);
        }, (error) => {
          console.error("Error listening to users:", error);
          // Fall back to localStorage
          setAllUsers(getStoredUsers());
        });
      } catch (error) {
        console.error("Error setting up users listener:", error);
        setAllUsers(getStoredUsers());
      }
    };

    initialize();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
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
    console.log("[Login] Attempting login for:", email);

    // Fetch latest users from Firestore
    let users = await getUsersFromFirestore();
    console.log("[Login] Users from Firestore:", users.length, users.map(u => u.email));

    // ALWAYS merge DEFAULT_USERS with Firestore users to ensure default accounts work
    // Only add default users that don't already exist in Firestore
    const existingEmails = new Set(users.map(u => u.email.toLowerCase()));
    for (const defaultUser of DEFAULT_USERS) {
      if (!existingEmails.has(defaultUser.email.toLowerCase())) {
        users.push(defaultUser);
        console.log("[Login] Added default user:", defaultUser.email);
      }
    }

    console.log("[Login] Final users list:", users.length, users.map(u => u.email));

    // First check if email exists
    const userByEmail = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    console.log("[Login] Found user:", userByEmail?.email || "NOT FOUND");

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

    // Update last login in Firestore (ignore errors for this)
    const lastLogin = new Date().toISOString();
    try {
      await updateUserInFirestore(foundUser.id, { lastLogin });
    } catch (error) {
      console.warn("Could not update lastLogin in Firestore:", error);
    }

    // Create user object (without password)
    const userData: User = {
      id: foundUser.id,
      email: foundUser.email,
      name: foundUser.name,
      role: foundUser.role,
      status: foundUser.status,
      createdAt: foundUser.createdAt,
      lastLogin,
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
    // Fetch latest users from Firestore
    const users = await getUsersFromFirestore();

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
      role: "Customer", // New users default to Customer role
      status: "Pending", // Requires admin approval
      createdAt: new Date().toISOString(),
    };

    // Save to Firestore
    await saveUserToFirestore(newUser);
  };

  const loginWithGoogle = async (): Promise<void> => {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      if (!googleUser.email) {
        throw new Error("No email associated with this Google account");
      }

      // Fetch latest users from Firestore
      const users = await getUsersFromFirestore();

      // First, check if this Google account is already linked to a WMS user
      let linkedUser = users.find(
        (u) => u.googleUserId === googleUser.uid
      );

      // If not linked by googleUserId, fall back to email matching
      if (!linkedUser) {
        linkedUser = users.find(
          (u) => u.email.toLowerCase() === googleUser.email!.toLowerCase()
        );
      }

      if (linkedUser) {
        // User exists - check status
        if (linkedUser.status === "Pending") {
          throw new Error("PENDING:Your account is pending approval. Please wait for an administrator to approve your account.");
        }

        if (linkedUser.status === "Inactive") {
          throw new Error("INACTIVE:Your account has been deactivated. Please contact an administrator.");
        }

        // Update last login in Firestore
        const lastLogin = new Date().toISOString();
        await updateUserInFirestore(linkedUser.id, { lastLogin });

        // Create user object (without password)
        const userData: User = {
          id: linkedUser.id,
          email: linkedUser.email,
          name: linkedUser.name,
          role: linkedUser.role,
          status: linkedUser.status,
          createdAt: linkedUser.createdAt,
          lastLogin,
          phone: linkedUser.phone,
          address: linkedUser.address,
          googleUserId: linkedUser.googleUserId,
          googleEmail: linkedUser.googleEmail,
        };

        setUser(userData);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
        localStorage.setItem(REMEMBER_ME_KEY, "true");
      } else {
        // New user - create account with Pending status
        const newUser: StoredUser = {
          id: `google_${googleUser.uid}`,
          email: googleUser.email,
          password: "", // No password for Google users
          name: googleUser.displayName || googleUser.email.split("@")[0],
          role: "Customer", // New users default to Customer role
          status: "Pending", // Requires admin approval
          createdAt: new Date().toISOString(),
          googleUserId: googleUser.uid,
          googleEmail: googleUser.email,
        };

        // Save to Firestore
        await saveUserToFirestore(newUser);

        throw new Error("PENDING:Your account has been created and is pending approval. Please wait for an administrator to approve your account.");
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Re-throw our custom errors
        if (error.message.startsWith("PENDING:") ||
            error.message.startsWith("INACTIVE:") ||
            error.message.includes("popup-closed-by-user")) {
          throw error;
        }
        // Handle Firebase errors
        if (error.message.includes("auth/")) {
          throw new Error("Google sign-in failed. Please try again.");
        }
        throw error;
      }
      throw new Error("Google sign-in failed. Please try again.");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  };

  // User management functions (admin only)
  const getAllUsers = useCallback((): StoredUser[] => {
    // Return the real-time synced users from state
    return allUsers.length > 0 ? allUsers : getStoredUsers();
  }, [allUsers]);

  const getPendingUsers = useCallback((): StoredUser[] => {
    const users = allUsers.length > 0 ? allUsers : getStoredUsers();
    return users.filter(u => u.status === "Pending");
  }, [allUsers]);

  const refreshUsers = useCallback(async (): Promise<void> => {
    const users = await getUsersFromFirestore();
    setAllUsers(users);
    saveUsersToLocalStorage(users);
  }, []);

  const approveUser = useCallback(async (userId: string): Promise<void> => {
    await updateUserInFirestore(userId, { status: "Active" as UserStatus });
  }, []);

  const rejectUser = useCallback(async (userId: string): Promise<void> => {
    await deleteUserFromFirestore(userId);
  }, []);

  const updateUserRole = useCallback(async (userId: string, role: Role): Promise<void> => {
    await updateUserInFirestore(userId, { role });
    // Update current user if they changed their own role
    if (user && user.id === userId) {
      setUser({ ...user, role });
    }
  }, [user]);

  const updateUserStatus = useCallback(async (userId: string, status: UserStatus): Promise<void> => {
    await updateUserInFirestore(userId, { status });
    // Log out if current user is deactivated
    if (user && user.id === userId && status !== "Active") {
      logout();
    }
  }, [user]);

  const deleteUser = useCallback(async (userId: string): Promise<void> => {
    await deleteUserFromFirestore(userId);
    // Log out if current user is deleted
    if (user && user.id === userId) {
      logout();
    }
  }, [user]);

  // Profile management
  const updateProfile = useCallback(async (updates: { name?: string; phone?: string; address?: UserAddress }): Promise<void> => {
    if (!user) return;

    // Update in Firestore
    await updateUserInFirestore(user.id, updates);

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

    // Fetch latest user data from Firestore
    const users = await getUsersFromFirestore();
    const currentUser = users.find(u => u.id === user.id);

    if (!currentUser || currentUser.password !== currentPassword) {
      throw new Error("Current password is incorrect");
    }

    // Update password in Firestore
    await updateUserInFirestore(user.id, { password: newPassword });
  }, [user]);

  // Google account linking
  const linkGoogleAccount = useCallback(async (): Promise<void> => {
    if (!user) throw new Error("Not authenticated");

    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      if (!googleUser.email) {
        throw new Error("No email associated with this Google account");
      }

      // Fetch latest users from Firestore
      const users = await getUsersFromFirestore();

      // Check if this Google account is already linked to another user
      const existingLinkedUser = users.find(
        (u) => u.googleUserId === googleUser.uid && u.id !== user.id
      );

      if (existingLinkedUser) {
        throw new Error("This Google account is already linked to another WMS account");
      }

      // Update current user with Google account info in Firestore
      await updateUserInFirestore(user.id, {
        googleUserId: googleUser.uid,
        googleEmail: googleUser.email
      });

      // Update current session
      const updatedUser: User = {
        ...user,
        googleUserId: googleUser.uid,
        googleEmail: googleUser.email!,
      };
      setUser(updatedUser);

      // Update stored session
      const rememberMe = localStorage.getItem(REMEMBER_ME_KEY);
      if (rememberMe === "true") {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      } else {
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes("popup-closed-by-user")) {
          throw new Error("Google sign-in was cancelled");
        }
        if (error.message.includes("auth/")) {
          throw new Error("Google sign-in failed. Please try again.");
        }
        throw error;
      }
      throw new Error("Failed to link Google account. Please try again.");
    }
  }, [user]);

  const unlinkGoogleAccount = useCallback(async (): Promise<void> => {
    if (!user) throw new Error("Not authenticated");

    if (!user.googleUserId) {
      throw new Error("No Google account is currently linked");
    }

    // Remove Google account info from user in Firestore
    await updateUserInFirestore(user.id, {
      googleUserId: null,
      googleEmail: null
    });

    // Update current session
    const updatedUser: User = {
      ...user,
      googleUserId: undefined,
      googleEmail: undefined,
    };
    setUser(updatedUser);

    // Update stored session
    const rememberMe = localStorage.getItem(REMEMBER_ME_KEY);
    if (rememberMe === "true") {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    }
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginWithGoogle,
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
    linkGoogleAccount,
    unlinkGoogleAccount,
    refreshUsers,
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

