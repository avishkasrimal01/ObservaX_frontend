import type { MonitoredWebsite } from "../lib/monitoredWebsitesStore";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Activity, 
  Link as LinkIcon, 
  Zap, 
  Layout, 
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { Progress } from "./ui/progress";

const monitoringChecks = [
  {
    category: "Page Load Performance",
    icon: Zap,
    checks: [
      { name: "First Contentful Paint", value: "1.2s", status: "good", threshold: "< 1.8s" },
      { name: "Largest Contentful Paint", value: "2.1s", status: "needs-improvement", threshold: "< 2.5s" },
      { name: "Total Blocking Time", value: "150ms", status: "good", threshold: "< 200ms" },
      { name: "Cumulative Layout Shift", value: "0.05", status: "good", threshold: "< 0.1" },
    ]
  },
  {
    category: "Link Integrity",
    icon: LinkIcon,
    checks: [
      { name: "Internal Links", value: "234 checked", status: "good", issues: "0 broken" },
      { name: "External Links", value: "89 checked", status: "warning", issues: "3 broken" },
      { name: "Image Sources", value: "156 checked", status: "good", issues: "0 missing" },
      { name: "API Endpoints", value: "42 checked", status: "good", issues: "0 failed" },
    ]
  },
  {
    category: "DOM & Layout",
    icon: Layout,
    checks: [
      { name: "DOM Size", value: "1,234 nodes", status: "good", threshold: "< 1,500 nodes" },
      { name: "DOM Depth", value: "12 levels", status: "good", threshold: "< 15 levels" },
      { name: "Layout Shifts", value: "2 detected", status: "warning", threshold: "Monitor closely" },
      { name: "Render Blocking", value: "3 resources", status: "needs-improvement", threshold: "Optimize" },
    ]
  },
  {
    category: "Script Execution",
    icon: Activity,
    checks: [
      { name: "JavaScript Errors", value: "0 errors", status: "good", issues: "No errors" },
      { name: "Console Warnings", value: "5 warnings", status: "warning", issues: "Review needed" },
      { name: "Failed Requests", value: "2 failed", status: "warning", issues: "API timeout" },
      { name: "Script Load Time", value: "890ms", status: "good", threshold: "< 1s" },
    ]
  }
];

interface MonitoringViewProps {
  websites: MonitoredWebsite[];
}

