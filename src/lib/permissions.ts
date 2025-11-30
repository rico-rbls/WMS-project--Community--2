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
  | "purchase_orders:receive";

export type Role = "admin" | "manager" | "warehouse_worker" | "user";

// Role-based permission assignments
export const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    // All permissions
    "inventory:read", "inventory:create", "inventory:update", "inventory:delete",
    "orders:read", "orders:create", "orders:update", "orders:delete",
    "shipments:read", "shipments:create", "shipments:update", "shipments:delete",
    "suppliers:read", "suppliers:create", "suppliers:update", "suppliers:delete",
    "purchase_orders:read", "purchase_orders:create", "purchase_orders:update", 
    "purchase_orders:delete", "purchase_orders:approve", "purchase_orders:receive",
  ],
  manager: [
    // All except delete
    "inventory:read", "inventory:create", "inventory:update",
    "orders:read", "orders:create", "orders:update",
    "shipments:read", "shipments:create", "shipments:update",
    "suppliers:read", "suppliers:create", "suppliers:update",
    "purchase_orders:read", "purchase_orders:create", "purchase_orders:update",
    "purchase_orders:approve", "purchase_orders:receive",
  ],
  warehouse_worker: [
    // Read and receive only
    "inventory:read", "inventory:update",
    "orders:read",
    "shipments:read", "shipments:update",
    "suppliers:read",
    "purchase_orders:read", "purchase_orders:receive",
  ],
  user: [
    // Read only
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

// Map user IDs to roles (mock data - in production this would come from a database)
export const userRoles: Record<string, Role> = {
  "1": "admin",      // admin@wms.com
  "2": "user",       // user@wms.com
  "3": "manager",    // For testing
  "4": "warehouse_worker", // For testing
};

// Get role for a user ID
export function getUserRole(userId: string): Role {
  return userRoles[userId] ?? "user";
}

