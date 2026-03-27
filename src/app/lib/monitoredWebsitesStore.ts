import type {
  DomMonitorApiResponse,
  HttpCheckApiResponse,
  SiteQaApiResponse,
} from "./observerxApi";

export type WebsiteStatus = "operational" | "degraded" | "down";

export interface MonitoredWebsite {
  id: string;
  uid?: string;
  name: string;
  url: string;
  status: WebsiteStatus;
  uptime: number;
  responseTime: number;
  lastChecked: string;
  monitoring: boolean;
  scanLoading?: boolean;
  scanError?: string | null;
  latest_runs?: {
    http_check_run_id?: string | null;
    dom_monitor_run_id?: string | null;
    site_qa_run_id?: string | null;
  };
  httpResult?: HttpCheckApiResponse | null;
  domResult?: DomMonitorApiResponse | null;
  qaResult?: SiteQaApiResponse | null;
}

const STORAGE_KEY = "observerx.monitoredWebsites.v1";

export const defaultMonitoredWebsites: MonitoredWebsite[] = [
  {
    id: "1",
    name: "Main Application",
    url: "https://app.example.com",
    status: "operational",
    uptime: 99.9,
    responseTime: 245,
    lastChecked: "1 min ago",
    monitoring: true,
  },
  {
    id: "2",
    name: "API Gateway",
    url: "https://api.example.com",
    status: "degraded",
    uptime: 99.2,
    responseTime: 512,
    lastChecked: "2 mins ago",
    monitoring: true,
  },
  {
    id: "3",
    name: "Checkout Service",
    url: "https://checkout.example.com",
    status: "down",
    uptime: 98.1,
    responseTime: 0,
    lastChecked: "5 mins ago",
    monitoring: true,
  },
  {
    id: "4",
    name: "Blog",
    url: "https://blog.example.com",
    status: "operational",
    uptime: 100,
    responseTime: 189,
    lastChecked: "30 secs ago",
    monitoring: true,
  },
];

export function loadMonitoredWebsites(): MonitoredWebsite[] {
  if (typeof window === "undefined") {
    return defaultMonitoredWebsites;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultMonitoredWebsites;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return defaultMonitoredWebsites;
    }
    return parsed as MonitoredWebsite[];
  } catch {
    return defaultMonitoredWebsites;
  }
}

export function saveMonitoredWebsites(websites: MonitoredWebsite[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(websites));
  } catch {
    // Ignore storage quota / serialization failures in UI.
  }
}
