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
  useSidebar,
} from "./ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "./ui/tooltip";
import { LayoutDashboard, Package, ShoppingCart, Truck, Users, Warehouse, ClipboardList, Shield, PanelLeft, PanelLeftClose } from "lucide-react";
import { ViewType } from "../App";
import { useAuth } from "../context/auth-context";

interface AppSidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

export function AppSidebar({ currentView, setCurrentView }: AppSidebarProps) {
  const { user } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

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
