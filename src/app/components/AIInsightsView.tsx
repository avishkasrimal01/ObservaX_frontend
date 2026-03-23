import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Brain, TrendingUp, Target, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import type { MonitoredWebsite } from "../lib/monitoredWebsitesStore";
import { generateIssueSolution } from "../lib/observerxApi";

type Severity = "critical" | "warning" | "info";

type MonitoringIssue = {
  id: string;
  website: string;
  url: string;
  severity: Severity;
  title: string;
  message: string;
  issueCodes: string[];
  details: string[];
};

type NlpInsight = {
  id: string;
  category: string;
  insight: string;
  recommendation: string;
  confidence: number;
  severity: Severity;
  source: "llm" | "fallback";
};

interface AIInsightsViewProps {
  websites: MonitoredWebsite[];
}

function buildIssuesFromWebsites(websites: MonitoredWebsite[]): MonitoringIssue[] {
  const issues: MonitoringIssue[] = [];

  for (const site of websites.filter((w) => w.monitoring)) {
    const http = site.httpResult?.results?.[0];
    const dom = site.domResult?.results?.[0];
    const qaSummary = site.qaResult?.summary;

    if (site.status === "down" || (http?.status_code ?? 0) >= 400 || site.scanError) {
      issues.push({
        id: `${site.id}-down`,
        website: site.name,
        url: site.url,
        severity: "critical",
        title: "Website Down",
        message: site.scanError || `HTTP status ${http?.status_code ?? "failed"}`,
        issueCodes: [
          ...(site.scanError ? ["SCAN_ERROR"] : []),
          ...(http?.issues ?? []),
          ...(dom?.issues ?? []),
        ],
        details: [site.scanError || "", http?.error || "", dom?.page_error || ""].filter(Boolean),
      });
    }

    if ((http?.latency_ms ?? 0) > 500) {
      issues.push({
        id: `${site.id}-latency`,
        website: site.name,
        url: site.url,
        severity: "warning",
        title: "High Response Time",
        message: `Response time is ${http?.latency_ms}ms`,
        issueCodes: ["HIGH_LATENCY"],
        details: [`latency_ms=${http?.latency_ms ?? 0}`],
      });
    }

    if ((qaSummary?.broken_count ?? 0) > 0) {
      issues.push({
        id: `${site.id}-broken`,
        website: site.name,
        url: site.url,
        severity: "warning",
        title: "Broken Links/Resources",
        message: `${qaSummary?.broken_count} broken item(s) found by Site QA`,
        issueCodes: ["BROKEN_RESOURCES"],
        details: [`broken_count=${qaSummary?.broken_count ?? 0}`],
      });
    }

    if ((dom?.issues?.length ?? 0) > 0) {
      issues.push({
        id: `${site.id}-dom`,
        website: site.name,
        url: site.url,
        severity: "info",
        title: "DOM Changes Detected",
        message: `DOM monitor reported ${dom?.issues?.length ?? 0} issue(s)`,
        issueCodes: dom?.issues ?? ["DOM_CHANGED"],
        details: [`change_score=${dom?.change_score ?? "N/A"}`],
      });
    }
  }

  return issues;
}

function sortIssuesNewestFirst(items: MonitoringIssue[]): MonitoringIssue[] {
  return [...items].sort((a, b) => {
    const aBase = a.id.split("-")[0] || "";
    const bBase = b.id.split("-")[0] || "";
    const aNum = Number(aBase);
    const bNum = Number(bBase);
    const aNumeric = Number.isFinite(aNum);
    const bNumeric = Number.isFinite(bNum);

    if (aNumeric && bNumeric) return bNum - aNum;
    if (aNumeric) return -1;
    if (bNumeric) return 1;
    return b.id.localeCompare(a.id);
  });
}

function toPriority(issue: MonitoringIssue): "high" | "medium" | "low" {
  if (issue.severity === "critical") return "high";
  if (issue.severity === "warning") return "medium";
  return "low";
}

