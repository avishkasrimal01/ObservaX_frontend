import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { HelpCircle, BookOpen, FileText, Video } from "lucide-react";

export function HelpView() {
  const sectionItems = {
    gettingStarted: [
      "Add your first website in under 2 minutes",
      "Choose HTTP, SSL, and DOM monitor types",
      "Understand dashboard health and scan summaries",
    ],
    troubleshooting: [
      "Fix timeout and DNS resolution issues",
      "Resolve repeated false-positive alert spikes",
      "Verify API keys and integration connection status",
    ],
    tutorials: [
      "Set scan intervals for low-noise monitoring",
      "Create alert rules and escalation steps",
      "Use trends to compare uptime week over week",
    ],
    faq: [
      "How often does ObserverX run scans?",
      "How to manage team access and permissions",
      "Where to update billing and notification settings",
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Help Center</h2>
        <p className="text-sm text-gray-600">Find guides and quick answers for common tasks</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p>Learn how to add websites, enable monitors, and read status summaries.</p>
            <Badge variant="secondary">Beginner</Badge>
            <ul className="space-y-1 pt-1 text-xs text-gray-600">
              {sectionItems.gettingStarted.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-blue-600" />
              Troubleshooting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p>Check common fixes for failed scans, connection errors, and alert noise.</p>
            <Badge variant="secondary">Most Viewed</Badge>
            <ul className="space-y-1 pt-1 text-xs text-gray-600">
              {sectionItems.troubleshooting.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="h-5 w-5 text-blue-600" />
              Tutorials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p>Step-by-step walkthroughs for monitoring setup and optimization workflows.</p>
            <Badge variant="secondary">Guided</Badge>
            <ul className="space-y-1 pt-1 text-xs text-gray-600">
              {sectionItems.tutorials.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              FAQ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p>Quick answers to account, billing, integrations, and notification settings.</p>
            <Badge variant="secondary">Updated</Badge>
            <ul className="space-y-1 pt-1 text-xs text-gray-600">
              {sectionItems.faq.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
