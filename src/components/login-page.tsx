import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Eye, EyeOff, Lock, Mail, Package, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/auth-context";
import { loginSchema, registerSchema, PASSWORD_REQUIREMENTS } from "../lib/validations";

type AuthMode = "login" | "register";

export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    rememberMe: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      rememberMe: false,
    });
    setFieldErrors({});
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  function validateField(field: "name" | "email" | "password" | "confirmPassword", value: string) {
    const schema = mode === "login" ? loginSchema : registerSchema;
    const formData = mode === "login"
      ? { email: field === "email" ? value : form.email, password: field === "password" ? value : form.password }
      : { name: field === "name" ? value : form.name, email: field === "email" ? value : form.email, password: field === "password" ? value : form.password, confirmPassword: field === "confirmPassword" ? value : form.confirmPassword };

    const result = schema.safeParse(formData);

    if (!result.success) {
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
  }

  function validateForm() {
    const schema = mode === "login" ? loginSchema : registerSchema;
    const formData = mode === "login"
      ? { email: form.email, password: form.password }
      : { name: form.name, email: form.email, password: form.password, confirmPassword: form.confirmPassword };

    const result = schema.safeParse(formData);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const path = err.path.join(".");
        errors[path] = err.message;
      });
      setFieldErrors(errors);
      return Object.values(errors)[0];
    }

    setFieldErrors({});
    return null;
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
        await register(form.email, form.password, form.name);
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
                <Label htmlFor="name">Full Name</Label>
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
                  autoComplete="email"
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

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
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

            {/* Demo Credentials Info (Login only) */}
            {mode === "login" && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  Demo Credentials:
                </p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    <span className="font-medium">Owner:</span> owner@wms.com / owner123
                  </p>
                  <p>
                    <span className="font-medium">Admin:</span> admin@wms.com / admin123
                  </p>
                  <p>
                    <span className="font-medium">Operator:</span> operator@wms.com / operator123
                  </p>
                </div>
              </div>
            )}

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
    </div>
  );
}

