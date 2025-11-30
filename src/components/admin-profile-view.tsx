import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { User, Mail, Shield, Calendar, Clock, Lock, Save, Eye, EyeOff, Loader2 } from "lucide-react";
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
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Not Authenticated</CardTitle>
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
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      {/* Profile Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Your personal account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar and Name */}
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-10 w-10 text-primary" />
            </div>
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="max-w-xs"
                    placeholder="Enter your name"
                  />
                  <Button size="sm" onClick={handleSaveName}>
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setIsEditingName(false); setNewName(user.name); }}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{user.name}</h2>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingName(true)}>
                    Edit
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={user.role === "Admin" ? "default" : "secondary"}>
                  <Shield className="h-3 w-3 mr-1" />
                  {user.role}
                </Badge>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  {user.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="grid gap-4 pt-4 border-t">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Account Created</p>
                <p className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Last Login</p>
                <p className="font-medium">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Current session"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Manage your password and security settings</CardDescription>
        </CardHeader>
        <CardContent>
          {isChangingPassword ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Enter new password (min 6 characters)"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {showPasswords ? "Hide" : "Show"} passwords
                </Button>
              </div>
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
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-muted-foreground">Last changed: Unknown</p>
              </div>
              <Button variant="outline" onClick={() => setIsChangingPassword(true)}>
                Change Password
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Permissions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role & Permissions
          </CardTitle>
          <CardDescription>Your current role and what you can do</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={user.role === "Admin" ? "default" : "secondary"} className="text-base px-3 py-1">
                {user.role}
              </Badge>
            </div>
            <div className="grid gap-2 text-sm">
              {user.role === "Admin" ? (
                <>
                  <p className="text-muted-foreground">As an Admin, you have full access to:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Create, edit, and delete inventory items</li>
                    <li>Manage orders and shipments</li>
                    <li>Create and approve purchase orders</li>
                    <li>Manage suppliers</li>
                    <li>Manage user accounts and permissions</li>
                    <li>View all reports and analytics</li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">As an Operator, you have read-only access to:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>View inventory items</li>
                    <li>View orders and shipments</li>
                    <li>View purchase orders</li>
                    <li>View suppliers</li>
                    <li>View reports and analytics</li>
                  </ul>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                    Contact an administrator if you need additional permissions.
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

