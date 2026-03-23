export type HttpCheckApiResponse = {
  ok: boolean;
  error?: string;
  checked_at?: string;
  firestore_run_id?: string | null;
  summary?: {
    total_urls: number;
    failed_http: number;
    failed_browser: number;
    with_console_errors: number;
  };
  results?: Array<{
    url: string;
    final_url: string | null;
    status_code: number | null;
    latency_ms: number | null;
    browser_status: number | null;
    browser_load_ms: number | null;
    issues: string[];
    error?: string | null;
    browser_error?: string | null;
    console_errors?: Array<{ type: string; text: string }>;
    page_errors?: Array<{ message: string }>;
    request_failures?: Array<{
      url: string;
      method: string;
      resource_type: string;
      failure: string;
    }>;
  }>;
};

export type DomMonitorApiResponse = {
  ok: boolean;
  error?: string;
  checked_at?: string;
  firestore_run_id?: string | null;
  summary?: {
    total_urls: number;
    baselines_created: number;
    changed_urls: number;
    errored_urls: number;
  };
  results?: Array<{
    url: string;
    status: number | null;
    change_score: number | null;
    issues: string[];
    missing_selectors: string[];
    console_error_count: number;
    page_error: string | null;
  }>;
};

export type SiteQaApiResponse = {
  ok: boolean;
  error?: string;
  firestore_run_id?: string | null;
  summary?: {
    pages_crawled: number;
    edges_found: number;
    resources_found: number;
    broken_count: number;
    html_issue_count: number;
    regression_checks: number;
  };
  broken?: Array<{
    type: string;
    url: string;
    status: number | null;
    error?: string | null;
  }>;
  html_issues?: Array<{
    url: string;
    issue: string;
    status: number | null;
    detail?: string;
  }>;
  regression?: Array<{
    url: string;
    browser_status: number | null;
    browser_error: string | null;
    missing_selectors: string[];
    console_error_count: number;
    page_error_count: number;
  }>;
};

const API_BASE_URL = (import.meta.env.VITE_OBSERVERX_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://observa-x-backend.vercel.app";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!res.ok || (typeof data === "object" && data && "ok" in data && data.ok === false)) {
    throw new Error((data as { error?: string }).error || `Request failed: ${res.status}`);
  }
  return data as T;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const data = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!res.ok || (typeof data === "object" && data && "ok" in data && data.ok === false)) {
    throw new Error((data as { error?: string }).error || `Request failed: ${res.status}`);
  }
  return data as T;
}

async function deleteJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  const data = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!res.ok || (typeof data === "object" && data && "ok" in data && data.ok === false)) {
    throw new Error((data as { error?: string }).error || `Request failed: ${res.status}`);
  }
  return data as T;
}

export async function runWebsiteHttpCheck(url: string, alertEmail?: string | null) {
  return postJson<HttpCheckApiResponse>("/api/http-check", {
    urls: [url],
    save_to_firestore: true,
    alert_email: alertEmail || undefined,
  });
}

export async function runWebsiteDomMonitor(url: string, alertEmail?: string | null) {
  return postJson<DomMonitorApiResponse>("/api/dom-monitor", {
    urls: [url],
    critical_selectors: { [url]: ["body", "h1", "a"] },
    save_to_firestore: true,
    alert_email: alertEmail || undefined,
  });
}

export async function runWebsiteSiteQa(url: string, alertEmail?: string | null) {
  return postJson<SiteQaApiResponse>("/api/site-qa", {
    base_url: url,
    max_pages: 1,
    same_domain_only: true,
    critical_pages: { [url]: ["body", "h1"] },
    save_to_firestore: true,
    alert_email: alertEmail || undefined,
  });
}

export type MonitoredWebsiteRecord = {
  id?: string;
  name: string;
  url: string;
  monitoring?: boolean;
  status?: string;
  uptime?: number;
  responseTime?: number | null;
  lastChecked?: string;
  scanError?: string | null;
  latest_runs?: {
    http_check_run_id?: string | null;
    dom_monitor_run_id?: string | null;
    site_qa_run_id?: string | null;
  };
};

export async function saveMonitoredWebsiteRecord(record: MonitoredWebsiteRecord) {
  return postJson<{ ok: boolean; id: string }>("/api/websites", record);
}

export async function fetchMonitoredWebsiteRecords() {
  return getJson<{ ok: boolean; websites: MonitoredWebsiteRecord[] }>("/api/websites");
}

export async function deleteMonitoredWebsiteRecord(websiteId: string) {
  const id = String(websiteId || "").trim();
  if (!id) {
    throw new Error("Website id is required");
  }
  return deleteJson<{ ok: boolean; id: string; deleted: boolean }>(`/api/websites/${encodeURIComponent(id)}`);
}

export type IssueSolutionRequest = {
  website: string;
  url?: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  issue_codes?: string[];
  details?: string[];
};

export type IssueSolutionApiResponse = {
  ok: boolean;
  issue: {
    website: string;
    url?: string;
    severity: string;
    title: string;
    message: string;
    issue_codes: string[];
    details: string[];
  };
  solution: {
    summary: string;
    root_cause: string;
    steps: string[];
    prevention: string[];
    priority: "high" | "medium" | "low";
    confidence: number;
    source: "llm" | "fallback";
  };
  notification?: {
    sent: boolean;
    channel: string;
    detail: string;
    status_code?: number;
  };
};

export async function generateIssueSolution(payload: IssueSolutionRequest) {
  return postJson<IssueSolutionApiResponse>("/api/issue-solutions", payload);
}

export async function sendEmailAlertNotification(payload: {
  to_email: string;
  subject?: string;
  message: string;
  metadata?: Record<string, string>;
}) {
  return postJson<{ ok: boolean; to_email: string; subject: string; provider: string }>(
    "/api/notifications/email-alert",
    payload,
  );
}

export async function sendGoogleAuthNotification(payload: {
  to_email: string;
  event_type: "login" | "registration";
  provider?: string;
  website?: string;
  timestamp?: string;
}) {
  return postJson<{ ok: boolean; to_email: string; subject: string; provider: string }>(
    "/api/notifications/google-auth",
    payload,
  );
}

export { API_BASE_URL };