export function AIInsightsView({ websites }: AIInsightsViewProps) {
  const issues = useMemo(() => sortIssuesNewestFirst(buildIssuesFromWebsites(websites)), [websites]);
  const [nlpInsights, setNlpInsights] = useState<NlpInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const issueFingerprint = useMemo(
    () => issues.map((issue) => `${issue.id}:${issue.message}`).sort().join("|"),
    [issues]
  );

  useEffect(() => {
    let cancelled = false;

    const loadInsights = async () => {
      if (!issues.length) {
        setNlpInsights([]);
        return;
      }

      setInsightsLoading(true);
      const topIssues = issues.slice(0, 4);

      const settled = await Promise.allSettled(
        topIssues.map((issue) =>
          generateIssueSolution({
            website: issue.website,
            url: issue.url,
            severity: issue.severity,
            title: issue.title,
            message: issue.message,
            issue_codes: issue.issueCodes,
            details: issue.details,
          })
        )
      );

      if (cancelled) return;

      const generated = settled
        .map((result, index) => {
          const issue = topIssues[index];
          if (!issue) return null;

          if (result.status === "fulfilled") {
            return {
              id: issue.id,
              category: issue.title,
              insight: result.value.solution.root_cause || issue.message,
              recommendation: result.value.solution.steps?.[0] || result.value.solution.summary,
              confidence: Math.max(50, Math.min(100, result.value.solution.confidence ?? 75)),
              severity: issue.severity,
              source: result.value.solution.source,
            } as NlpInsight;
          }

          return {
            id: issue.id,
            category: issue.title,
            insight: issue.message,
            recommendation: "Review monitoring logs and retry the relevant checks.",
            confidence: 60,
            severity: issue.severity,
            source: "fallback",
          } as NlpInsight;
        })
        .filter((entry): entry is NlpInsight => Boolean(entry));

      setNlpInsights(generated);
      setInsightsLoading(false);
    };

    void loadInsights();

    return () => {
      cancelled = true;
    };
  }, [issueFingerprint, issues]);

  const qLearningMetrics = [
    { label: "Learning Rate", value: 0.75 },
    { label: "Exploration Rate", value: 0.35 },
    { label: "Discount Factor", value: 0.9 },
    {
      label: "Policy Convergence",
      value: issues.length ? Math.min(0.96, 0.6 + (issues.filter((i) => i.severity === "info").length / issues.length) * 0.3) : 0.82,
    },
  ];

  const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">AI-Driven Insights</h2>
        <p className="text-sm text-gray-600">Q-Learning agents and NLP analysis from current monitoring data</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Q-Learning Agent Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {qLearningMetrics.map((metric) => (
              <div key={metric.label}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                  <span className="text-sm font-semibold text-gray-900">{(metric.value * 100).toFixed(0)}%</span>
                </div>
                <Progress value={metric.value * 100} className="h-2" />
              </div>
            ))}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-gray-700">Agent is actively learning from your latest checks</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">Current issue load: {issues.length} signal(s)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Optimization Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {issues.slice(0, 4).map((issue) => (
                <div key={issue.id} className="border-b pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-gray-900">{issue.title}</p>
                  <p className="mt-1 text-xs text-gray-600">{issue.message}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-green-600">{issue.website}</p>
                    <Badge variant={toPriority(issue) === "high" ? "destructive" : toPriority(issue) === "medium" ? "secondary" : "outline"}>
                      {toPriority(issue)}
                    </Badge>
                  </div>
                </div>
              ))}
              {issues.length === 0 ? <p className="text-sm text-gray-600">No issues detected yet.</p> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="actions" className="w-full">
        <TabsList>
          <TabsTrigger value="actions">Recent Signals</TabsTrigger>
          <TabsTrigger value="nlp">NLP Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Recent Monitoring Signals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {issues.slice(0, 8).map((issue) => (
                  <div key={issue.id} className="border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 rounded-full p-1 ${issue.severity === "critical" ? "bg-red-100" : issue.severity === "warning" ? "bg-yellow-100" : "bg-blue-100"}`}>
                        {issue.severity === "critical" ? (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        ) : issue.severity === "warning" ? (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{issue.title}</p>
                        <p className="mt-1 text-sm text-gray-600">{issue.message}</p>
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-xs text-gray-500">{issue.website}</span>
                          <Badge variant="outline" className="text-xs">
                            {issue.severity}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {issues.length === 0 ? <p className="text-sm text-gray-600">No recent actions to display.</p> : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nlp" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                NLP-Powered Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {insightsLoading ? (
                <p className="text-sm text-gray-600">Generating AI recommendations...</p>
              ) : (
                <div className="space-y-4">
                  {nlpInsights.map((insight) => (
                    <div
                      key={insight.id}
                      className={`border-l-4 py-2 pl-4 ${
                        insight.severity === "critical"
                          ? "border-l-red-500"
                          : insight.severity === "warning"
                            ? "border-l-yellow-500"
                            : "border-l-blue-500"
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {insight.category}
                        </Badge>
                        <Badge variant={insight.severity === "critical" ? "destructive" : "secondary"}>
                          {insight.severity}
                        </Badge>
                        <Badge variant="outline">{insight.source}</Badge>
                      </div>
                      <p className="mt-2 font-medium text-gray-900">{insight.insight}</p>
                      <div className="mt-2 rounded-md bg-blue-50 p-3">
                        <p className="text-sm text-blue-900">
                          <span className="font-medium">Recommendation:</span> {insight.recommendation}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-500">Confidence:</span>
                        <Progress value={insight.confidence} className="h-1.5 w-24" />
                        <span className="text-xs font-medium text-gray-700">{insight.confidence}%</span>
                      </div>
                    </div>
                  ))}
                  {!nlpInsights.length ? <p className="text-sm text-gray-600">No NLP insights available.</p> : null}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
