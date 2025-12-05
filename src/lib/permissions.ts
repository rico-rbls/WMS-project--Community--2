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
  | "users:approve"
  // Admin management (Owner only)
  | "users:manage_admins"
  // System settings (Owner only)
  | "system:settings";

// Role hierarchy: Owner > Admin > Operator > Viewer
// Owner: Full system access including admin management
// Admin: Full access except admin user management
// Operator: Read-only access to operational data
// Viewer: Read-only access (basic view permissions)
export type Role = "Owner" | "Admin" | "Operator" | "Viewer";

// User status for approval workflow
export type UserStatus = "Active" | "Pending" | "Inactive";

// Role hierarchy for comparison (higher number = higher privilege)
export const ROLE_HIERARCHY: Record<Role, number> = {
  Owner: 4,
  Admin: 3,
  Operator: 2,
  Viewer: 1,
};

// Role-based permission assignments
export const rolePermissions: Record<Role, Permission[]> = {
  Owner: [
    // Full access to all features
    "inventory:read", "inventory:create", "inventory:update", "inventory:delete",
    "orders:read", "orders:create", "orders:update", "orders:delete",
    "shipments:read", "shipments:create", "shipments:update", "shipments:delete",
    "suppliers:read", "suppliers:create", "suppliers:update", "suppliers:delete",
    "purchase_orders:read", "purchase_orders:create", "purchase_orders:update",
    "purchase_orders:delete", "purchase_orders:approve", "purchase_orders:receive",
    // User management (including admin management)
    "users:read", "users:create", "users:update", "users:delete", "users:approve",
    "users:manage_admins",
    // System settings
    "system:settings",
  ],
  Admin: [
    // Full access to all features
    "inventory:read", "inventory:create", "inventory:update", "inventory:delete",
    "orders:read", "orders:create", "orders:update", "orders:delete",
    "shipments:read", "shipments:create", "shipments:update", "shipments:delete",
    "suppliers:read", "suppliers:create", "suppliers:update", "suppliers:delete",
    "purchase_orders:read", "purchase_orders:create", "purchase_orders:update",
    "purchase_orders:delete", "purchase_orders:approve", "purchase_orders:receive",
    // User management (can manage Operators and Viewers, not Admins or Owners)
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
  Viewer: [
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

// Check if user is owner (highest role)
export function isOwner(role: Role): boolean {
  return role === "Owner";
}

// Check if user is admin or higher
export function isAdmin(role: Role): boolean {
  return role === "Admin" || role === "Owner";
}

// Check if user can perform write operations (Admin or Owner)
export function canWrite(role: Role): boolean {
  return role === "Admin" || role === "Owner";
}

// Check if user can manage other admins (Owner only)
export function canManageAdmins(role: Role): boolean {
  return role === "Owner";
}

// Check if a user can manage another user based on role hierarchy
// Owner can manage anyone (including other Owners, but with restrictions)
// Other roles can only manage users with lower roles
export function canManageUser(managerRole: Role, targetRole: Role): boolean {
  // Owner can manage anyone
  if (managerRole === "Owner") {
    return true;
  }
  // Other roles can only manage users with lower roles
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
}

// Check if a target user is protected from certain actions
// Owners cannot be demoted or deleted by anyone
export function isProtectedUser(targetRole: Role): boolean {
  return targetRole === "Owner";
}

// Check if a user can delete another user
// Owners cannot be deleted by anyone (including other Owners)
export function canDeleteUser(managerRole: Role, targetRole: Role): boolean {
  // No one can delete an Owner
  if (targetRole === "Owner") {
    return false;
  }
  return canManageUser(managerRole, targetRole);
}

// Check if a user can change another user's role
// Owners cannot have their role changed by anyone
export function canChangeRole(managerRole: Role, targetRole: Role, newRole: Role): boolean {
  // No one can change an Owner's role
  if (targetRole === "Owner") {
    return false;
  }
  // Must be able to manage the user and assign the new role
  return canManageUser(managerRole, targetRole) && canAssignRole(managerRole, newRole);
}

// Check if a user can assign a specific role
// Owners can assign any role, Admins can only assign Operator/Viewer
export function canAssignRole(assignerRole: Role, targetRole: Role): boolean {
  if (assignerRole === "Owner") {
    return true; // Owner can assign any role
  }
  if (assignerRole === "Admin") {
    // Admin can only assign Operator or Viewer roles
    return targetRole === "Operator" || targetRole === "Viewer";
  }
  return false;
}

// Get roles that a user can assign to others
export function getAssignableRoles(role: Role): Role[] {
  if (role === "Owner") {
    return ["Owner", "Admin", "Operator", "Viewer"];
  }
  if (role === "Admin") {
    return ["Operator", "Viewer"];
  }
  return [];
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
  // Default to Viewer for safety
  return "Viewer";
}

