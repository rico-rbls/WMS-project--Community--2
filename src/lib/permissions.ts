// Permission definitions for WMS
export type Permission =
  // Inventory permissions
  | "inventory:read"
  | "inventory:create"
  | "inventory:update"
  | "inventory:delete"
  // Orders permissions
  | "orders:read"
  | "orders:create"
  | "orders:update"
  | "orders:delete"
  // Shipments permissions
  | "shipments:read"
  | "shipments:create"
  | "shipments:update"
  | "shipments:delete"
  // Suppliers permissions
  | "suppliers:read"
  | "suppliers:create"
  | "suppliers:update"
  | "suppliers:delete"
  // Purchase Orders permissions
  | "purchase_orders:read"
  | "purchase_orders:create"
  | "purchase_orders:update"
  | "purchase_orders:delete"
  | "purchase_orders:approve"
  | "purchase_orders:receive"
  // User management permissions
  | "users:read"
  | "users:create"
  | "users:update"
  | "users:delete"
  | "users:approve";

// Two-tier role system: Admin (full access) and Operator (read-only)
export type Role = "Admin" | "Operator";

// User status for approval workflow
export type UserStatus = "Active" | "Pending" | "Inactive";

// Role-based permission assignments
export const rolePermissions: Record<Role, Permission[]> = {
  Admin: [
    // Full access to all features
    "inventory:read", "inventory:create", "inventory:update", "inventory:delete",
    "orders:read", "orders:create", "orders:update", "orders:delete",
    "shipments:read", "shipments:create", "shipments:update", "shipments:delete",
    "suppliers:read", "suppliers:create", "suppliers:update", "suppliers:delete",
    "purchase_orders:read", "purchase_orders:create", "purchase_orders:update",
    "purchase_orders:delete", "purchase_orders:approve", "purchase_orders:receive",
    // User management
    "users:read", "users:create", "users:update", "users:delete", "users:approve",
  ],
  Operator: [
    // Read-only access to all data
    "inventory:read",
    "orders:read",
    "shipments:read",
    "suppliers:read",
    "purchase_orders:read",
  ],
};

// Helper function to check if a role has a specific permission
export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

// Helper function to get all permissions for a role
export function getPermissions(role: Role): Permission[] {
  return rolePermissions[role] ?? [];
}

// Check if user is admin
export function isAdmin(role: Role): boolean {
  return role === "Admin";
}

// Check if user can perform write operations
export function canWrite(role: Role): boolean {
  return role === "Admin";
}

// Get role for a user ID (now reads from localStorage users)
export function getUserRole(userId: string): Role {
  const USERS_STORAGE_KEY = "wms_users";
  try {
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (storedUsers) {
      const users = JSON.parse(storedUsers);
      const user = users.find((u: { id: string }) => u.id === userId);
      if (user && user.role) {
        return user.role as Role;
      }
    }
  } catch (error) {
    console.error("Error getting user role:", error);
  }
  // Default to Operator for safety
  return "Operator";
}

