import type { MonitoredWebsite } from "../lib/monitoredWebsitesStore";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { AlertTriangle, CheckCircle, XCircle, Info, X } from "lucide-react";
import { useState } from "react";

interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  website: string;
  timestamp: string;
  resolved: boolean;
}

interface AlertsViewProps {
  websites: MonitoredWebsite[];
}

function buildAlertsFromWebsites(websites: MonitoredWebsite[]): Alert[] {
  const alerts: Alert[] = [];
  for (const site of websites.filter((w) => w.monitoring)) {
    const http = site.httpResult?.results?.[0];
    const dom = site.domResult?.results?.[0];
    const qaSummary = site.qaResult?.summary;
    const ts = site.lastChecked || "Unknown";

    if (site.status === "down" || (http?.status_code ?? 0) >= 400 || site.scanError) {
      alerts.push({
        id: `${site.id}-down`,
        severity: "critical",
        title: "Website Down",
        message: site.scanError || `HTTP status ${http?.status_code ?? "failed"}`,
        website: site.name,
        timestamp: ts,
        resolved: false,
      });
    }

    if ((http?.latency_ms ?? 0) > 500) {
      alerts.push({
        id: `${site.id}-latency`,
        severity: "warning",
        title: "High Response Time",
        message: `Response time is ${http?.latency_ms}ms`,
        website: site.name,
        timestamp: ts,
        resolved: false,
      });
    }

    if ((qaSummary?.broken_count ?? 0) > 0) {
      alerts.push({
        id: `${site.id}-broken`,
        severity: "warning",
        title: "Broken Links/Resources",
        message: `${qaSummary?.broken_count} broken item(s) found by Site QA`,
        website: site.name,
        timestamp: ts,
        resolved: false,
      });
    }

    if ((dom?.issues?.length ?? 0) > 0) {
      alerts.push({
        id: `${site.id}-dom`,
        severity: "info",
        title: "DOM Changes Detected",
        message: `DOM monitor reported ${dom?.issues?.length ?? 0} issue(s)`,
        website: site.name,
        timestamp: ts,
        resolved: false,
      });
    }
  }
  return alerts;
}

function sortAlertsNewestFirst(items: Alert[]): Alert[] {
  return [...items].sort((a, b) => {
    const aBase = a.id.split("-")[0] || "";
    const bBase = b.id.split("-")[0] || "";
    const aNum = Number(aBase);
    const bNum = Number(bBase);
    const aNumeric = Number.isFinite(aNum);
    const bNumeric = Number.isFinite(bNum);

    // Newer websites use larger timestamp-like ids.
    if (aNumeric && bNumeric) return bNum - aNum;
    if (aNumeric) return -1;
    if (bNumeric) return 1;

    // Fallback: keep deterministic order.
    return b.id.localeCompare(a.id);
  });
}

export function AlertsView({ websites }: AlertsViewProps) {
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [resolved, setResolved] = useState<Record<string, boolean>>({});
  const generatedAlerts = buildAlertsFromWebsites(websites);
  const alerts = generatedAlerts
    .filter((a) => !dismissed[a.id])
    .map((a) => ({ ...a, resolved: !!resolved[a.id] }));

  const resolveAlert = (id: string) => {
    setResolved((prev) => ({ ...prev, [id]: true }));
  };

  const dismissAlert = (id: string) => {
    setDismissed((prev) => ({ ...prev, [id]: true }));
  };

  const activeAlerts = sortAlertsNewestFirst(alerts.filter(a => !a.resolved));
  const resolvedAlerts = sortAlertsNewestFirst(alerts.filter(a => a.resolved));
  const criticalCount = activeAlerts.filter(a => a.severity === "critical").length;
  const warningCount = activeAlerts.filter(a => a.severity === "warning").length;

  const getIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Alert Management</h2>
        <p className="text-sm text-gray-600">Monitor and respond to system alerts</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Alerts</p>
                <p className="mt-2 text-3xl font-semibold text-red-600">{criticalCount}</p>
              </div>
              <XCircle className="h-12 w-12 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Warnings</p>
                <p className="mt-2 text-3xl font-semibold text-yellow-600">{warningCount}</p>
              </div>
              <AlertTriangle className="h-12 w-12 text-yellow-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved Today</p>
                <p className="mt-2 text-3xl font-semibold text-green-600">
                  {alerts.filter(a => a.resolved).length}
                </p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Active Alerts</h3>
        {activeAlerts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-gray-600">No active alerts from current monitoring data.</CardContent>
          </Card>
        ) : activeAlerts.map((alert) => (
          <Card key={alert.id} className={`border-l-4 ${
            alert.severity === "critical" ? "border-l-red-600" :
            alert.severity === "warning" ? "border-l-yellow-600" :
            "border-l-blue-600"
          }`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {getIcon(alert.severity)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                    <Badge variant={
                      alert.severity === "critical" ? "destructive" :
                      alert.severity === "warning" ? "secondary" :
                      "default"
                    }>
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="font-medium">{alert.website}</span>
                    <span>•</span>
                    <span>{alert.timestamp}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => resolveAlert(alert.id)}
                  >
                    Resolve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => dismissAlert(alert.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <h3 className="text-lg font-semibold text-gray-900 pt-6">Resolved Alerts</h3>
        {resolvedAlerts.map((alert) => (
          <Card key={alert.id} className="bg-gray-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-700">{alert.title}</h4>
                    <Badge variant="outline">Resolved</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="font-medium">{alert.website}</span>
                    <span>•</span>
                    <span>{alert.timestamp}</span>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => dismissAlert(alert.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
