import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Search, Users, Check, X, Shield, UserCog, Trash2, Clock, UserCheck, UserX, Crown, Eye, ShoppingBag } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { useAuth, User } from "../context/auth-context";
import type { Role, UserStatus } from "../lib/permissions";
import { canManageUser, canDeleteUser, canChangeRole, isProtectedUser, getAssignableRoles, isAdmin, isOwner } from "../lib/permissions";
import { useDebounce } from "../hooks/useDebounce";
import { useTableSort } from "../hooks/useTableSort";
import { SortableTableHead } from "./ui/sortable-table-head";

export function UserManagementView() {
  const { user: currentUser, getAllUsers, getPendingUsers, approveUser, rejectUser, updateUserRole, updateUserStatus, deleteUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | UserStatus>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ role: Role; status: UserStatus }>({ role: "Customer", status: "Active" });

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Load users
  useEffect(() => {
    const loadUsers = () => {
      const allUsers = getAllUsers();
      // Map stored users to User type (without password)
      setUsers(allUsers.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
      })));
    };
    loadUsers();
    // Refresh every 2 seconds to catch updates
    const interval = setInterval(loadUsers, 2000);
    return () => clearInterval(interval);
  }, [getAllUsers]);

  // Filter users
  const filteredUsers = useMemo(() => {
    let result = users;
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      result = result.filter(u => 
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.id.toLowerCase().includes(term)
      );
    }
    if (filterStatus !== "all") {
      result = result.filter(u => u.status === filterStatus);
    }
    return result;
  }, [users, debouncedSearchTerm, filterStatus]);

  // Sorting
  const { sortedData, sortConfig, requestSort, getSortDirection } = useTableSort<User>(filteredUsers);

  // Pending users count
  const pendingCount = useMemo(() => users.filter(u => u.status === "Pending").length, [users]);

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditForm({ role: user.role, status: user.status });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleApprove = async (userId: string) => {
    try {
      await approveUser(userId);
      toast.success("User approved successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to approve user");
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await rejectUser(userId);
      toast.success("User rejected and removed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to reject user");
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    try {
      if (editForm.role !== selectedUser.role) {
        await updateUserRole(selectedUser.id, editForm.role);
      }
      if (editForm.status !== selectedUser.status) {
        await updateUserStatus(selectedUser.id, editForm.status);
      }
      toast.success("User updated successfully");
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update user");
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser(selectedUser.id);
      toast.success("User deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete user");
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><UserCheck className="h-3 w-3 mr-1" />Active</Badge>;
      case "Pending":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "Inactive":
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"><UserX className="h-3 w-3 mr-1" />Inactive</Badge>;
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case "Owner":
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"><Crown className="h-3 w-3 mr-1" />Owner</Badge>;
      case "Admin":
        return <Badge variant="default"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      case "Customer":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"><ShoppingBag className="h-3 w-3 mr-1" />Customer</Badge>;
      case "Viewer":
        return <Badge variant="outline"><Eye className="h-3 w-3 mr-1" />Viewer</Badge>;
    }
  };

  // Get assignable roles based on current user's role
  const assignableRoles = currentUser ? getAssignableRoles(currentUser.role) : [];

  // Check if current user is admin or owner
  if (!currentUser || !isAdmin(currentUser.role)) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>You do not have permission to access user management.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage user accounts, roles, and permissions</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1.5 gap-1.5 self-start md:self-auto animate-pulse">
            <Clock className="h-3.5 w-3.5" />
            {pendingCount} pending approval{pendingCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Pending Approvals Card */}
      {pendingCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Pending Approvals
            </CardTitle>
            <CardDescription>New user registrations awaiting your approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.filter(u => u.status === "Pending").map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">Registered: {new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50" onClick={() => handleApprove(user.id)}>
                      <Check className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleReject(user.id)}>
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Users Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>All Users</CardTitle>
              <Badge variant="secondary">{users.length}</Badge>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full md:w-64"
                />
              </div>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as "all" | UserStatus)}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="name" currentSortKey={sortConfig.key as string | null} sortDirection={getSortDirection("name")} onSort={(k) => requestSort(k as keyof User)}>Name</SortableTableHead>
                  <SortableTableHead sortKey="email" currentSortKey={sortConfig.key as string | null} sortDirection={getSortDirection("email")} onSort={(k) => requestSort(k as keyof User)}>Email</SortableTableHead>
                  <SortableTableHead sortKey="role" currentSortKey={sortConfig.key as string | null} sortDirection={getSortDirection("role")} onSort={(k) => requestSort(k as keyof User)}>Role</SortableTableHead>
                  <SortableTableHead sortKey="status" currentSortKey={sortConfig.key as string | null} sortDirection={getSortDirection("status")} onSort={(k) => requestSort(k as keyof User)}>Status</SortableTableHead>
                  <SortableTableHead sortKey="createdAt" currentSortKey={sortConfig.key as string | null} sortDirection={getSortDirection("createdAt")} onSort={(k) => requestSort(k as keyof User)}>Created</SortableTableHead>
                  <SortableTableHead sortKey="lastLogin" currentSortKey={sortConfig.key as string | null} sortDirection={getSortDirection("lastLogin")} onSort={(k) => requestSort(k as keyof User)}>Last Login</SortableTableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                  </TableRow>
                ) : (
                  sortedData.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {user.status === "Pending" && canManageUser(currentUser.role, user.role) && (
                            <>
                              <Button size="sm" variant="ghost" className="text-green-600" onClick={() => handleApprove(user.id)} title="Approve">
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleReject(user.id)} title="Reject">
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(user)}
                            title={
                              user.id === currentUser?.id
                                ? "Cannot edit your own account"
                                : isProtectedUser(user.role)
                                  ? "Owner accounts cannot be modified"
                                  : !canManageUser(currentUser.role, user.role)
                                    ? "Cannot edit users with equal or higher role"
                                    : "Edit"
                            }
                            disabled={user.id === currentUser?.id || isProtectedUser(user.role) || !canManageUser(currentUser.role, user.role)}
                          >
                            <UserCog className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => openDeleteDialog(user)}
                            title={
                              user.id === currentUser?.id
                                ? "Cannot delete your own account"
                                : isProtectedUser(user.role)
                                  ? "Owner accounts cannot be deleted"
                                  : !canDeleteUser(currentUser.role, user.role)
                                    ? "Cannot delete users with equal or higher role"
                                    : "Delete"
                            }
                            disabled={user.id === currentUser?.id || !canDeleteUser(currentUser.role, user.role)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update role and status for {selectedUser?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Owner warning banner */}
            {isOwner(currentUser.role) && selectedUser && selectedUser.role === "Admin" && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>⚠️ Admin Account:</strong> You are modifying an Admin account. Changes will take effect immediately.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v as Role })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role === "Owner" && "Owner - Full system access"}
                      {role === "Admin" && "Admin - Full access (except admin management)"}
                      {role === "Customer" && "Customer - Limited access to own orders"}
                      {role === "Viewer" && "Viewer - Read-only access"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentUser.role === "Admin" && (
                <p className="text-xs text-muted-foreground">
                  Note: Only the Owner can assign Admin or Owner roles.
                </p>
              )}
              {isOwner(currentUser.role) && editForm.role === "Owner" && selectedUser?.role !== "Owner" && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Warning: Promoting to Owner grants full system access including the ability to manage all users.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v as UserStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && selectedUser.role === "Admin" && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-xs text-red-800 dark:text-red-200">
                <strong>⚠️ Warning:</strong> You are about to delete an Admin account. This will immediately revoke their access to the system.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

