import { useState } from "react";
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
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "./ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "./ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Switch } from "./ui/switch";
import {
  LayoutDashboard,
  Package,
  Truck,
  Warehouse,
  ClipboardList,
  Shield,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Bell,
  ChevronUp,
  Sun,
  Moon,
  Receipt,
  Factory,
  UserCheck,
  Landmark,
  Wallet,
  ShoppingCart,
  Store,
  Home,
} from "lucide-react";
import { ViewType } from "../App";
import { useAuth } from "../context/auth-context";
import { useTheme } from "next-themes";

interface AppSidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

export function AppSidebar({ currentView, setCurrentView }: AppSidebarProps) {
  const { user } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const { theme, setTheme } = useTheme();
  const isCollapsed = state === "collapsed";
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const isCustomer = user?.role === "Customer";

  // Full menu items for non-customer users (Admin/Owner)
  const fullMenuItems = [
    { id: "dashboard" as ViewType, label: "Dashboard", icon: LayoutDashboard },
    { id: "inventory" as ViewType, label: "Inventory", icon: Package },
    { id: "purchase-orders" as ViewType, label: "Purchase Orders", icon: ClipboardList },
    { id: "sales-orders" as ViewType, label: "Sales Orders", icon: Receipt },
    { id: "shipments" as ViewType, label: "Shipments", icon: Truck },
    { id: "suppliers" as ViewType, label: "WMS Suppliers", icon: Factory },
    { id: "customers" as ViewType, label: "Customers", icon: UserCheck },
    { id: "cash-bank" as ViewType, label: "Cash and Bank", icon: Landmark },
    { id: "payments" as ViewType, label: "Payments", icon: Wallet },
  ];

  // Customer-only menu items (e-commerce style navigation)
  const customerMenuItems = [
    { id: "customer-dashboard" as ViewType, label: "Home", icon: Home },
    { id: "products" as ViewType, label: "Products", icon: Store },
    { id: "customer-cart" as ViewType, label: "My Cart", icon: ShoppingCart },
    { id: "sales-orders" as ViewType, label: "My Orders", icon: Receipt },
    { id: "shipments" as ViewType, label: "My Shipments", icon: Truck },
  ];

  const menuItems = isCustomer ? customerMenuItems : fullMenuItems;

  // Admin-only menu items
  const adminMenuItems = [
    { id: "users" as ViewType, label: "User Management", icon: Shield },
  ];

  const handleLogoClick = () => {
    window.location.reload();
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 border-b border-sidebar-border px-3 flex items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogoClick}
                className="flex items-center gap-2 justify-start group-data-[collapsible=icon]:justify-center w-full cursor-pointer"
                aria-label="Refresh application"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary hover:bg-primary/90 transition-colors">
                  <Warehouse className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                  WMS
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Refresh Application</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section - Only visible to admins and owners */}
        {(user?.role === "Admin" || user?.role === "Owner") && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => setCurrentView(item.id)}
                      isActive={currentView === item.id}
                      tooltip={item.label}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          {/* Settings with Dropdown */}
          <SidebarMenuItem>
            <DropdownMenu modal={false}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      >
                        <Settings className="h-4 w-4 shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden flex-1 text-left">Settings</span>
                        <ChevronUp className="h-4 w-4 shrink-0 group-data-[collapsible=icon]:hidden" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="group-data-[collapsible=icon]:block hidden">
                    Settings
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent
                side={isCollapsed ? "right" : "top"}
                align="start"
                className="w-56"
                sideOffset={8}
              >
                <DropdownMenuLabel>Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e: Event) => e.preventDefault()}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <span>Notifications</span>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="cursor-pointer"
                >
                  {theme === "dark" ? (
                    <Sun className="mr-2 h-4 w-4" />
                  ) : (
                    <Moon className="mr-2 h-4 w-4" />
                  )}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>

          <SidebarSeparator className="my-1" />

          {/* Collapse/Expand Toggle */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? (
                <PanelLeft className="h-4 w-4 shrink-0" />
              ) : (
                <PanelLeftClose className="h-4 w-4 shrink-0" />
              )}
              <span className="group-data-[collapsible=icon]:hidden">Collapse</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
