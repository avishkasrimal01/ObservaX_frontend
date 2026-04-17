import { useCallback, useEffect, useState } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { DashboardView } from "./components/DashboardView";
import { WebsitesView } from "./components/WebsitesView";
import { MonitoringView } from "./components/MonitoringView";
import { AlertsView } from "./components/AlertsView";
import { AIInsightsView } from "./components/AIInsightsView";
import { AnalyticsView } from "./components/AnalyticsView";
import { SettingsView } from "./components/SettingsView";
import { ProfileView } from "./components/ProfileView";
import { BillingView } from "./components/BillingView";
import { HelpView } from "./components/HelpView";
import { SupportView } from "./components/SupportView";
import { AboutView } from "./components/AboutView";
import { AdminPanelView } from "./components/AdminPanelView";
import { SystemFooter } from "./components/SystemFooter";
import { LoginPage, SignupPage } from "./components/login";
import { LandingPage } from "./components/LandingPage";
import { SubscriptionOnboardingView } from "./components/SubscriptionOnboardingView";
import { Toaster } from "./components/ui/sonner";
import { signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import {
  loadMonitoredWebsites,
  saveMonitoredWebsites,
  type MonitoredWebsite,
} from "./lib/monitoredWebsitesStore";
import { fetchMonitoredWebsiteRecords } from "./lib/observerxApi";
import {
  loadObserverSettings,
  saveObserverSettings,
  type ObserverSettings,
} from "./lib/settingsStore";
import {
  loadSubscriptionSnapshot,
  type CurrentSubscription,
  type SubscriptionRecord,
} from "./lib/subscriptionStore";
import { firebaseAuth, firebaseDb } from "./lib/firebaseClient";

type SystemSearchItem = {
  id: string;
  label: string;
  description: string;
  tab: string;
  keywords: string[];
};

type ThemeMode = "light" | "dark";

const SESSION_TIMEOUT_MINUTES = Number(
  ((import.meta as { env?: Record<string, string | undefined> }).env?.VITE_SESSION_TIMEOUT_MINUTES as string | undefined) ||
    30,
);
const SESSION_TIMEOUT_MS = Math.max(1, SESSION_TIMEOUT_MINUTES) * 60 * 1000;
const SESSION_CHECK_INTERVAL_MS = 30 * 1000;
const THEME_STORAGE_KEY = "observerx-theme";

const AUTH_TABS = new Set(["landing", "login", "signup"]);
const ADMIN_ONLY_TABS = new Set(["admin-panel", "admin-users", "admin-payments", "admin-support"]);
const ADMIN_ALLOWED_TABS = new Set(["admin-panel", "admin-users", "admin-payments", "admin-support", "profile"]);

function getDefaultTabForRole(isAdmin: boolean) {
  return isAdmin ? "admin-panel" : "dashboard";
}

function getInitialTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

const systemSearchItems: SystemSearchItem[] = [
  { id: "dashboard", label: "Dashboard Overview", description: "View uptime, alerts, and response summaries", tab: "dashboard", keywords: ["overview", "home", "status"] },
  { id: "websites", label: "Manage Websites", description: "Add and manage monitored websites", tab: "websites", keywords: ["site", "url", "domain", "add website"] },
  { id: "monitoring", label: "Run Monitoring", description: "Execute scans and inspect check results", tab: "monitoring", keywords: ["scan", "check", "monitor"] },
  { id: "alerts", label: "Alert Management", description: "Review and resolve active alerts", tab: "alerts", keywords: ["incident", "warning", "critical"] },
  { id: "ai-insights", label: "AI Insights", description: "See AI-driven analysis and recommendations", tab: "ai-insights", keywords: ["ai", "insights", "recommendation", "ml"] },
  { id: "analytics", label: "Analytics", description: "Analyze trends and historical performance", tab: "analytics", keywords: ["chart", "metrics", "report"] },
  { id: "profile", label: "Profile Settings", description: "Update account, security, and notification preferences", tab: "profile", keywords: ["account", "user", "password"] },
  { id: "billing", label: "Billing", description: "Manage plan, invoices, and payment details", tab: "billing", keywords: ["invoice", "payment", "plan", "subscription"] },
  { id: "settings", label: "System Settings", description: "Configure monitoring and platform options", tab: "settings", keywords: ["config", "preferences", "setup"] },
  { id: "help", label: "Help Center", description: "Read guides and usage documentation", tab: "help", keywords: ["guide", "docs", "faq"] },
  { id: "support", label: "Support", description: "Contact support and incident assistance", tab: "support", keywords: ["contact", "ticket", "assist"] },
  { id: "about", label: "About ObservaX", description: "Understand platform capabilities and workflow", tab: "about", keywords: ["about", "platform", "how it works"] },
  { id: "admin-panel", label: "Admin Overview", description: "Summary of all admin operations and analytics", tab: "admin-panel", keywords: ["admin", "overview", "operations", "control"] },
  { id: "admin-users", label: "Admin Users", description: "Manage user accounts, roles, and account status", tab: "admin-users", keywords: ["admin", "users", "account", "access"] },
  { id: "admin-payments", label: "Admin Payments", description: "Review payment history and billing records", tab: "admin-payments", keywords: ["admin", "payments", "billing", "transactions"] },
  { id: "admin-support", label: "Admin Support", description: "Respond to support chat messages", tab: "admin-support", keywords: ["admin", "support", "chat", "inbox"] },
];


export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    if (!localStorage.getItem("authToken")) {
      return "landing";
    }

    const role = localStorage.getItem("userRole");
    return role === "admin" ? "admin-panel" : "dashboard";
  });
  const [websites, setWebsites] = useState<MonitoredWebsite[]>(() => loadMonitoredWebsites());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(localStorage.getItem("authToken")));
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem("userEmail"));
  const [userUid, setUserUid] = useState<string | null>(() => localStorage.getItem("userUid"));
  const [isAdmin, setIsAdmin] = useState<boolean>(() => localStorage.getItem("userRole") === "admin");
  const [isRoleLoading, setIsRoleLoading] = useState<boolean>(false);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(() => localStorage.getItem("userAvatarUrl"));
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string>("");
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState<boolean>(false);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionRecord[]>([]);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getInitialTheme());
  const [searchQuery, setSearchQuery] = useState("");
  const [settings, setSettings] = useState<ObserverSettings>(() =>
    loadObserverSettings(localStorage.getItem("userEmail") || "admin@example.com")
  );

  const isDarkMode = themeMode === "dark";

  const handleLogout = useCallback(
    async (nextTab: "landing" | "login" = "landing", message = "") => {
      try {
        await signOut(firebaseAuth);
      } catch {
        // Best-effort sign out.
      }

      localStorage.removeItem("authToken");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userUid");
      localStorage.removeItem("userAvatarUrl");
      localStorage.removeItem("userRole");
      localStorage.removeItem("lastActivityAt");

      setAccessDeniedMessage(message);
      setIsAuthenticated(false);
      setUserEmail(null);
      setUserUid(null);
      setIsAdmin(false);
      setUserAvatarUrl(null);
      setCurrentSubscription(null);
      setSubscriptionHistory([]);
      setActiveTab(nextTab);
    },
    [],
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchResults = normalizedQuery
    ? systemSearchItems
        .filter((item) => {
          if (isAdmin && !ADMIN_ALLOWED_TABS.has(item.tab)) {
            return false;
          }
          if (ADMIN_ONLY_TABS.has(item.tab) && !isAdmin) {
            return false;
          }
          const haystack = `${item.label} ${item.description} ${item.keywords.join(" ")}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        })
        .slice(0, 7)
    : [];

  const handleSelectSearchResult = (tab: string) => {
    setActiveTab(tab);
    setSearchQuery("");
  };

  const handleSearchSubmit = () => {
    if (searchResults.length > 0) {
      handleSelectSearchResult(searchResults[0].tab);
    }
  };

  useEffect(() => {
    saveMonitoredWebsites(websites);
  }, [websites]);

  useEffect(() => {
    saveObserverSettings(settings);
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDarkMode);
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [isDarkMode, themeMode]);

  useEffect(() => {
    if (!userEmail) return;

    setSettings((prev) => {
      if (prev.general.primaryEmail && prev.general.primaryEmail !== "admin@example.com") {
        return prev;
      }
      return {
        ...prev,
        general: { ...prev.general, primaryEmail: userEmail },
      };
    });
  }, [userEmail]);

  useEffect(() => {
    if (!isAuthenticated || !userUid) {
      setIsRoleLoading(false);
      return;
    }

    let cancelled = false;
    setIsRoleLoading(true);

    const hydrateRole = async () => {
      try {
        const userRef = doc(firebaseDb, "users", userUid);
        const userSnap = await getDoc(userRef);
        const role = String(userSnap.data()?.role || "user").toLowerCase();
        const hasAdminRole = role === "admin";

        if (cancelled) return;

        setIsAdmin(hasAdminRole);
        localStorage.setItem("userRole", hasAdminRole ? "admin" : "user");
      } catch {
        if (!cancelled) {
          setIsAdmin(localStorage.getItem("userRole") === "admin");
        }
      } finally {
        if (!cancelled) {
          setIsRoleLoading(false);
        }
      }
    };

    void hydrateRole();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userUid]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (!AUTH_TABS.has(activeTab)) {
        setActiveTab("landing");
      }
      return;
    }

    if (isAdmin) {
      if (!ADMIN_ALLOWED_TABS.has(activeTab)) {
        setActiveTab(getDefaultTabForRole(true));
      }
      return;
    }

    if (ADMIN_ONLY_TABS.has(activeTab) || AUTH_TABS.has(activeTab)) {
      setActiveTab(getDefaultTabForRole(false));
    }
  }, [activeTab, isAuthenticated, isAdmin]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const updateLastActivity = () => {
      localStorage.setItem("lastActivityAt", String(Date.now()));
    };

    const validateSession = () => {
      const lastActivityAt = Number(localStorage.getItem("lastActivityAt") || Date.now());
      const isSessionExpired = Date.now() - lastActivityAt > SESSION_TIMEOUT_MS;
      if (isSessionExpired) {
        void handleLogout("login", "Your session timed out due to inactivity. Please log in again.");
      }
    };

    updateLastActivity();
    const intervalId = window.setInterval(validateSession, SESSION_CHECK_INTERVAL_MS);
    const events: Array<keyof WindowEventMap> = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"];
    const onActivity = () => updateLastActivity();

    events.forEach((eventName) => {
      window.addEventListener(eventName, onActivity, { passive: true });
    });

    document.addEventListener("visibilitychange", validateSession);

    return () => {
      window.clearInterval(intervalId);
      events.forEach((eventName) => {
        window.removeEventListener(eventName, onActivity);
      });
      document.removeEventListener("visibilitychange", validateSession);
    };
  }, [handleLogout, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !userUid || isAdmin) {
      setCurrentSubscription(null);
      setSubscriptionHistory([]);
      setIsSubscriptionLoading(false);
      return;
    }

    let cancelled = false;
    setIsSubscriptionLoading(true);

    const hydrateSubscription = async () => {
      try {
        const snapshot = await loadSubscriptionSnapshot(userUid);
        if (cancelled) return;
        setCurrentSubscription(snapshot.currentSubscription);
        setSubscriptionHistory(snapshot.history);
      } catch {
        if (!cancelled) {
          setCurrentSubscription(null);
          setSubscriptionHistory([]);
        }
      } finally {
        if (!cancelled) {
          setIsSubscriptionLoading(false);
        }
      }
    };

    void hydrateSubscription();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userUid, isAdmin]);

  useEffect(() => {
    if (!isAuthenticated || !userUid) {
      return;
    }

    const userRef = doc(firebaseDb, "users", userUid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      const payload = snapshot.data() as { accountStatus?: string };
      const accountStatus = String(payload.accountStatus || "active").toLowerCase();

      if (accountStatus === "deactivated" || accountStatus === "removed") {
        void handleLogout(
          "login",
          "Access denied. Your account is deactivated. Please contact an admin to reactivate your account.",
        );
      }
    });

    return () => unsubscribe();
  }, [handleLogout, isAuthenticated, userUid]);

  useEffect(() => {
    let cancelled = false;

    const hydrateFromBackend = async () => {
      try {
        const res = await fetchMonitoredWebsiteRecords();
        if (cancelled || !res.websites?.length) return;

        setWebsites((prev) => {
          const byId = new Map(prev.map((w) => [w.id, w]));
          for (const record of res.websites) {
            const id = String(record.id ?? record.url);
            const existing = byId.get(id);
            byId.set(id, {
              id,
              name: record.name || existing?.name || record.url,
              url: record.url,
              monitoring: record.monitoring ?? existing?.monitoring ?? true,
              status:
                record.status === "down"
                  ? "down"
                  : record.status === "degraded"
                    ? "degraded"
                  : "operational",
              uptime: typeof record.uptime === "number" ? record.uptime : existing?.uptime ?? 0,
              responseTime:
                typeof record.responseTime === "number" ? record.responseTime : existing?.responseTime ?? 0,
              lastChecked: record.lastChecked || existing?.lastChecked || "Unknown",
              scanError: record.scanError ?? existing?.scanError ?? null,
              latest_runs: record.latest_runs ?? existing?.latest_runs ?? {},
              httpResult: existing?.httpResult ?? null,
              domResult: existing?.domResult ?? null,
              qaResult: existing?.qaResult ?? null,
              scanLoading: false,
            });
          }
          return Array.from(byId.values());
        });
      } catch {
        // Backend may be offline; keep local state.
      }
    };

    void hydrateFromBackend();
    return () => {
      cancelled = true;
    };
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView websites={websites} />;
      case "websites":
        return <WebsitesView websites={websites} setWebsites={setWebsites} alertEmail={userEmail} />;
      case "monitoring":
        return <MonitoringView websites={websites} />;
      case "alerts":
        return <AlertsView websites={websites} />;
      case "ai-insights":
        return <AIInsightsView websites={websites} />;
      case "analytics":
        return <AnalyticsView websites={websites} />;
      case "settings":
        return <SettingsView settings={settings} setSettings={setSettings} />;
      case "profile":
        return (
          <ProfileView
            userEmail={userEmail}
            onUserEmailChange={setUserEmail}
            onUserAvatarChange={setUserAvatarUrl}
          />
        );
      case "billing":
        return (
          <BillingView
            currentSubscription={currentSubscription}
            subscriptionHistory={subscriptionHistory}
            onChangePlanClick={() => setActiveTab("subscription-onboarding")}
          />
        );
      case "help":
        return <HelpView />;
      case "support":
        return <SupportView userUid={userUid} userEmail={userEmail} />;
      case "about":
        return <AboutView />;
      case "admin-panel":
        return isAdmin ? (
          <AdminPanelView
            userEmail={userEmail}
            isAdmin={isAdmin}
            websites={websites}
            defaultSection="overview"
            showSectionTabs={false}
          />
        ) : (
          <DashboardView websites={websites} />
        );
      case "admin-users":
        return isAdmin ? (
          <AdminPanelView
            userEmail={userEmail}
            isAdmin={isAdmin}
            websites={websites}
            defaultSection="users"
            showSectionTabs={false}
          />
        ) : (
          <DashboardView websites={websites} />
        );
      case "admin-payments":
        return isAdmin ? (
          <AdminPanelView
            userEmail={userEmail}
            isAdmin={isAdmin}
            websites={websites}
            defaultSection="payments"
            showSectionTabs={false}
          />
        ) : (
          <DashboardView websites={websites} />
        );
      case "admin-support":
        return isAdmin ? (
          <AdminPanelView
            userEmail={userEmail}
            isAdmin={isAdmin}
            websites={websites}
            defaultSection="support"
            showSectionTabs={false}
          />
        ) : (
          <DashboardView websites={websites} />
        );
      case "login":
        return (
          <LoginPage
            themeMode={themeMode}
            onThemeToggle={toggleThemeMode}
            onSwitchMode={() => setActiveTab("signup")}
            onAuthSuccess={({ email, uid, isAdmin: authedIsAdmin }) => {
              setAccessDeniedMessage("");
              setIsAuthenticated(true);
              setUserEmail(email);
              setUserUid(uid);
              setIsAdmin(authedIsAdmin);
              setActiveTab(getDefaultTabForRole(authedIsAdmin));
            }}
          />
        );
      case "signup":
        return (
          <SignupPage
            themeMode={themeMode}
            onThemeToggle={toggleThemeMode}
            onSwitchMode={() => setActiveTab("login")}
            onAuthSuccess={({ email, uid, isAdmin: authedIsAdmin }) => {
              setAccessDeniedMessage("");
              setIsAuthenticated(true);
              setUserEmail(email);
              setUserUid(uid);
              setIsAdmin(authedIsAdmin);
              setActiveTab(authedIsAdmin ? getDefaultTabForRole(true) : "subscription-onboarding");
            }}
          />
        );
      case "landing":
        return <LandingPage themeMode={themeMode} onThemeToggle={toggleThemeMode} onGetStarted={() => setActiveTab("login")} />;
      case "subscription-onboarding":
        if (!userUid || !userEmail) {
          return <LandingPage themeMode={themeMode} onThemeToggle={toggleThemeMode} onGetStarted={() => setActiveTab("login")} />;
        }
        return (
          <SubscriptionOnboardingView
            userUid={userUid}
            userEmail={userEmail}
            onSubscriptionActivated={({ currentSubscription: activatedSubscription }) => {
              setCurrentSubscription(activatedSubscription);
              if (!userUid) return;
              void loadSubscriptionSnapshot(userUid).then((snapshot) => {
                setSubscriptionHistory(snapshot.history);
              });
              setActiveTab("dashboard");
            }}
          />
        );
      default:
        return <DashboardView websites={websites} />;
    }
  };

  const toggleThemeMode = () => {
    setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background">
        {accessDeniedMessage ? (
          <div className="mx-auto max-w-md px-4 pt-6">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
              {accessDeniedMessage}
            </div>
          </div>
        ) : null}
        {activeTab === "landing" ? (
          <LandingPage themeMode={themeMode} onThemeToggle={toggleThemeMode} onGetStarted={() => setActiveTab("login")} />
        ) : activeTab === "signup" ? (
          <SignupPage
            themeMode={themeMode}
            onThemeToggle={toggleThemeMode}
            onSwitchMode={() => setActiveTab("login")}
            onAuthSuccess={({ email, uid, isAdmin: authedIsAdmin }) => {
              setAccessDeniedMessage("");
              setIsAuthenticated(true);
              setUserEmail(email);
              setUserUid(uid);
              setIsAdmin(authedIsAdmin);
              setActiveTab(authedIsAdmin ? getDefaultTabForRole(true) : "subscription-onboarding");
            }}
          />
        ) : (
          <LoginPage
            themeMode={themeMode}
            onThemeToggle={toggleThemeMode}
            onSwitchMode={() => setActiveTab("signup")}
            onAuthSuccess={({ email, uid, isAdmin: authedIsAdmin }) => {
              setAccessDeniedMessage("");
              setIsAuthenticated(true);
              setUserEmail(email);
              setUserUid(uid);
              setIsAdmin(authedIsAdmin);
              setActiveTab(getDefaultTabForRole(authedIsAdmin));
            }}
          />
        )}
        <Toaster />
      </div>
    );
  }

  if (isAuthenticated && isRoleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center px-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading your access role...</p>
        </div>
        <Toaster />
      </div>
    );
  }

  if (!isAdmin && isSubscriptionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center px-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
          <p className="text-sm text-gray-600 dark:text-gray-300">Checking your subscription access...</p>
        </div>
        <Toaster />
      </div>
    );
  }

  if (!isAdmin && !currentSubscription) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background">
        {userUid && userEmail ? (
          <SubscriptionOnboardingView
            userUid={userUid}
            userEmail={userEmail}
            onSubscriptionActivated={({ currentSubscription: activatedSubscription }) => {
              setCurrentSubscription(activatedSubscription);
              if (!userUid) return;
              void loadSubscriptionSnapshot(userUid).then((snapshot) => {
                setSubscriptionHistory(snapshot.history);
              });
              setActiveTab("dashboard");
            }}
          />
        ) : (
          <LandingPage themeMode={themeMode} onThemeToggle={toggleThemeMode} onGetStarted={() => setActiveTab("login")} />
        )}
        <Toaster />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-background">
      <Header
        activeAlerts={websites.filter((w) => w.monitoring && (w.status === "down" || !!w.scanError)).length}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        userAvatarUrl={userAvatarUrl}
        searchQuery={searchQuery}
        searchResults={searchResults}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        onSelectSearchResult={handleSelectSearchResult}
        onLoginClick={() => setActiveTab("login")}
        onAlertsClick={() => setActiveTab("alerts")}
        onProfileClick={() => setActiveTab("profile")}
        onBillingClick={() => setActiveTab("billing")}
        onSettingsClick={() => setActiveTab("settings")}
        themeMode={themeMode}
        onThemeToggle={toggleThemeMode}
        onLogoutClick={() => {
          void handleLogout("landing");
        }}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin} />
        <main
          className="flex-1 overflow-y-auto p-8"
          style={{
            backgroundImage:
              isDarkMode
                ? "linear-gradient(rgba(15, 23, 42, 0.88), rgba(15, 23, 42, 0.88)), url('https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1800&q=80')"
                : "linear-gradient(rgba(248, 250, 252, 0.9), rgba(248, 250, 252, 0.9)), url('https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1800&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="rounded-2xl bg-gradient-to-br from-cyan-100/30 via-white/35 to-violet-100/30 p-4 sm:p-6 dark:from-slate-900/55 dark:via-slate-800/45 dark:to-blue-950/55">
            {renderContent()}
          </div>
          <SystemFooter onNavigate={setActiveTab} />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
