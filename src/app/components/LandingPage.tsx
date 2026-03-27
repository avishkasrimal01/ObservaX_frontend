import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Activity,
  BellRing,
  Brain,
  ChartNoAxesCombined,
  ShieldCheck,
  Timer,
  Workflow,
  Globe,
  Route,
  ScanLine,
} from "lucide-react";

type LandingPageProps = {
  onGetStarted: () => void;
};

const featureItems = [
  {
    title: "Browser Journey Monitoring",
    description: "Continuously test checkout, login, and critical user paths with synthetic browser flows.",
    icon: Route,
  },
  {
    title: "Global Probe Locations",
    description: "Run synthetic checks from multiple regions to detect geography-specific outages instantly.",
    icon: Globe,
  },
  {
    title: "Smart Incident Alerts",
    description: "Prioritize meaningful alerts with AI noise reduction and escalation-ready notifications.",
    icon: BellRing,
  },
  {
    title: "Synthetic Performance Analytics",
    description: "Compare latency trends, success rates, and uptime confidence across monitored workflows.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Continuous DOM & API Verification",
    description: "Detect broken UI states, response mismatches, and functional regressions before release impact.",
    icon: ScanLine,
  },
  {
    title: "AI Reliability Recommendations",
    description: "Receive proactive suggestions to tune intervals, thresholds, and recovery actions.",
    icon: Brain,
  },
];

const quickStats = [
  { label: "Synthetic Checks / Day", value: "1.2M+", icon: Activity },
  { label: "Incident Detection Time", value: "< 60 sec", icon: Timer },
  { label: "Escalation Readiness", value: "24/7", icon: Workflow },
];

const systemDemoVideo = {
  title: "ObservaX System Walkthrough",
  description: "See how synthetic checks, AI alerting, and reliability analytics work together in one operational flow.",
  url: "https://videos.pexels.com/video-files/3130284/3130284-hd_1920_1080_30fps.mp4",
  poster:
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=80",
};

