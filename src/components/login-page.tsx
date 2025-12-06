import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Eye, EyeOff, Lock, Mail, Package, Loader2, User, Phone } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/auth-context";
import { loginSchema, registerSchema, PASSWORD_REQUIREMENTS } from "../lib/validations";
import { TermsConditionsDialog } from "./terms-conditions-dialog";

// Google icon SVG component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

type AuthMode = "login" | "register";

export function LoginPage() {
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    rememberMe: false,
    acceptTerms: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      rememberMe: false,
      acceptTerms: false,
    });
    setFieldErrors({});
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  function validateField(field: "name" | "email" | "phone" | "password" | "confirmPassword", value: string) {
    try {
      const schema = mode === "login" ? loginSchema : registerSchema;
      const formData = mode === "login"
        ? { email: field === "email" ? value : form.email, password: field === "password" ? value : form.password }
        : { name: field === "name" ? value : form.name, email: field === "email" ? value : form.email, phone: field === "phone" ? value : form.phone, password: field === "password" ? value : form.password, confirmPassword: field === "confirmPassword" ? value : form.confirmPassword };

      const result = schema.safeParse(formData);

      if (!result.success && result.error?.errors) {
        const fieldError = result.error.errors.find(err => err.path[0] === field);
        if (fieldError) {
          setFieldErrors(prev => ({ ...prev, [field]: fieldError.message }));
        } else {
          setFieldErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
          });
        }
      } else {
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    } catch (error) {
      console.error("Validation error:", error);
    }
  }

  function validateForm() {
    try {
      const schema = mode === "login" ? loginSchema : registerSchema;
      const formData = mode === "login"
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, phone: form.phone, password: form.password, confirmPassword: form.confirmPassword };

      const result = schema.safeParse(formData);

      if (!result.success && result.error?.errors) {
        const errors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          const path = err.path.join(".");
          errors[path] = err.message;
        });
        setFieldErrors(errors);
        return Object.values(errors)[0];
      }

      // Check terms acceptance for registration
      if (mode === "register" && !form.acceptTerms) {
        setFieldErrors(prev => ({ ...prev, acceptTerms: "You must accept the Terms and Conditions" }));
        return "You must accept the Terms and Conditions to create an account";
      }

      setFieldErrors({});
      return null;
    } catch (error) {
      console.error("Form validation error:", error);
      return null;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const err = validateForm();
    if (err) {
      toast.error(err);
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password, form.rememberMe);
        toast.success("Welcome back!");
      } else {
        await register(form.email, form.password, form.name, form.phone);
        toast.success("Registration successful! Your account is pending approval by an administrator.");
        switchMode("login");
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        const message = error.message;
        // Parse error codes for specific handling
        if (message.startsWith("NO_ACCOUNT:")) {
          const displayMessage = message.replace("NO_ACCOUNT:", "");
          toast.error(displayMessage, {
            action: {
              label: "Sign Up",
              onClick: () => switchMode("register"),
            },
            duration: 8000,
          });
        } else if (message.startsWith("WRONG_PASSWORD:")) {
          toast.error(message.replace("WRONG_PASSWORD:", ""));
        } else if (message.startsWith("PENDING:")) {
          toast.warning(message.replace("PENDING:", ""), { duration: 6000 });
        } else if (message.startsWith("INACTIVE:")) {
          toast.error(message.replace("INACTIVE:", ""), { duration: 6000 });
        } else {
          toast.error(message);
        }
      } else {
        toast.error("An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Welcome!");
    } catch (error: unknown) {
      if (error instanceof Error) {
        const message = error.message;
        if (message.startsWith("PENDING:")) {
          toast.warning(message.replace("PENDING:", ""), { duration: 6000 });
        } else if (message.startsWith("INACTIVE:")) {
          toast.error(message.replace("INACTIVE:", ""), { duration: 6000 });
        } else if (message.includes("popup-closed-by-user")) {
          // User closed the popup, don't show error
        } else {
          toast.error(message);
        }
      } else {
        toast.error("Google sign-in failed. Please try again.");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-[360px] shadow-xl mx-auto">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription className="mt-2">
              {mode === "login"
                ? "Sign in to your Warehouse Management System"
                : "Register for a new account (requires admin approval)"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field (Register only) */}
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      validateField("name", e.target.value);
                    }}
                    className={`pl-9 ${fieldErrors.name ? "border-red-500" : ""}`}
                    disabled={isLoading}
                    autoComplete="name"
                  />
                </div>
                {fieldErrors.name && (
                  <p className="text-sm text-red-500">{fieldErrors.name}</p>
                )}
              </div>
            )}

            {/* Phone Field (Register only) */}
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="09123456789"
                    value={form.phone}
                    onChange={(e) => {
                      // Only allow digits
                      const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setForm({ ...form, phone: value });
                      validateField("phone", value);
                    }}
                    className={`pl-9 ${fieldErrors.phone ? "border-red-500" : ""}`}
                    disabled={isLoading}
                    autoComplete="tel"
                    maxLength={11}
                  />
                </div>
                {fieldErrors.phone ? (
                  <p className="text-sm text-red-500">{fieldErrors.phone}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Must be exactly 11 digits (e.g., 09123456789)</p>
                )}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@wms.com"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    validateField("email", e.target.value);
                  }}
                  className={`pl-9 ${fieldErrors.email ? "border-red-500" : ""}`}
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>
              {fieldErrors.email && (
                <p className="text-sm text-red-500">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "register" ? `Min ${PASSWORD_REQUIREMENTS.split(" ").pop()} characters` : "Enter your password"}
                  value={form.password}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value });
                    validateField("password", e.target.value);
                  }}
                  className={`pl-9 pr-9 ${fieldErrors.password ? "border-red-500" : ""}`}
                  disabled={isLoading}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {fieldErrors.password ? (
                <p className="text-sm text-red-500">{fieldErrors.password}</p>
              ) : mode === "register" && (
                <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS}</p>
              )}
            </div>

            {/* Confirm Password Field (Register only) */}
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={form.confirmPassword}
                    onChange={(e) => {
                      setForm({ ...form, confirmPassword: e.target.value });
                      validateField("confirmPassword", e.target.value);
                    }}
                    className={`pl-9 ${fieldErrors.confirmPassword ? "border-red-500" : ""}`}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-sm text-red-500">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Remember Me & Forgot Password (Login only) */}
            {mode === "login" && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={form.rememberMe}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, rememberMe: checked as boolean })
                    }
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  disabled={isLoading}
                  onClick={() => toast.info("Password reset feature coming soon!")}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Terms and Conditions (Register only) */}
            {mode === "register" && (
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="acceptTerms"
                    checked={form.acceptTerms}
                    onCheckedChange={(checked) => {
                      setForm({ ...form, acceptTerms: checked as boolean });
                      if (checked) {
                        setFieldErrors(prev => {
                          const { acceptTerms, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                    disabled={isLoading}
                    className={fieldErrors.acceptTerms ? "border-red-500" : ""}
                  />
                  <Label
                    htmlFor="acceptTerms"
                    className={`text-sm font-normal cursor-pointer leading-tight ${fieldErrors.acceptTerms ? "text-red-500" : ""}`}
                  >
                    I agree to the{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline font-medium"
                      onClick={() => setShowTermsDialog(true)}
                    >
                      Terms and Conditions
                    </button>
                  </Label>
                </div>
                {fieldErrors.acceptTerms && (
                  <p className="text-sm text-red-500">{fieldErrors.acceptTerms}</p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                mode === "login" ? "Sign In" : "Create Account"
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in with Google...
                </>
              ) : (
                <>
                  <GoogleIcon className="mr-2 h-4 w-4" />
                  Sign in with Google
                </>
              )}
            </Button>

            {/* Switch Mode Link */}
            <div className="text-center text-sm">
              {mode === "login" ? (
                <p className="text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => switchMode("register")}
                    disabled={isLoading}
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => switchMode("login")}
                    disabled={isLoading}
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>

            {/* Registration Info (Register only) */}
            {mode === "register" && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> New accounts require administrator approval before you can access the system. You will be notified once your account is approved.
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Terms and Conditions Dialog */}
      <TermsConditionsDialog
        open={showTermsDialog}
        onOpenChange={setShowTermsDialog}
      />
    </div>
  );
}

