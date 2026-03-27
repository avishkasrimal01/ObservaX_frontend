import { useEffect, useState } from "react";
import type { MonitoredWebsite } from "../lib/monitoredWebsitesStore";
import { StatCard } from "./StatCard";
import { Globe, CheckCircle, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardViewProps {
  websites: MonitoredWebsite[];
}

export function DashboardView({ websites }: DashboardViewProps) {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const formattedDate = now.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const monitored = websites.filter((site) => site.monitoring);
  const onlineCount = monitored.filter((site) => site.status === "operational").length;
  const downCount = monitored.filter((site) => site.status === "down").length;
  const alertCount = monitored.filter((site) => site.scanError || site.status === "down").length;
  const responseTimes = monitored
    .map((site) => site.httpResult?.results?.[0]?.latency_ms ?? site.responseTime)
    .filter((v): v is number => typeof v === "number" && v > 0);
  const avgResponse = responseTimes.length
    ? Math.round(responseTimes.reduce((sum, v) => sum + v, 0) / responseTimes.length)
    : 0;
  const avgUptime = monitored.length
    ? Math.round((monitored.reduce((sum, site) => sum + (typeof site.uptime === "number" ? site.uptime : 0), 0) / monitored.length) * 10) / 10
    : 0;

  const stats = [
    {
      title: "Total Websites",
      value: monitored.length,
      change: `${onlineCount} online / ${downCount} down`,
      changeType: (downCount > 0 ? "negative" as const : "positive" as const),
      icon: Globe,
      iconColor: "bg-blue-500",
    },
    {
      title: "Uptime",
      value: `${avgUptime.toFixed(1)}%`,
      change: monitored.length ? "Live from scans" : "No sites monitored",
      changeType: (avgUptime >= 99 ? "positive" as const : "neutral" as const),
      icon: CheckCircle,
      iconColor: "bg-green-500",
    },
    {
      title: "Active Alerts",
      value: alertCount,
      change: downCount ? `${downCount} site(s) down` : "No critical issues",
      changeType: (alertCount > 0 ? ("negative" as const) : ("positive" as const)),
      icon: AlertTriangle,
      iconColor: "bg-red-500",
    },
    {
      title: "Avg Response Time",
      value: avgResponse ? `${avgResponse}ms` : "N/A",
      change: responseTimes.length ? `${responseTimes.length} site(s) reporting` : "No response data yet",
      changeType: (avgResponse > 0 && avgResponse < 500 ? "positive" as const : "neutral" as const),
      icon: Clock,
      iconColor: "bg-purple-500",
    },
  ];

  const performanceData = Array.from({ length: 6 }).map((_, idx) => ({
    time: `${String(idx * 4).padStart(2, "0")}:00`,
    responseTime: avgResponse || 0,
    availability: monitored.length ? Math.max(0, Math.min(100, avgUptime)) : 0,
  }));

  const recentActivity = monitored
    .slice()
    .sort((a, b) => (a.lastChecked < b.lastChecked ? 1 : -1))
    .slice(0, 6)
    .map((site) => {
      const http = site.httpResult?.results?.[0];
      const qaBroken = site.qaResult?.summary?.broken_count ?? 0;
      const domIssues = site.domResult?.results?.[0]?.issues?.length ?? 0;
      const isDown = site.status === "down";
      const hasWarnings = !isDown && ((http?.issues?.length ?? 0) > 0 || qaBroken > 0 || domIssues > 0 || !!site.scanError);
      return {
        site: site.url.replace(/^https?:\/\//, ""),
        status: isDown ? "down" : hasWarnings ? "warning" : "online",
        message: site.scanError
          ? site.scanError
          : isDown
            ? `HTTP ${http?.status_code ?? "failed"}`
            : hasWarnings
              ? `Warnings: ${http?.issues?.length ?? 0} HTTP, ${domIssues} DOM, ${qaBroken} QA`
              : "All checks healthy",
        time: site.lastChecked || "Unknown",
        severity: isDown ? "error" : hasWarnings ? "warning" : "success",
      };
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h2>
          <p className="text-sm text-gray-600">Monitor your web applications in real-time</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white/80 px-4 py-2 text-right shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Current Date & Time</p>
          <p className="text-xs font-semibold text-gray-700">{formattedDate}</p>
          <p className="text-lg font-semibold text-blue-700">{formattedTime}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Response Time (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Availability (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="availability" 
                  stroke="#10b981" 
                  fill="#10b98144"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-600">No monitored website activity yet. Add a website and run checks.</p>
            ) : recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0">
                <div className={`mt-1 h-2 w-2 rounded-full ${
                  activity.severity === 'success' ? 'bg-green-500' :
                  activity.severity === 'warning' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{activity.site}</p>
                    <Badge variant={
                      activity.severity === 'success' ? 'default' :
                      activity.severity === 'warning' ? 'secondary' :
                      'destructive'
                    }>
                      {activity.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{activity.message}</p>
                </div>
                <span className="text-xs text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
