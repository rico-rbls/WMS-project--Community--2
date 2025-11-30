import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "./ui/sidebar";
import { LayoutDashboard, Package, ShoppingCart, Truck, Users, Warehouse, Sun, Moon, LogOut, User, Star, Bookmark, AlertTriangle, Clock, FileText, ClipboardList, Shield, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { ViewType } from "../App";
import { useAuth } from "../context/auth-context";
import { toast } from "sonner";
import { Separator } from "./ui/separator";
import { useFavorites } from "../context/favorites-context";
import { Badge } from "./ui/badge";
import type { EntityType } from "../types";

interface AppSidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

export function AppSidebar({ currentView, setCurrentView }: AppSidebarProps) {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { getRecentFavorites, savedSearches, quickLinks } = useFavorites();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
  };

  const menuItems = [
    { id: "dashboard" as ViewType, label: "Dashboard", icon: LayoutDashboard },
    { id: "inventory" as ViewType, label: "Inventory", icon: Package },
    { id: "orders" as ViewType, label: "Orders", icon: ShoppingCart },
    { id: "purchase-orders" as ViewType, label: "Purchase Orders", icon: ClipboardList },
    { id: "shipments" as ViewType, label: "Shipments", icon: Truck },
    { id: "suppliers" as ViewType, label: "Suppliers", icon: Users },
  ];

  // Admin-only menu items
  const adminMenuItems = [
    { id: "users" as ViewType, label: "User Management", icon: Shield },
  ];

  const recentFavorites = getRecentFavorites(5);

  const getEntityIcon = (entityType: EntityType) => {
    switch (entityType) {
      case "inventory": return Package;
      case "orders": return ShoppingCart;
      case "purchase-orders": return ClipboardList;
      case "shipments": return Truck;
      case "suppliers": return Users;
      default: return Package;
    }
  };

  const getQuickLinkIcon = (iconName?: string) => {
    switch (iconName) {
      case "AlertTriangle": return AlertTriangle;
      case "Clock": return Clock;
      case "FileText": return FileText;
      default: return Star;
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Warehouse className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-sidebar-foreground">WMS</h3>
            <p className="text-xs text-sidebar-foreground/60">Warehouse System</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setCurrentView(item.id)}
                    isActive={currentView === item.id}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section - Only visible to admins */}
        {user?.role === "Admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => setCurrentView(item.id)}
                      isActive={currentView === item.id}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Quick Access Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Quick Access</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Quick Links */}
              {quickLinks.map((link) => {
                const IconComponent = getQuickLinkIcon(link.icon);
                return (
                  <SidebarMenuItem key={link.id}>
                    <SidebarMenuButton
                      onClick={() => setCurrentView(link.entityType as ViewType)}
                      className="text-xs"
                    >
                      <IconComponent className="h-3.5 w-3.5" />
                      <span className="truncate">{link.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recent Favorites */}
        {recentFavorites.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              Recent Favorites
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {recentFavorites.map((fav) => {
                  const IconComponent = getEntityIcon(fav.entityType);
                  return (
                    <SidebarMenuItem key={fav.id}>
                      <SidebarMenuButton
                        onClick={() => setCurrentView(fav.entityType as ViewType)}
                        className="text-xs"
                      >
                        <IconComponent className="h-3.5 w-3.5" />
                        <span className="truncate">{fav.entityName}</span>
                        <Badge variant="outline" className="ml-auto text-[10px] px-1 py-0">
                          {fav.entityType}
                        </Badge>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Saved Searches */}
        {savedSearches.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-1">
              <Bookmark className="h-3 w-3" />
              Saved Searches
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {savedSearches.slice(0, 5).map((search) => {
                  const IconComponent = getEntityIcon(search.entityType);
                  return (
                    <SidebarMenuItem key={search.id}>
                      <SidebarMenuButton
                        onClick={() => setCurrentView(search.entityType as ViewType)}
                        className="text-xs"
                      >
                        <IconComponent className="h-3.5 w-3.5" />
                        <span className="truncate">{search.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        {/* User Profile Section */}
        {user && (
          <>
            <div className="mb-3 px-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
            <Separator className="mb-2" />
          </>
        )}

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setCurrentView("profile")}
              isActive={currentView === "profile"}
            >
              <Settings className="h-4 w-4" />
              <span>My Profile</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setTheme(theme === "dark" ? "light" : "dark") }>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{theme === "dark" ? "Light" : "Dark"} Mode</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-red-600 dark:text-red-400">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
