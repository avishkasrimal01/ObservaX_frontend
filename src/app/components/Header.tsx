import { Bell, Moon, Search, Settings, Sun, User } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface HeaderProps {
  activeAlerts: number;
  isAuthenticated?: boolean;
  userEmail?: string | null;
  userAvatarUrl?: string | null;
  hideAlertsButton?: boolean;
  hideSettingsAndBilling?: boolean;
  searchQuery?: string;
  searchResults?: Array<{ id: string; label: string; description: string; tab: string }>;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  onSelectSearchResult?: (tab: string) => void;
  onLoginClick?: () => void;
  onAlertsClick?: () => void;
  onProfileClick?: () => void;
  onBillingClick?: () => void;
  onSettingsClick?: () => void;
  themeMode?: "light" | "dark";
  onThemeToggle?: () => void;
  onLogoutClick?: () => void;
}

export function Header({
  activeAlerts,
  isAuthenticated = false,
  userEmail,
  userAvatarUrl,
  hideAlertsButton = false,
  hideSettingsAndBilling = false,
  searchQuery = "",
  searchResults = [],
  onSearchChange,
  onSearchSubmit,
  onSelectSearchResult,
  onLoginClick,
  onAlertsClick,
  onProfileClick,
  onBillingClick,
  onSettingsClick,
  themeMode = "light",
  onThemeToggle,
  onLogoutClick,
}: HeaderProps) {
  const isDarkMode = themeMode === "dark";

  return (
    <header className="border-b bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-900/90">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
        <div className="flex items-center gap-3">
          {/* <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
            <span className="text-lg font-bold text-white">OX</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">ObservaX</h1>
            <p className="text-xs text-gray-500">AI-Driven Monitoring Platform</p>
          </div> */}
          <div className="flex h-11 items-center">
            <img
              src="https://res.cloudinary.com/dujfud9ha/image/upload/v1768732317/ObservaX_logo_kewhfu.png"
              alt="ObservaX Logo"
              className="h-20 w-auto"
            />
            
          </div>

        </div>

        {isAuthenticated ? (
          <div className="flex justify-center">
            <div className="relative hidden w-full max-w-xl xl:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSearchSubmit?.();
                  }
                }}
                placeholder="Search features"
                className="bg-gray-100/70 border-0 shadow-none pl-9 focus-visible:ring-0 focus-visible:border-transparent dark:bg-gray-800/80"
              />

              {searchQuery.trim() && (
                <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-72 overflow-auto rounded-xl border bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  {searchResults.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No matching system function found</p>
                  ) : (
                    searchResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        className="w-full rounded-lg px-3 py-2 text-left"
                        onClick={() => onSelectSearchResult?.(result.tab)}
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{result.label}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{result.description}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3">
          <div>
            {isAuthenticated ? (
              <div className="text-right">
                <p className="text-xs text-gray-500">Signed in</p>
                <p className="text-sm font-medium text-gray-900 max-w-[180px] truncate dark:text-gray-100">{userEmail || "User"}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={onLoginClick}
                className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2 text-sm font-medium text-white shadow-md transition hover:opacity-90"
              >
                Login
              </button>
            )}
          </div>

          {!hideAlertsButton ? (
            <Button variant="ghost" size="icon" className="relative" onClick={onAlertsClick}>
              <Bell className="h-5 w-5" />
              {activeAlerts > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs">
                  {activeAlerts}
                </Badge>
              )}
            </Button>
          ) : null}

          <Button
            variant="ghost"
            size="icon"
            onClick={onThemeToggle}
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="h-8 w-8">
                  {userAvatarUrl ? <AvatarImage src={userAvatarUrl} alt="Profile avatar" /> : null}
                  <AvatarFallback className="text-xs">
                    {userEmail?.trim()?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {!hideSettingsAndBilling ? (
                <DropdownMenuItem onClick={onSettingsClick}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={onProfileClick}>Profile</DropdownMenuItem>
              {!hideSettingsAndBilling ? <DropdownMenuItem onClick={onBillingClick}>Billing</DropdownMenuItem> : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogoutClick}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
