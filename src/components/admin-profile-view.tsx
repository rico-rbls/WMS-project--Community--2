import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { User, Mail, Shield, Calendar, Clock, Lock, Save, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/auth-context";

export function AdminProfileView() {
  const { user, updateProfile, changePassword } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || "");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Not Authenticated</CardTitle>
            <CardDescription>Please log in to view your profile.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleSaveName = () => {
    if (!newName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    updateProfile(newName.trim());
    setIsEditingName(false);
    toast.success("Profile updated successfully");
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (!passwordForm.newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      toast.success("Password changed successfully");
      setIsChangingPassword(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to change password";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto px-4 sm:px-0">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      {/* Profile Info Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            Profile Information
          </CardTitle>
          <CardDescription>Your personal account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar and Name */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-4 ring-background shadow-sm">
              <User className="h-10 w-10 text-primary" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              {isEditingName ? (
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <Input
                    value={newName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                    className="max-w-xs"
                    placeholder="Enter your name"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveName}>
                      <Save className="h-4 w-4 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setIsEditingName(false); setNewName(user.name); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <h2 className="text-xl font-semibold">{user.name}</h2>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setIsEditingName(true)}>
                    Edit
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                <Badge variant={user.role === "Admin" ? "default" : "secondary"} className="gap-1">
                  <Shield className="h-3 w-3" />
                  {user.role}
                </Badge>
                <Badge
                  variant="outline"
                  className="gap-1 text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800"
                >
                  <CheckCircle className="h-3 w-3" />
                  {user.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-4 border-t">
            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                <p className="font-medium text-sm truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="h-9 w-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Created</p>
                <p className="font-medium text-sm">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Login</p>
                <p className="font-medium text-sm">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Current session"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Lock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            Security
          </CardTitle>
          <CardDescription>Manage your password and security settings</CardDescription>
        </CardHeader>
        <CardContent>
          {isChangingPassword ? (
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-sm font-medium">Current Password</Label>
                <Input
                  id="currentPassword"
                  type={showPasswords ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  disabled={isLoading}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium">New Password</Label>
                <Input
                  id="newPassword"
                  type={showPasswords ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Enter new password (min 6 characters)"
                  disabled={isLoading}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPasswords ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  disabled={isLoading}
                  className="h-10"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? <EyeOff className="h-4 w-4 mr-1.5" /> : <Eye className="h-4 w-4 mr-1.5" />}
                {showPasswords ? "Hide" : "Show"} passwords
              </Button>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleChangePassword} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Password</p>
                  <p className="text-sm text-muted-foreground">Last changed: Unknown</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setIsChangingPassword(true)}>
                Change Password
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Permissions Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            Role & Permissions
          </CardTitle>
          <CardDescription>Your current role and what you can do</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Badge
                variant={user.role === "Admin" ? "default" : "secondary"}
                className="text-sm px-3 py-1.5 gap-1.5"
              >
                <Shield className="h-3.5 w-3.5" />
                {user.role}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {user.role === "Admin" ? "Full system access" : "Read-only access"}
              </span>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {user.role === "Admin" ? "You can:" : "You have access to:"}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {user.role === "Admin" ? (
                  <>
                    <PermissionItem>Create, edit, and delete inventory items</PermissionItem>
                    <PermissionItem>Manage orders and shipments</PermissionItem>
                    <PermissionItem>Create and approve purchase orders</PermissionItem>
                    <PermissionItem>Manage suppliers</PermissionItem>
                    <PermissionItem>Manage user accounts and permissions</PermissionItem>
                    <PermissionItem>View all reports and analytics</PermissionItem>
                  </>
                ) : (
                  <>
                    <PermissionItem variant="view">View inventory items</PermissionItem>
                    <PermissionItem variant="view">View orders and shipments</PermissionItem>
                    <PermissionItem variant="view">View purchase orders</PermissionItem>
                    <PermissionItem variant="view">View suppliers</PermissionItem>
                    <PermissionItem variant="view">View reports and analytics</PermissionItem>
                  </>
                )}
              </div>
              {user.role === "Operator" && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    <AlertCircle className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                    Contact an administrator if you need additional permissions.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PermissionItem({ children, variant = "full" }: { children: React.ReactNode; variant?: "full" | "view" }) {
  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground">
      <CheckCircle className={`h-4 w-4 mt-0.5 shrink-0 ${variant === "full" ? "text-green-500" : "text-blue-500"}`} />
      <span>{children}</span>
    </div>
  );
}

