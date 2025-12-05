import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { User, Mail, Shield, Calendar, Clock, Lock, Save, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Crown, Phone, MapPin, Link2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { useAuth, UserAddress } from "../context/auth-context";
import { PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS } from "../lib/validations";

// Google Icon Component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function AdminProfileView() {
  const { user, updateProfile, changePassword, linkGoogleAccount, unlinkGoogleAccount } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: {
      street: user?.address?.street || "",
      city: user?.address?.city || "",
      state: user?.address?.state || "",
      postalCode: user?.address?.postalCode || "",
      country: user?.address?.country || "",
    } as UserAddress,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLinking, setIsGoogleLinking] = useState(false);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);

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

  const handleSaveProfile = () => {
    if (!profileForm.name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    updateProfile({
      name: profileForm.name.trim(),
      phone: profileForm.phone.trim() || undefined,
      address: Object.values(profileForm.address).some(v => v.trim())
        ? {
            street: profileForm.address.street.trim() || undefined,
            city: profileForm.address.city.trim() || undefined,
            state: profileForm.address.state.trim() || undefined,
            postalCode: profileForm.address.postalCode.trim() || undefined,
            country: profileForm.address.country.trim() || undefined,
          }
        : undefined,
    });
    setIsEditingProfile(false);
    toast.success("Profile updated successfully");
  };

  const handleCancelEdit = () => {
    setProfileForm({
      name: user?.name || "",
      phone: user?.phone || "",
      address: {
        street: user?.address?.street || "",
        city: user?.address?.city || "",
        state: user?.address?.state || "",
        postalCode: user?.address?.postalCode || "",
        country: user?.address?.country || "",
      },
    });
    setIsEditingProfile(false);
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
    if (passwordForm.newPassword.length < PASSWORD_MIN_LENGTH) {
      toast.error(PASSWORD_REQUIREMENTS);
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
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <h2 className="text-xl font-semibold">{user.name}</h2>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setIsEditingProfile(true)}>
                  Edit Profile
                </Button>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                <Badge
                  variant={user.role === "Owner" ? "default" : user.role === "Admin" ? "default" : "secondary"}
                  className={`gap-1 ${user.role === "Owner" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" : ""}`}
                >
                  {user.role === "Owner" ? <Crown className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
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
              <div className="h-9 w-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <Phone className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                <p className="font-medium text-sm truncate">{user.phone || "Not set"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Address</p>
                <p className="font-medium text-sm truncate">
                  {user.address && Object.values(user.address).some(v => v)
                    ? [user.address.city, user.address.state, user.address.country].filter(Boolean).join(", ") || "Partial address"
                    : "Not set"}
                </p>
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
                  placeholder={`Min ${PASSWORD_MIN_LENGTH} characters`}
                  disabled={isLoading}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS}</p>
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

      {/* Connected Accounts Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            Connected Accounts
          </CardTitle>
          <CardDescription>Link external accounts for easier sign-in</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center border">
                <GoogleIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Google Account</p>
                {user.googleUserId ? (
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Linked to {user.googleEmail}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not linked</p>
                )}
              </div>
            </div>
            {user.googleUserId ? (
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={() => setShowUnlinkDialog(true)}
                disabled={isGoogleLinking}
              >
                <Unlink className="h-4 w-4 mr-2" />
                Unlink
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={async () => {
                  setIsGoogleLinking(true);
                  try {
                    await linkGoogleAccount();
                    toast.success("Google account linked successfully!");
                  } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : "Failed to link Google account";
                    if (!message.includes("cancelled")) {
                      toast.error(message);
                    }
                  } finally {
                    setIsGoogleLinking(false);
                  }
                }}
                disabled={isGoogleLinking}
              >
                {isGoogleLinking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <GoogleIcon className="h-4 w-4 mr-2" />
                    Link Google Account
                  </>
                )}
              </Button>
            )}
          </div>
          {user.googleUserId && (
            <p className="text-xs text-muted-foreground mt-3 px-1">
              You can use "Sign in with Google" to quickly access your account.
            </p>
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
                variant={user.role === "Owner" || user.role === "Admin" ? "default" : "secondary"}
                className={`text-sm px-3 py-1.5 gap-1.5 ${user.role === "Owner" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" : ""}`}
              >
                {user.role === "Owner" ? <Crown className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                {user.role}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {user.role === "Owner" ? "Full system access including admin management" :
                 user.role === "Admin" ? "Full system access" : "Read-only access"}
              </span>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {user.role === "Owner" || user.role === "Admin" ? "You can:" : "You have access to:"}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {user.role === "Owner" ? (
                  <>
                    <PermissionItem>Create, edit, and delete inventory items</PermissionItem>
                    <PermissionItem>Manage orders and shipments</PermissionItem>
                    <PermissionItem>Create and approve purchase orders</PermissionItem>
                    <PermissionItem>Manage suppliers</PermissionItem>
                    <PermissionItem>Manage all user accounts including Admins</PermissionItem>
                    <PermissionItem>Access system-wide settings</PermissionItem>
                    <PermissionItem>View all reports and analytics</PermissionItem>
                  </>
                ) : user.role === "Admin" ? (
                  <>
                    <PermissionItem>Create, edit, and delete inventory items</PermissionItem>
                    <PermissionItem>Manage orders and shipments</PermissionItem>
                    <PermissionItem>Create and approve purchase orders</PermissionItem>
                    <PermissionItem>Manage suppliers</PermissionItem>
                    <PermissionItem>Manage Operator and Viewer accounts</PermissionItem>
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
              {(user.role === "Operator" || user.role === "Viewer") && (
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

      {/* Edit Profile Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your personal information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                placeholder="Enter your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="Enter your phone number"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Address</Label>
              <div className="grid gap-3">
                <Input
                  placeholder="Street address"
                  value={profileForm.address.street}
                  onChange={(e) => setProfileForm({
                    ...profileForm,
                    address: { ...profileForm.address, street: e.target.value }
                  })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="City"
                    value={profileForm.address.city}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      address: { ...profileForm.address, city: e.target.value }
                    })}
                  />
                  <Input
                    placeholder="State/Province"
                    value={profileForm.address.state}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      address: { ...profileForm.address, state: e.target.value }
                    })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Postal code"
                    value={profileForm.address.postalCode}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      address: { ...profileForm.address, postalCode: e.target.value }
                    })}
                  />
                  <Input
                    placeholder="Country"
                    value={profileForm.address.country}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      address: { ...profileForm.address, country: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
            <Button onClick={handleSaveProfile}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink Google Account Confirmation Dialog */}
      <Dialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlink className="h-5 w-5 text-red-600" />
              Unlink Google Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to unlink your Google account ({user.googleEmail})?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                After unlinking, you won't be able to use "Sign in with Google" to access this account until you link it again.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnlinkDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setIsGoogleLinking(true);
                try {
                  await unlinkGoogleAccount();
                  toast.success("Google account unlinked successfully");
                  setShowUnlinkDialog(false);
                } catch (error: unknown) {
                  const message = error instanceof Error ? error.message : "Failed to unlink Google account";
                  toast.error(message);
                } finally {
                  setIsGoogleLinking(false);
                }
              }}
              disabled={isGoogleLinking}
            >
              {isGoogleLinking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Unlinking...
                </>
              ) : (
                "Unlink Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

