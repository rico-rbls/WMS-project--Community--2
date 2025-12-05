import { Search, Command, User, LogOut, ChevronDown, Bell, ShoppingCart, Check, Menu } from "lucide-react";
import { useAuth } from "../context/auth-context";
import { useNotifications } from "../context/notifications-context";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useSidebar } from "./ui/sidebar";
import { ViewType } from "../App";

interface TopbarProps {
  setCurrentView: (view: ViewType) => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export function Topbar({ setCurrentView, setCommandPaletteOpen }: TopbarProps) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { toggleSidebar, isMobile } = useSidebar();
  const canSeeNotifications = user?.role === "Owner" || user?.role === "Admin";

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
  };

  return (
    <header className="shrink-0 z-50 flex h-14 items-center gap-2 sm:gap-4 border-b bg-background px-3 sm:px-6">
      {/* Mobile Hamburger Menu */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Left Side - Application Title */}
      <div className="min-w-0 flex-1">
        <h1 className="text-sm font-semibold truncate sm:text-base">
          <span className="hidden lg:inline">Warehouse Management System </span>
          <span className="lg:hidden">WMS</span>
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

      {/* Notifications Bell - Only for Owner/Admin */}
      {canSeeNotifications && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative shrink-0">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80" sideOffset={8}>
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-2 text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    markAllAsRead();
                  }}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                      !notification.read ? "bg-accent/50" : ""
                    }`}
                    onSelect={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-2 w-full">
                      <ShoppingCart className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{notification.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {notification.salesOrderId && (
                            <Badge variant="outline" className="text-xs">
                              {notification.salesOrderId}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Right Side - User Profile Dropdown */}
      {user && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            >
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
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setCurrentView("profile")}>
              <User className="mr-2 h-4 w-4" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={handleLogout}
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

