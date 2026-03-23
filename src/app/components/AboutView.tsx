import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Info, ShieldCheck, Brain, Activity, Workflow, BellRing, BarChart3, BookOpenCheck } from "lucide-react";

export function AboutView() {
  const usageSteps = [
    {
      title: "Create your monitoring list",
      description: "Go to Websites and add target URLs. Enable monitoring for each site you want to track.",
      image:
        "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Run checks and watch live health",
      description: "Open Monitoring to execute scans and view uptime, status, latency, and scan outputs in real time.",
      image:
        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Respond to alerts quickly",
      description: "Use Alerts to prioritize critical issues, resolve incidents, and keep your services stable.",
      image:
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Use AI and analytics to optimize",
      description: "Review AI Insights and Analytics to detect trends, reduce noise, and improve monitoring strategy.",
      image:
        "https://i.pinimg.com/736x/be/b8/d4/beb8d4fa952bdbf950c5d5f51bd6654b.jpg",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-in fade-in slide-in-from-top-2 duration-700 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">About ObservaX</h2>
          <p className="text-sm text-gray-600">
            AI-powered monitoring platform for website reliability, performance, and faster incident response.
          </p>
        </div>
        <div>
          <img
            src="https://res.cloudinary.com/dujfud9ha/image/upload/v1772124500/ObservaX_logo_2_sjv7ur.png"
            alt="ObservaX"
            className="h-14 w-auto"
          />
        </div>
      </div>

      <Card className="animate-in fade-in zoom-in-95 duration-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-indigo-600" />
            Platform Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>ObservaX helps teams monitor uptime, detect regressions, and respond to incidents with real-time checks and AI-assisted analysis.</p>
          <p>
            The system combines HTTP checks, DOM change monitoring, and site QA signals into one dashboard so operations teams can identify and fix issues quickly.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Web Monitoring</Badge>
            <Badge variant="secondary">AI Insights</Badge>
            <Badge variant="secondary">Alert Management</Badge>
            <Badge variant="secondary">Analytics</Badge>
            <Badge variant="secondary">Performance Tracking</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-700">
          <CardContent className="p-6">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Activity className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900">Continuous Monitoring</h3>
            <p className="mt-2 text-sm text-gray-600">Track uptime, latency, and service health across your monitored websites.</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:80ms]">
          <CardContent className="p-6">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Brain className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900">AI Assistance</h3>
            <p className="mt-2 text-sm text-gray-600">Use intelligent summaries and pattern detection to prioritize issues.</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:160ms]">
          <CardContent className="p-6">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900">Reliable Operations</h3>
            <p className="mt-2 text-sm text-gray-600">Centralized dashboards and workflows for incident response and reporting.</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:240ms]">
          <CardContent className="p-6">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Workflow className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900">Unified Workflow</h3>
            <p className="mt-2 text-sm text-gray-600">Move from detection to resolution using one connected monitoring workflow.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="animate-in fade-in zoom-in-95 duration-700 [animation-delay:120ms]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenCheck className="h-5 w-5 text-blue-600" />
            How to Use ObservaX (Step-by-Step)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {usageSteps.map((step, index) => (
            <div key={step.title} className="overflow-hidden rounded-xl border bg-white/80 transition-all duration-300 hover:shadow-md">
              <div className="grid gap-0 md:grid-cols-5">
                <div className="md:col-span-2">
                  <img
                    src={step.image}
                    alt={step.title}
                    className="h-44 w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
                <div className="p-4 md:col-span-3">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    Step {index + 1}
                  </div>
                  <h4 className="text-base font-semibold text-gray-900">{step.title}</h4>
                  <p className="mt-2 text-sm text-gray-600">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:180ms]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="h-5 w-5 text-rose-600" />
              Alert Handling Best Practice
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700">
            Review critical alerts first, then warning-level issues. Resolve or dismiss outdated alerts to keep your incident queue clean.
          </CardContent>
        </Card>

        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:260ms]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              Continuous Improvement Loop
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700">
            Use Analytics trends and AI Insights every week to tune thresholds, reduce false positives, and improve uptime confidence.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