const planOptions = [
  {
    name: "Starter",
    price: "$19",
    cycle: "/month",
    benefits: [
      "Up to 10 monitored websites",
      "HTTP checks + email alerts",
      "Basic dashboard analytics",
    ],
  },
  {
    name: "Pro Monitoring",
    price: "$49",
    cycle: "/month",
    benefits: [
      "Up to 50 monitored websites",
      "DOM monitor + Site QA",
      "AI insights + advanced analytics",
      "Priority support",
    ],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "$129",
    cycle: "/month",
    benefits: [
      "Unlimited monitored websites",
      "Custom escalation workflows",
      "Integration-ready alert channels",
      "Dedicated customer success",
    ],
  },
];

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div
      className="relative min-h-screen overflow-hidden bg-slate-950"
      style={{
        backgroundImage:
          "radial-gradient(circle at 15% 20%, rgba(6, 182, 212, 0.25), transparent 40%), radial-gradient(circle at 85% 10%, rgba(139, 92, 246, 0.2), transparent 35%), linear-gradient(rgba(6, 11, 25, 0.95), rgba(6, 11, 25, 0.95)), url('https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=2200&q=80')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-[10%] top-[14%] h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl"
          style={{ animation: "glowPulse 4.8s ease-in-out infinite" }}
        />
        <div
          className="absolute right-[12%] top-[20%] h-56 w-56 rounded-full bg-violet-400/20 blur-3xl"
          style={{ animation: "glowPulse 6s ease-in-out infinite" }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pb-12 pt-8">
        <header className="flex items-center justify-between rounded-xl ">
          <div className="flex items-center">
            <img
              src="https://res.cloudinary.com/dujfud9ha/image/upload/v1772124500/ObservaX_logo_2_sjv7ur.png"
              alt="ObservaX"
              className="h-22 w-auto [filter:drop-shadow(0_0_10px_rgba(255,255,255,0.7))_drop-shadow(0_0_30px_rgba(255,255,255,0.45))]"
            />
          </div>
          <Button variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10" onClick={onGetStarted}>
            Sign In
          </Button>
        </header>

        <section className="mt-10 grid items-center gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            <Badge className="w-fit bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30">Web Synthetic Monitoring</Badge>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Simulate Real User Journeys.
              <span className="block text-cyan-300">Catch failures before customers do.</span>
            </h1>
            <p className="max-w-xl text-base text-slate-200 sm:text-lg">
              ObservaX validates critical flows like login, checkout, and payments from global synthetic probes,
              then alerts your team with AI-prioritized incidents and actionable diagnostics.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button className="min-w-[190px] px-8 py-6 text-base font-semibold bg-cyan-500 text-white shadow-[0_0_30px_rgba(6,182,212,0.45)] hover:bg-cyan-600" onClick={onGetStarted}>
                Get Started
              </Button>
              
            </div>
            <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-300">
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1">Browser Checks</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1">API Assertions</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1">DOM Regression</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1">Global Probes</span>
            </div>
          </div>

          <Card className="relative overflow-hidden border-white/20 bg-white/90" style={{ animation: "floatY 6s ease-in-out infinite" }}>
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500" />
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-900">Synthetic Monitoring Control Center</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {quickStats.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-md bg-cyan-50">
                        <Icon className="h-4 w-4 text-cyan-600" />
                      </div>
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className="text-sm font-semibold text-gray-900">{item.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 rounded-lg border border-gray-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Journey Success Rate</span>
                  <span className="font-semibold text-gray-900">99.92%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div className="h-2 w-[94%] rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" style={{ animation: "shimmerSweep 3.5s ease-in-out infinite" }} />
                </div>
                <p className="text-xs text-gray-500">Live synthetic pass rate across all critical workflows</p>
              </div>

              <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" style={{ animation: "pulseDot 1.6s ease-in-out infinite" }} />
                    Checkout Flow · Colombo Probe
                  </span>
                  <span>142 ms</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" style={{ animation: "pulseDot 1.8s ease-in-out infinite" }} />
                    Login Journey · Singapore Probe
                  </span>
                  <span>167 ms</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500" style={{ animation: "pulseDot 2s ease-in-out infinite" }} />
                    Payment API · London Probe
                  </span>
                  <span>411 ms</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Advanced platform for synthetic reliability engineering</h2>
            <p className="mt-1 text-sm text-slate-300">Purpose-built capabilities to monitor, analyze, and resolve incidents with speed and confidence.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featureItems.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="group border-white/20 bg-white/90 transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                      <span className="rounded-md bg-cyan-50 p-1.5 transition-colors duration-300 group-hover:bg-cyan-100">
                        <Icon className="h-4.5 w-4.5 text-cyan-600" />
                      </span>
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-700">{feature.description}</CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-10">
          <Card className="relative overflow-hidden border-cyan-400/40 bg-gradient-to-r from-cyan-500/25 via-blue-500/25 to-violet-500/25">
            <div
              className="pointer-events-none absolute -left-16 top-0 h-full w-20 bg-white/20 blur-xl"
              style={{ animation: "sweepX 4.2s ease-in-out infinite" }}
            />
            <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-xl font-semibold text-white">Ready to modernize web synthetic monitoring?</h3>
                <p className="text-sm text-slate-200">Launch ObservaX now and detect hidden reliability risks before production users experience them.</p>
              </div>
              <Button className="min-w-[190px] px-8 py-6 text-base font-semibold bg-white text-slate-900 hover:bg-slate-100" onClick={onGetStarted}>
                Get Started
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="mt-10">
          <div className="overflow-hidden rounded-2xl border border-white/25 bg-white/5 p-4 backdrop-blur-md sm:p-5">
            <div className="mb-3">
              <Badge className="w-fit bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/25">Product Demo</Badge>
              <h3 className="mt-2 text-xl font-semibold text-white">{systemDemoVideo.title}</h3>
              <p className="text-sm text-slate-300">{systemDemoVideo.description}</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/20 bg-black">
              <video
                className="aspect-video w-full"
                autoPlay
                muted
                loop
                preload="metadata"
                playsInline
                poster={systemDemoVideo.poster}
              >
                <source src={systemDemoVideo.url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>

            <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
              <p className="rounded-md border border-white/20 bg-white/5 p-2">Live synthetic journey monitoring</p>
              <p className="rounded-md border border-white/20 bg-white/5 p-2">AI-prioritized incident detection</p>
              <p className="rounded-md border border-white/20 bg-white/5 p-2">Operational analytics dashboard</p>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="rounded-2xl border border-white/25 bg-white/5 p-4 backdrop-blur-md sm:p-5">
            <div className="mb-4">
              <Badge className="w-fit bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/25">Latest News</Badge>
              <h3 className="mt-2 text-2xl font-semibold text-white">What’s new in ObservaX</h3>
              <p className="text-sm text-slate-300">Recent updates from our synthetic monitoring platform.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "New Global Probe Region Added",
                  date: "Feb 2026",
                  detail: "Monitoring traffic is now available from an additional South Asia node for better latency visibility.",
                },
                {
                  title: "AI Incident Prioritization Improved",
                  date: "Feb 2026",
                  detail: "Updated alert scoring reduces low-impact noise and highlights customer-facing failures faster.",
                },
                {
                  title: "Synthetic Journey Debug Enhancements",
                  date: "Jan 2026",
                  detail: "Journey failures now include clearer step context, timing, and validation output summaries.",
                },
              ].map((item) => (
                <Card key={item.title} className="border-white/20 bg-white/90">
                  <CardHeader className="pb-2">
                    <p className="text-xs font-medium text-cyan-700">{item.date}</p>
                    <CardTitle className="text-base text-gray-900">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-700">{item.detail}</CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="rounded-2xl border border-white/25 bg-white/5 p-4 backdrop-blur-md sm:p-5">
            <div className="mb-4">
              <Badge className="w-fit bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/25">Choose Plan</Badge>
              <h3 className="mt-2 text-2xl font-semibold text-white">Flexible plans for every team</h3>
              <p className="text-sm text-slate-300">Pick the right plan and scale your synthetic monitoring confidently.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {planOptions.map((plan) => (
                <Card
                  key={plan.name}
                  className={`flex h-full flex-col border-white/20 bg-white/90 ${plan.featured ? "ring-2 ring-cyan-400/70" : ""}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base text-gray-900">{plan.name}</CardTitle>
                      {plan.featured ? <Badge>Popular</Badge> : null}
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {plan.price}
                      <span className="text-sm font-medium text-gray-500">{plan.cycle}</span>
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col space-y-3">
                    <ul className="flex-1 space-y-1 text-sm text-gray-700">
                      {plan.benefits.map((benefit) => (
                        <li key={benefit}>• {benefit}</li>
                      ))}
                    </ul>
                    <Button className="mt-auto w-full" onClick={onGetStarted}>
                      Get Started
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="overflow-hidden rounded-2xl border border-white/25 bg-white/5 p-3 backdrop-blur-md sm:p-4">
            <img
              src="https://res.cloudinary.com/dujfud9ha/image/upload/v1768732317/form_1_mv7g35.jpg"
              alt="ObservaX system preview"
              className="w-full rounded-xl object-cover"
              loading="lazy"
            />
          </div>
        </section>

        <footer className="mt-10 rounded-xl border border-white/20 bg-white/5 px-4 py-4 backdrop-blur-md">
          {/* <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">ObservaX</p>
              <p className="text-xs text-slate-300">Synthetic Monitoring & Observability Platform</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-cyan-500 text-white hover:bg-cyan-600"
                onClick={onGetStarted}
              >
                Get Started
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
                onClick={onGetStarted}
              >
                Sign In
              </Button>
            </div>
          </div> */}
          <div className="mt-3 border-t border-white/10 pt-3 text-xs text-slate-400">
            © {new Date().getFullYear()} ObservaX. All rights reserved.
          </div>
        </footer>
      </div>

      <style>{`
        @keyframes floatY {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        @keyframes glowPulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.08); }
        }

        @keyframes pulseDot {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.25); }
        }

        @keyframes shimmerSweep {
          0% { filter: brightness(1); }
          50% { filter: brightness(1.18); }
          100% { filter: brightness(1); }
        }

        @keyframes sweepX {
          0% { transform: translateX(0); opacity: 0; }
          25% { opacity: 0.55; }
          75% { opacity: 0.55; }
          100% { transform: translateX(1200px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
