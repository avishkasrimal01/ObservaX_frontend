interface SystemFooterProps {
  onNavigate?: (tab: string) => void;
}

type FooterLink = {
  label: string;
  tab: string;
};

const monitoringLinks: FooterLink[] = [
  { label: "Dashboard", tab: "dashboard" },
  { label: "Websites", tab: "websites" },
  { label: "Monitoring", tab: "monitoring" },
  { label: "Alerts", tab: "alerts" },
  { label: "Analytics", tab: "analytics" },
  { label: "AI Insights", tab: "ai-insights" },
];

const accountLinks: FooterLink[] = [
  { label: "Profile", tab: "profile" },
  { label: "Settings", tab: "settings" },
  { label: "Help", tab: "help" },
  { label: "Support", tab: "support" },
  { label: "About", tab: "about" },
];

const supportLinks: FooterLink[] = [
  { label: "Contact Us", tab: "support" },
  { label: "Help Center", tab: "help" },
  { label: "System Guide", tab: "about" },
  { label: "Security Settings", tab: "profile" },
  { label: "Notification Settings", tab: "settings" },
];

export function SystemFooter({ onNavigate }: SystemFooterProps) {
  return (
    <footer className="mt-8 -mx-8 -mb-8 border-t border-slate-200 bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-[1500px] px-8 py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight">Need quick access?</h3>
            <p className="mt-1 text-sm text-slate-600">Use these links to navigate core ObservaX functions.</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.("support")}
            className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            OPEN SUPPORT
          </button>
        </div>

        <div className="mt-6 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <h4 className="border-b border-slate-300 pb-2 text-sm font-semibold tracking-wide text-slate-700">MONITORING</h4>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                {monitoringLinks.map((item) => (
                  <li key={item.label}>
                    <button
                      type="button"
                      className="text-left transition hover:text-violet-700"
                      onClick={() => onNavigate?.(item.tab)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="border-b border-slate-300 pb-2 text-sm font-semibold tracking-wide text-slate-700">ACCOUNT</h4>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                {accountLinks.map((item) => (
                  <li key={item.label}>
                    <button
                      type="button"
                      className="text-left transition hover:text-violet-700"
                      onClick={() => onNavigate?.(item.tab)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="border-b border-slate-300 pb-2 text-sm font-semibold tracking-wide text-slate-700">SUPPORT</h4>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                {supportLinks.map((item) => (
                  <li key={item.label}>
                    <button
                      type="button"
                      className="text-left transition hover:text-violet-700"
                      onClick={() => onNavigate?.(item.tab)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ObservaX • AI Monitoring Platform</p>
          <div className="flex items-center gap-4">
            <span>System Status: Operational</span>
            <span>Version: v1.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
