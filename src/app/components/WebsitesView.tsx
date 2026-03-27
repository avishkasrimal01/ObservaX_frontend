import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Plus, Globe, ExternalLink, Settings, Trash2, Play, Pause, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  API_BASE_URL,
  deleteMonitoredWebsiteRecord,
  saveMonitoredWebsiteRecord,
  runWebsiteDomMonitor,
  runWebsiteHttpCheck,
  runWebsiteSiteQa,
  type DomMonitorApiResponse,
  type HttpCheckApiResponse,
  type SiteQaApiResponse,
} from "../lib/observerxApi";
import type { MonitoredWebsite as Website } from "../lib/monitoredWebsitesStore";

interface WebsitesViewProps {
  websites: Website[];
  setWebsites: Dispatch<SetStateAction<Website[]>>;
  alertEmail?: string | null;
}

export function WebsitesView({ websites, setWebsites, alertEmail = null }: WebsitesViewProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newWebsite, setNewWebsite] = useState({ name: "", url: "" });
  const [expandedWebsiteId, setExpandedWebsiteId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingWebsiteId, setEditingWebsiteId] = useState<string | null>(null);
  const [editWebsite, setEditWebsite] = useState({ name: "", url: "" });

  useEffect(() => {
    console.log("Websites route data:", websites);
  }, [websites]);

  const normalizeWebsiteUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(withScheme);
      return parsed.toString().replace(/\/$/, "");
    } catch {
      return "";
    }
  };

  const getDisplayResponseTime = (website: Website) => {
    const latency = website.httpResult?.results?.[0]?.latency_ms;
    if (typeof latency === "number") return `${latency}ms`;
    if (website.scanLoading) return "Running...";
    return "N/A";
  };

  const getDisplayUptime = (website: Website) => {
    if (!website.httpResult) return "N/A";
    const code = website.httpResult.results?.[0]?.status_code;
    if (code == null) return "0%";
    if (code >= 500) return "0%";
    if (code >= 400) return "99.0%";
    return "100%";
  };

  const runAllChecksForWebsite = async (websiteId: string, url: string) => {
    setWebsites((prev) =>
      prev.map((site) =>
        site.id === websiteId ? { ...site, scanLoading: true, scanError: null } : site
      )
    );

    const currentSite = websites.find((w) => w.id === websiteId);
    try {
      const [httpSettled, domSettled, qaSettled] = await Promise.allSettled([
        runWebsiteHttpCheck(url, alertEmail),
        runWebsiteDomMonitor(url, alertEmail),
        runWebsiteSiteQa(url, alertEmail),
      ]);

      const httpResult = httpSettled.status === "fulfilled" ? httpSettled.value : null;
      const domResult = domSettled.status === "fulfilled" ? domSettled.value : null;
      const qaResult = qaSettled.status === "fulfilled" ? qaSettled.value : null;
      const partialErrors = [
        httpSettled.status === "rejected" ? `HTTP check: ${String(httpSettled.reason)}` : null,
        domSettled.status === "rejected" ? `DOM monitor: ${String(domSettled.reason)}` : null,
        qaSettled.status === "rejected" ? `Site QA: ${String(qaSettled.reason)}` : null,
      ].filter(Boolean) as string[];

      if (!httpResult && !domResult && !qaResult) {
        throw new Error(partialErrors.join(" | ") || "All checks failed");
      }

      const httpRow = httpResult?.results?.[0];
      const httpStatus = httpRow?.status_code ?? null;
      const browserStatus = httpRow?.browser_status ?? null;
      const latencyMs = httpRow?.latency_ms ?? null;
      const reachableViaHttp = typeof httpStatus === "number" && httpStatus < 500;
      const reachableViaBrowser = typeof browserStatus === "number" && browserStatus < 500;
      const isReachable = reachableViaHttp || reachableViaBrowser;
      const isSlow = typeof latencyMs === "number" && latencyMs > 500;
      const hasClientError = typeof httpStatus === "number" && httpStatus >= 400 && httpStatus < 500;
      const nextStatus: Website["status"] = !isReachable
        ? "down"
        : (isSlow || hasClientError || partialErrors.length > 0)
          ? "degraded"
          : "operational";
      const nextUptime = !isReachable ? 0 : nextStatus === "degraded" ? 99 : 100;

      setWebsites((prev) =>
        prev.map((site) =>
          site.id === websiteId
            ? {
                ...site,
                status: nextStatus,
                uptime: nextUptime,
                responseTime: httpRow?.latency_ms ?? site.responseTime,
                lastChecked: "Just now",
                httpResult,
                domResult,
                qaResult,
                latest_runs: {
                  http_check_run_id: httpResult?.firestore_run_id ?? null,
                  dom_monitor_run_id: domResult?.firestore_run_id ?? null,
                  site_qa_run_id: qaResult?.firestore_run_id ?? null,
                },
                scanError: partialErrors.length ? partialErrors.join(" | ") : null,
                scanLoading: false,
              }
            : site
        )
      );
      const updatedWebsite = {
        id: websiteId,
        name: currentSite?.name ?? url,
        url,
        monitoring: true,
        status: nextStatus,
        uptime: nextUptime,
        responseTime: httpRow?.latency_ms ?? undefined,
        lastChecked: "Just now",
        scanError: null,
        latest_runs: {
          http_check_run_id: httpResult?.firestore_run_id ?? null,
          dom_monitor_run_id: domResult?.firestore_run_id ?? null,
          site_qa_run_id: qaResult?.firestore_run_id ?? null,
        },
      };
      try {
        await saveMonitoredWebsiteRecord(updatedWebsite);
      } catch (persistError) {
        const persistMessage =
          persistError instanceof Error ? persistError.message : "Failed to save website to Firestore";
        toast.error(`Saved scan locally, Firestore website save failed: ${persistMessage}`);
      }
      setExpandedWebsiteId(websiteId);
      if (partialErrors.length) {
        toast.error(`Website added with partial failures: ${partialErrors.length}`);
      } else {
        toast.success("Website added and checks completed");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to run checks";
      setWebsites((prev) =>
        prev.map((site) =>
          site.id === websiteId ? { ...site, scanLoading: false, scanError: message, latest_runs: {} } : site
        )
      );
      try {
        await saveMonitoredWebsiteRecord({
          id: websiteId,
          name: currentSite?.name ?? url,
          url,
          monitoring: true,
          status: "down",
          uptime: currentSite?.uptime ?? 100,
          responseTime: undefined,
          lastChecked: "Just now",
          scanError: message,
          latest_runs: {},
        });
      } catch {
        // Ignore Firestore save failure here; main error is already shown.
      }
      setExpandedWebsiteId(websiteId);
      toast.error(message);
    }
  };

  const handleAddWebsite = async () => {
    const normalizedUrl = normalizeWebsiteUrl(newWebsite.url);
    if (newWebsite.name && normalizedUrl) {
      const website: Website = {
        id: String(Date.now()),
        name: newWebsite.name,
        url: normalizedUrl,
        status: "down",
        uptime: 0,
        responseTime: 0,
        lastChecked: "Pending",
        monitoring: true,
        scanLoading: true,
        scanError: null,
        httpResult: null,
        domResult: null,
        qaResult: null,
      };
      setWebsites((prev) => [...prev, website]);
      const newId = website.id;
      setNewWebsite({ name: "", url: "" });
      setIsDialogOpen(false);
      setExpandedWebsiteId(newId);
      await runAllChecksForWebsite(newId, website.url);
    } else if (newWebsite.name || newWebsite.url) {
      toast.error("Enter a valid website URL (example: https://example.com)");
    }
  };

  const toggleMonitoring = (id: string) => {
    setWebsites(websites.map(site => 
      site.id === id ? { ...site, monitoring: !site.monitoring } : site
    ));
  };

  const deleteWebsite = async (id: string) => {
    const previousWebsites = websites;
    setWebsites((prev) => prev.filter((site) => site.id !== id));
    if (expandedWebsiteId === id) {
      setExpandedWebsiteId(null);
    }

    try {
      await deleteMonitoredWebsiteRecord(id);
      toast.success("Website deleted");
    } catch (error) {
      setWebsites(previousWebsites);
      const message = error instanceof Error ? error.message : "Failed to delete website";
      toast.error(message);
    }
  };

  const openEditWebsiteDialog = (website: Website) => {
    setEditingWebsiteId(website.id);
    setEditWebsite({ name: website.name, url: website.url });
    setIsEditDialogOpen(true);
  };

  const handleSaveWebsiteEdit = async () => {
    if (!editingWebsiteId) return;

    const normalizedUrl = normalizeWebsiteUrl(editWebsite.url);
    const normalizedName = editWebsite.name.trim();
    if (!normalizedName || !normalizedUrl) {
      toast.error("Enter a valid website name and URL");
      return;
    }

    const targetWebsite = websites.find((site) => site.id === editingWebsiteId);
    if (!targetWebsite) {
      toast.error("Website not found");
      return;
    }

    const urlChanged = targetWebsite.url !== normalizedUrl;
    const updatedWebsite: Website = {
      ...targetWebsite,
      name: normalizedName,
      url: normalizedUrl,
      ...(urlChanged
        ? {
            status: "down",
            uptime: 0,
            responseTime: 0,
            lastChecked: "Pending",
            scanError: null,
            httpResult: null,
            domResult: null,
            qaResult: null,
            latest_runs: {},
          }
        : {}),
    };

    setWebsites((prev) => prev.map((site) => (site.id === editingWebsiteId ? updatedWebsite : site)));

    try {
      await saveMonitoredWebsiteRecord({
        id: updatedWebsite.id,
        name: updatedWebsite.name,
        url: updatedWebsite.url,
        monitoring: updatedWebsite.monitoring,
        status: updatedWebsite.status,
        uptime: updatedWebsite.uptime,
        responseTime: updatedWebsite.responseTime ?? undefined,
        lastChecked: updatedWebsite.lastChecked,
        scanError: updatedWebsite.scanError ?? null,
        latest_runs: updatedWebsite.latest_runs,
      });

      setIsEditDialogOpen(false);
      setEditingWebsiteId(null);
      setEditWebsite({ name: "", url: "" });
      toast.success("Website details updated");

      if (urlChanged) {
        await runAllChecksForWebsite(updatedWebsite.id, updatedWebsite.url);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save website changes";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Monitored Websites</h2>
          <p className="text-sm text-gray-600">Manage and monitor your web applications</p>
          <p className="text-xs text-gray-500 mt-1">API base: {API_BASE_URL}</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Website
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Website</DialogTitle>
              <DialogDescription>
                Add a new website to monitor. AI agents will automatically optimize monitoring strategies.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Website Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g., Main Application"
                  value={newWebsite.name}
                  onChange={(e) => setNewWebsite({ ...newWebsite, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input 
                  id="url" 
                  placeholder="https://example.com"
                  value={newWebsite.url}
                  onChange={(e) => setNewWebsite({ ...newWebsite, url: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleAddWebsite()}>
                Add Website
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setEditingWebsiteId(null);
              setEditWebsite({ name: "", url: "" });
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Website</DialogTitle>
              <DialogDescription>
                Update the monitored site name or URL.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Website Name</Label>
                <Input
                  id="edit-name"
                  value={editWebsite.name}
                  onChange={(e) => setEditWebsite((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Main Application"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-url">URL</Label>
                <Input
                  id="edit-url"
                  value={editWebsite.url}
                  onChange={(e) => setEditWebsite((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleSaveWebsiteEdit()}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            Active Monitors ({websites.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Website</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>Last Checked</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
	              {websites.map((website) => (
	                <TableRow key={website.id}>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{website.name}</p>
                        <a 
                          href={website.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <p className="text-xs text-gray-500">{website.url}</p>
                    </div>
                  </TableCell>
		                  <TableCell>
		                    <Badge
                          variant={
                            website.status === "operational"
                              ? "default"
                              : website.status === "degraded"
                                ? "secondary"
                                : "destructive"
                          }
                        >
		                      {website.status === "operational"
                            ? "online"
                            : website.status === "degraded"
                              ? "degraded"
                              : "down"}
		                    </Badge>
                        {website.scanLoading && (
                          <span className="ml-2 text-xs text-blue-600">Running checks...</span>
                        )}
                  </TableCell>
                  <TableCell>
                    <span className={
                      getDisplayUptime(website) === "N/A"
                        ? "text-gray-500"
                        : website.uptime >= 99.5
                          ? "text-green-600"
                          : "text-red-600"
                    }>
                      {getDisplayUptime(website)}
                    </span>
                  </TableCell>
                  <TableCell>{getDisplayResponseTime(website)}</TableCell>
                  <TableCell className="text-sm text-gray-600">{website.lastChecked}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
	                      <Button 
	                        variant="ghost" 
	                        size="sm"
	                        onClick={() => toggleMonitoring(website.id)}
                      >
                        {website.monitoring ? 
                          <Pause className="h-4 w-4" /> : 
                          <Play className="h-4 w-4" />
                        }
                      </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditWebsiteDialog(website)}
                          title="Edit website"
                        >
	                        <Settings className="h-4 w-4" />
	                      </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void runAllChecksForWebsite(website.id, website.url)}
                          disabled={website.scanLoading}
                          title="Run checks now"
                        >
	                        <RefreshCcw className="h-4 w-4" />
	                      </Button>
	                      <Button 
	                        variant="ghost" 
	                        size="sm"
                          onClick={() => void deleteWebsite(website.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
	                  </TableCell>
	                </TableRow>
	              ))}
            </TableBody>
          </Table>
        </CardContent>
	      </Card>

        {expandedWebsiteId && (() => {
          const website = websites.find((site) => site.id === expandedWebsiteId);
          if (!website) return null;

          const httpRow = website.httpResult?.results?.[0];
          const domRow = website.domResult?.results?.[0];
          const qaBroken = website.qaResult?.broken ?? [];
          const qaHtmlIssues = website.qaResult?.html_issues ?? [];
          const qaReg = website.qaResult?.regression ?? [];

          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-4">
                  <span>Latest Scan Results: {website.name}</span>
                  <Button variant="outline" size="sm" onClick={() => setExpandedWebsiteId(null)}>
                    Hide
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {website.scanError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {website.scanError}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">HTTP / Browser Check</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p>Status: <span className="font-medium">{httpRow?.status_code ?? "N/A"}</span></p>
                      <p>Browser: <span className="font-medium">{httpRow?.browser_status ?? "N/A"}</span></p>
                      <p>Latency: <span className="font-medium">{httpRow?.latency_ms ?? "N/A"}ms</span></p>
                      <p>Issues: <span className="font-medium">{httpRow?.issues?.length ?? 0}</span></p>
                      {httpRow?.issues?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {httpRow.issues.slice(0, 6).map((issue) => (
                            <Badge key={issue} variant="secondary">{issue}</Badge>
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">DOM Monitor</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p>Status: <span className="font-medium">{domRow?.status ?? "N/A"}</span></p>
                      <p>Change score: <span className="font-medium">{domRow?.change_score?.toFixed?.(3) ?? "N/A"}</span></p>
                      <p>Missing selectors: <span className="font-medium">{domRow?.missing_selectors?.length ?? 0}</span></p>
                      <p>Issues: <span className="font-medium">{domRow?.issues?.length ?? 0}</span></p>
                      {domRow?.issues?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {domRow.issues.slice(0, 6).map((issue) => (
                            <Badge key={issue} variant="secondary">{issue}</Badge>
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Site QA Crawl</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p>Pages crawled: <span className="font-medium">{website.qaResult?.summary?.pages_crawled ?? "N/A"}</span></p>
                      <p>Broken items: <span className="font-medium">{website.qaResult?.summary?.broken_count ?? "N/A"}</span></p>
                      <p>HTML issues: <span className="font-medium">{website.qaResult?.summary?.html_issue_count ?? "N/A"}</span></p>
                      <p>Regression checks: <span className="font-medium">{website.qaResult?.summary?.regression_checks ?? "N/A"}</span></p>
                    </CardContent>
                  </Card>
                </div>

                {(qaBroken.length > 0 || qaHtmlIssues.length > 0 || qaReg.length > 0) && (
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <h4 className="font-medium mb-2">Broken Links/Resources</h4>
                      <div className="space-y-2 text-xs text-gray-700 max-h-48 overflow-auto">
                        {qaBroken.slice(0, 10).map((item, index) => (
                          <div key={`${item.url}-${index}`} className="border-b pb-2 last:border-0">
                            <div className="font-medium">{item.type} {item.status ?? "ERR"}</div>
                            <div className="break-all">{item.url}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border p-3">
                      <h4 className="font-medium mb-2">HTML Issues</h4>
                      <div className="space-y-2 text-xs text-gray-700 max-h-48 overflow-auto">
                        {qaHtmlIssues.slice(0, 10).map((item, index) => (
                          <div key={`${item.url}-${item.issue}-${index}`} className="border-b pb-2 last:border-0">
                            <div className="font-medium">{item.issue}</div>
                            <div className="break-all">{item.url}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border p-3">
                      <h4 className="font-medium mb-2">Regression Checks</h4>
                      <div className="space-y-2 text-xs text-gray-700 max-h-48 overflow-auto">
                        {qaReg.slice(0, 10).map((item, index) => (
                          <div key={`${item.url}-${index}`} className="border-b pb-2 last:border-0">
                            <div className="font-medium">{item.url}</div>
                            <div>Browser: {item.browser_status ?? "N/A"}</div>
                            <div>Missing selectors: {item.missing_selectors.length}</div>
                            <div>Console errors: {item.console_error_count}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}
	    </div>
	  );
	}
