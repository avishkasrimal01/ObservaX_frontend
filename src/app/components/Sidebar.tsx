import { 
  LayoutDashboard, 
  Globe, 
  Activity, 
  AlertTriangle, 
  Brain,
  Shield,
  Settings,
  User,
  Users,
  CreditCard,
  MessageSquare,
  FileText,
  BarChart3,
  HelpCircle,
  LifeBuoy,
  Info,
} from "lucide-react";
import { cn } from "./ui/utils";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin?: boolean;
}

const mainMenuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "websites", label: "Websites", icon: Globe },
  { id: "monitoring", label: "Monitoring", icon: Activity },
  { id: "alerts", label: "Alerts", icon: AlertTriangle },
  { id: "ai-insights", label: "AI Insights", icon: Brain },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "profile", label: "Profile", icon: User },
  { id: "settings", label: "Settings", icon: Settings },
];

const adminMenuItems = [
  { id: "admin-panel", label: "Admin Overview", icon: Shield },
  { id: "admin-users", label: "Admin Users", icon: Users },
  { id: "admin-payments", label: "Admin Payments", icon: CreditCard },
  { id: "admin-reports", label: "Admin Reports", icon: FileText },
  { id: "admin-support", label: "Admin Support", icon: MessageSquare },
  { id: "profile", label: "Profile", icon: User },
];

const bottomMenuItems = [
  { id: "help", label: "Help", icon: HelpCircle },
  { id: "support", label: "Support", icon: LifeBuoy },
  { id: "about", label: "About", icon: Info },
];

export function Sidebar({ activeTab, onTabChange, isAdmin = false }: SidebarProps) {
  const visibleMainMenuItems = isAdmin ? adminMenuItems : mainMenuItems;
  const visibleBottomMenuItems = isAdmin ? [] : bottomMenuItems;

  return (
    <aside className="w-64 border-r bg-gray-50 p-4">
      <div className="flex h-full flex-col">
        <nav className="space-y-1">
          {visibleMainMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <nav className="mt-auto space-y-1 border-t pt-4">
          {visibleBottomMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
