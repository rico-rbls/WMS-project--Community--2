import { Search, Command, User, Sun, Moon, LogOut, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "../context/auth-context";
import { toast } from "sonner";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ViewType } from "../App";

interface TopbarProps {
  setCurrentView: (view: ViewType) => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export function Topbar({ setCurrentView, setCommandPaletteOpen }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
      {/* Left Side - Application Title */}
      <div className="min-w-0 flex-1">
        <h1 className="text-sm font-semibold truncate sm:text-base">
          <span className="hidden lg:inline">Warehouse Management System: </span>
          <span className="lg:hidden">WMS</span>
          <span className="hidden lg:inline text-muted-foreground font-normal">
            A Comprehensive Solution for Inventory Optimization and Supply Chain Efficiency
          </span>
        </h1>
        <p className="text-xs text-muted-foreground truncate lg:hidden">
          Inventory & Supply Chain
        </p>
      </div>

      {/* Center/Right Side - Search Bar */}
      <Button
        variant="outline"
        className="hidden sm:flex w-64 justify-start text-muted-foreground gap-2"
        onClick={() => setCommandPaletteOpen(true)}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Search everything...</span>
        <kbd className="ml-auto pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium md:inline-flex">
          <Command className="h-3 w-3" />K
        </kbd>
      </Button>

      {/* Mobile Search Button */}
      <Button
        variant="outline"
        size="icon"
        className="sm:hidden shrink-0"
        onClick={() => setCommandPaletteOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="sr-only">Search</span>
      </Button>

      {/* Right Side - User Profile Dropdown */}
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="hidden md:flex flex-col items-start text-left">
                <span className="text-sm font-medium truncate max-w-[120px]">
                  {user.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user.role}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCurrentView("profile")}>
              <User className="mr-2 h-4 w-4" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}