export function MonitoringView({ websites }: MonitoringViewProps) {
  const monitoredSites = websites
    .filter((site) => site.monitoring)
    .sort((a, b) => {
      const aId = Number(a.id);
      const bId = Number(b.id);
      const aNumeric = Number.isFinite(aId);
      const bNumeric = Number.isFinite(bId);

      // Newly added sites use timestamp-like numeric ids; show them first.
      if (aNumeric && bNumeric) return bId - aId;
      if (aNumeric) return -1;
      if (bNumeric) return 1;
      return b.lastChecked.localeCompare(a.lastChecked);
    });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Synthetic Monitoring</h2>
        <p className="text-sm text-gray-600">Browser-based checks and performance analysis</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Monitored Website Results</span>
            <Badge variant="outline">{monitoredSites.length} monitored</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monitoredSites.length === 0 ? (
            <p className="text-sm text-gray-600">
              Add a website in the Monitored Websites page and run checks to see results here.
            </p>
          ) : (
            <div className="space-y-4">
              {monitoredSites.map((site) => {
                const httpRow = site.httpResult?.results?.[0];
                const domRow = site.domResult?.results?.[0];
                const qaSummary = site.qaResult?.summary;
                const hasAnyResult =
                  Boolean(site.httpResult) ||
                  Boolean(site.domResult) ||
                  Boolean(site.qaResult) ||
                  Boolean(site.scanError);
                return (
                  <div key={site.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">{site.name}</p>
                        <p className="text-xs text-gray-500">{site.url}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            site.status === "operational"
                              ? "default"
                              : site.status === "degraded"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {site.status}
                        </Badge>
                        {site.scanLoading ? <Badge variant="outline">Running</Badge> : null}
                      </div>
                    </div>

                    {site.latest_runs ? (
                      <div className="mb-3 flex flex-wrap gap-2 text-xs">
                        {site.latest_runs.http_check_run_id ? (
                          <Badge variant="outline">HTTP Run: {site.latest_runs.http_check_run_id}</Badge>
                        ) : null}
                        {site.latest_runs.dom_monitor_run_id ? (
                          <Badge variant="outline">DOM Run: {site.latest_runs.dom_monitor_run_id}</Badge>
                        ) : null}
                        {site.latest_runs.site_qa_run_id ? (
                          <Badge variant="outline">QA Run: {site.latest_runs.site_qa_run_id}</Badge>
                        ) : null}
                      </div>
                    ) : null}

                    {site.scanError ? (
                      <div className="text-sm text-red-600">{site.scanError}</div>
                    ) : !hasAnyResult ? (
                      <div className="text-sm text-gray-600">
                        No check results yet for this website. Run checks in the Monitored Websites page.
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-3 text-sm">
                        <div className="rounded-md bg-gray-50 p-3">
                          <p className="text-gray-500 mb-1">HTTP / Browser</p>
                          <p>HTTP: {httpRow?.status_code ?? "N/A"}</p>
                          <p>Browser: {httpRow?.browser_status ?? "N/A"}</p>
                          <p>Latency: {httpRow?.latency_ms ?? "N/A"}ms</p>
                          <p>Issues: {httpRow?.issues?.length ?? 0}</p>
                          {(httpRow?.issues?.length ?? 0) > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {httpRow?.issues?.slice(0, 8).map((issue) => (
                                <Badge key={issue} variant="secondary">
                                  {issue}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                          {(httpRow?.request_failures?.length ?? 0) > 0 ? (
                            <div className="mt-2 text-xs text-gray-600">
                              Failed requests: {httpRow?.request_failures?.length}
                            </div>
                          ) : null}
                        </div>

                        <div className="rounded-md bg-gray-50 p-3">
                          <p className="text-gray-500 mb-1">DOM Monitor</p>
                          <p>Status: {domRow?.status ?? "N/A"}</p>
                          <p>
                            Change score:{" "}
                            {typeof domRow?.change_score === "number"
                              ? domRow.change_score.toFixed(3)
                              : "N/A"}
                          </p>
                          <p>Missing selectors: {domRow?.missing_selectors?.length ?? 0}</p>
                          <p>Issues: {domRow?.issues?.length ?? 0}</p>
                          {(domRow?.missing_selectors?.length ?? 0) > 0 ? (
                            <div className="mt-2 text-xs text-gray-600 break-all">
                              Missing: {domRow?.missing_selectors?.join(", ")}
                            </div>
                          ) : null}
                          {(domRow?.issues?.length ?? 0) > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {domRow?.issues?.slice(0, 8).map((issue) => (
                                <Badge key={issue} variant="secondary">
                                  {issue}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className="rounded-md bg-gray-50 p-3">
                          <p className="text-gray-500 mb-1">Site QA</p>
                          <p>Pages: {qaSummary?.pages_crawled ?? "N/A"}</p>
                          <p>Broken: {qaSummary?.broken_count ?? "N/A"}</p>
                          <p>HTML issues: {qaSummary?.html_issue_count ?? "N/A"}</p>
                          <p>Regression checks: {qaSummary?.regression_checks ?? "N/A"}</p>
                          {site.qaResult?.broken?.length ? (
                            <div className="mt-2 text-xs text-gray-600">
                              Top broken: {site.qaResult.broken.slice(0, 2).map((b) => b.status ?? "ERR").join(", ")}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {!site.scanError && hasAnyResult && (
                      <div className="grid gap-3 lg:grid-cols-3 mt-3">
                        <div className="rounded-md border p-3">
                          <p className="text-sm font-medium mb-2">HTTP API Details</p>
                          <div className="space-y-2 text-xs text-gray-700 max-h-44 overflow-auto">
                            {(httpRow?.console_errors ?? []).slice(0, 5).map((entry, idx) => (
                              <div key={`ce-${idx}`} className="border-b pb-2 last:border-0">
                                <div className="font-medium">Console Error</div>
                                <div className="break-all">{entry.text}</div>
                              </div>
                            ))}
                            {(httpRow?.page_errors ?? []).slice(0, 5).map((entry, idx) => (
                              <div key={`pe-${idx}`} className="border-b pb-2 last:border-0">
                                <div className="font-medium">Page Error</div>
                                <div className="break-all">{entry.message}</div>
                              </div>
                            ))}
                            {(httpRow?.request_failures ?? []).slice(0, 5).map((entry, idx) => (
                              <div key={`rf-${idx}`} className="border-b pb-2 last:border-0">
                                <div className="font-medium">{entry.method} {entry.resource_type}</div>
                                <div className="break-all">{entry.url}</div>
                                <div>{entry.failure}</div>
                              </div>
                            ))}
                            {!httpRow?.console_errors?.length &&
                            !httpRow?.page_errors?.length &&
                            !httpRow?.request_failures?.length ? (
                              <p className="text-gray-500">No detailed HTTP/browser issues.</p>
                            ) : null}
                          </div>
                        </div>

                        <div className="rounded-md border p-3">
                          <p className="text-sm font-medium mb-2">DOM Monitor Details</p>
                          <div className="space-y-2 text-xs text-gray-700 max-h-44 overflow-auto">
                            <div>
                              <span className="font-medium">Console error count:</span>{" "}
                              {domRow?.console_error_count ?? 0}
                            </div>
                            {domRow?.page_error ? (
                              <div className="border-b pb-2 last:border-0">
                                <div className="font-medium">Page Error</div>
                                <div className="break-all">{domRow.page_error}</div>
                              </div>
                            ) : null}
                            {(domRow?.missing_selectors ?? []).slice(0, 10).map((sel) => (
                              <div key={sel} className="border-b pb-2 last:border-0 break-all">
                                Missing selector: {sel}
                              </div>
                            ))}
                            {!(domRow?.page_error) && !(domRow?.missing_selectors?.length) ? (
                              <p className="text-gray-500">No DOM issues captured.</p>
                            ) : null}
                          </div>
                        </div>

                        <div className="rounded-md border p-3">
                          <p className="text-sm font-medium mb-2">Site QA Details</p>
                          <div className="space-y-2 text-xs text-gray-700 max-h-44 overflow-auto">
                            {(site.qaResult?.broken ?? []).slice(0, 5).map((item, idx) => (
                              <div key={`b-${idx}`} className="border-b pb-2 last:border-0">
                                <div className="font-medium">{item.type} {item.status ?? "ERR"}</div>
                                <div className="break-all">{item.url}</div>
                              </div>
                            ))}
                            {(site.qaResult?.html_issues ?? []).slice(0, 5).map((item, idx) => (
                              <div key={`h-${idx}`} className="border-b pb-2 last:border-0">
                                <div className="font-medium">{item.issue}</div>
                                <div className="break-all">{item.url}</div>
                              </div>
                            ))}
                            {(site.qaResult?.regression ?? []).slice(0, 3).map((item, idx) => (
                              <div key={`r-${idx}`} className="border-b pb-2 last:border-0">
                                <div className="font-medium">Regression: {item.browser_status ?? "N/A"}</div>
                                <div className="break-all">{item.url}</div>
                                <div>Missing selectors: {item.missing_selectors.length}</div>
                              </div>
                            ))}
                            {!(site.qaResult?.broken?.length) &&
                            !(site.qaResult?.html_issues?.length) &&
                            !(site.qaResult?.regression?.length) ? (
                              <p className="text-gray-500">No Site QA details captured.</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Checks</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="integrity">Integrity</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-6">
          {monitoringChecks.map((section, index) => {
            const Icon = section.icon;
            return (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-blue-600" />
                    {section.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {section.checks.map((check, checkIndex) => (
                      <div key={checkIndex} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-gray-900">{check.name}</p>
                            {check.status === "good" && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            {check.status === "warning" && (
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                            )}
                            {check.status === "needs-improvement" && (
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {check.threshold || check.issues}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{check.value}</p>
                          <Badge 
                            variant={
                              check.status === "good" ? "default" :
                              check.status === "warning" ? "secondary" :
                              "outline"
                            }
                            className="mt-1"
                          >
                            {check.status === "good" ? "Passed" :
                             check.status === "warning" ? "Warning" :
                             "Needs Work"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Performance Score</span>
                    <span className="text-2xl font-bold text-green-600">87/100</span>
                  </div>
                  <Progress value={87} className="h-3" />
                </div>
                
                {monitoringChecks[0].checks.map((check, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">{check.name}</span>
                      <span className="font-semibold">{check.value}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={check.status === "good" ? 85 : 65} 
                        className="h-2 flex-1" 
                      />
                      <Badge variant={check.status === "good" ? "default" : "secondary"}>
                        {check.status === "good" ? "Good" : "Fair"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-blue-600" />
                Link & Resource Integrity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monitoringChecks[1].checks.map((check, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-gray-900">{check.name}</p>
                      <p className="text-sm text-gray-600">{check.issues}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{check.value}</p>
                      <Badge variant={check.status === "good" ? "default" : "secondary"}>
                        {check.status === "good" ? "All Valid" : "Issues Found"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Script Execution & Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monitoringChecks[3].checks.map((check, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-gray-900">{check.name}</p>
                      <p className="text-sm text-gray-600">{check.issues || check.threshold}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{check.value}</p>
                      <Badge variant={
                        check.status === "good" ? "default" : "secondary"
                      }>
                        {check.status === "good" ? "Healthy" : "Review"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
