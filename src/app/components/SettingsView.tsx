import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Settings, Bell, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import { toast } from "sonner";
import type { Dispatch, SetStateAction } from "react";
import type { ObserverSettings } from "../lib/settingsStore";

type SettingsState = {
  company: string;
  primaryEmail: string;
  autoResolveAlerts: boolean;
  maintenanceMode: boolean;
  publicStatusPage: boolean;
  emailNotifications: boolean;
  slackIntegration: boolean;
  smsAlerts: boolean;
  pagerDuty: boolean;
  criticalAlerts: boolean;
  warningAlerts: boolean;
  infoAlerts: boolean;
  learningRate: string;
  explorationRate: string;
  discountFactor: string;
  autoOptimization: boolean;
  predictiveAlerting: boolean;
  nlpAnalysis: boolean;
  anomalyDetection: boolean;
  dataRetention: string;
  apiKey: string;
  webhookUrl: string;
  datadogConnected: boolean;
  newRelicConnected: boolean;
  grafanaConnected: boolean;
};

const SETTINGS_STORAGE_KEY = "observerx.settings.v1";

const defaultSettings: SettingsState = {
  company: "Acme Corporation",
  primaryEmail: "admin@example.com",
  autoResolveAlerts: true,
  maintenanceMode: false,
  publicStatusPage: false,
  emailNotifications: true,
  slackIntegration: true,
  smsAlerts: false,
  pagerDuty: false,
  criticalAlerts: true,
  warningAlerts: true,
  infoAlerts: false,
  learningRate: "0.75",
  explorationRate: "0.35",
  discountFactor: "0.90",
  autoOptimization: true,
  predictiveAlerting: true,
  nlpAnalysis: true,
  anomalyDetection: true,
  dataRetention: "90 days",
  apiKey: "••••••••••••••••",
  webhookUrl: "",
  datadogConnected: false,
  newRelicConnected: false,
  grafanaConnected: false,
};

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    return { ...defaultSettings, ...parsed };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(next: SettingsState) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
}

interface SettingsViewProps {
  settings?: ObserverSettings;
  setSettings?: Dispatch<SetStateAction<ObserverSettings>>;
}

function observerToView(settings: ObserverSettings): SettingsState {
  return {
    company: settings.general.companyName,
    primaryEmail: settings.general.primaryEmail,
    autoResolveAlerts: settings.general.autoResolveAlerts,
    maintenanceMode: settings.general.maintenanceMode,
    publicStatusPage: settings.general.publicStatusPage,
    emailNotifications: settings.notifications.channels.email,
    slackIntegration: settings.notifications.channels.slack,
    smsAlerts: settings.notifications.channels.sms,
    pagerDuty: settings.notifications.channels.pagerDuty,
    criticalAlerts: settings.notifications.severity.critical,
    warningAlerts: settings.notifications.severity.warning,
    infoAlerts: settings.notifications.severity.info,
    learningRate: String(settings.ai.learningRate),
    explorationRate: String(settings.ai.explorationRate),
    discountFactor: String(settings.ai.discountFactor),
    autoOptimization: settings.ai.automaticOptimization,
    predictiveAlerting: settings.ai.predictiveAlerting,
    nlpAnalysis: settings.ai.nlpAnalysis,
    anomalyDetection: settings.ai.anomalyDetection,
    dataRetention: `${settings.integration.dataRetentionDays} days`,
    apiKey: settings.integration.apiKey,
    webhookUrl: settings.integration.webhookUrl,
    datadogConnected: false,
    newRelicConnected: false,
    grafanaConnected: false,
  };
}

function viewToObserver(settings: SettingsState, current?: ObserverSettings): ObserverSettings {
  const retentionDays = Number(settings.dataRetention.replace(/[^\d]/g, "")) || 90;
  return {
    general: {
      companyName: settings.company,
      primaryEmail: settings.primaryEmail,
      autoResolveAlerts: settings.autoResolveAlerts,
      maintenanceMode: settings.maintenanceMode,
      publicStatusPage: settings.publicStatusPage,
    },
    notifications: {
      channels: {
        email: settings.emailNotifications,
        slack: settings.slackIntegration,
        sms: settings.smsAlerts,
        pagerDuty: settings.pagerDuty,
      },
      severity: {
        critical: settings.criticalAlerts,
        warning: settings.warningAlerts,
        info: settings.infoAlerts,
      },
    },
    ai: {
      learningRate: Number(settings.learningRate) || current?.ai.learningRate || 0.75,
      explorationRate: Number(settings.explorationRate) || current?.ai.explorationRate || 0.35,
      discountFactor: Number(settings.discountFactor) || current?.ai.discountFactor || 0.9,
      automaticOptimization: settings.autoOptimization,
      predictiveAlerting: settings.predictiveAlerting,
      nlpAnalysis: settings.nlpAnalysis,
      anomalyDetection: settings.anomalyDetection,
    },
    integration: {
      dataRetentionDays: retentionDays,
      apiKey: settings.apiKey,
      webhookUrl: settings.webhookUrl,
    },
  };
}

export function SettingsView({ settings: externalSettings, setSettings: setExternalSettings }: SettingsViewProps) {
  const [settings, setSettings] = useState<SettingsState>(() =>
    externalSettings ? observerToView(externalSettings) : loadSettings()
  );

  useEffect(() => {
    if (externalSettings) {
      setSettings((prev) => ({ ...prev, ...observerToView(externalSettings) }));
    }
  }, [externalSettings]);

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const persist = (message: string) => {
    saveSettings(settings);
    if (setExternalSettings) {
      setExternalSettings(viewToObserver(settings, externalSettings));
    }
    toast.success(message);
  };

  const generateApiKey = () => {
    const randomPart = Math.random().toString(36).slice(2, 10);
    const next = `ox_${Date.now().toString(36)}_${randomPart}`;
    updateSetting("apiKey", next);
    toast.success("New API key generated");
  };

  const toggleIntegration = (service: "datadogConnected" | "newRelicConnected" | "grafanaConnected", label: string) => {
    const next = !settings[service];
    updateSetting(service, next);
    setTimeout(() => {
      const merged = { ...settings, [service]: next };
      saveSettings(merged);
      if (setExternalSettings) {
        setExternalSettings(viewToObserver(merged, externalSettings));
      }
    }, 0);
    toast.success(next ? `${label} connected` : `${label} disconnected`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-600">Configure your monitoring preferences</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="ai">AI Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input id="company" value={settings.company} onChange={(e) => updateSetting("company", e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Primary Email</Label>
                <Input id="email" type="email" value={settings.primaryEmail} onChange={(e) => updateSetting("primaryEmail", e.target.value)} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Auto-resolve Alerts</p>
                  <p className="text-sm text-gray-600">Automatically resolve alerts when issues are fixed</p>
                </div>
                <Switch checked={settings.autoResolveAlerts} onCheckedChange={(checked) => updateSetting("autoResolveAlerts", checked)} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Maintenance Mode</p>
                  <p className="text-sm text-gray-600">Pause monitoring during scheduled maintenance</p>
                </div>
                <Switch checked={settings.maintenanceMode} onCheckedChange={(checked) => updateSetting("maintenanceMode", checked)} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Public Status Page</p>
                  <p className="text-sm text-gray-600">Share system status with your users</p>
                </div>
                <Switch checked={settings.publicStatusPage} onCheckedChange={(checked) => updateSetting("publicStatusPage", checked)} />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={() => persist("General settings saved")}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Alert Channels</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive alerts via email</p>
                    </div>
                    <Switch checked={settings.emailNotifications} onCheckedChange={(checked) => updateSetting("emailNotifications", checked)} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Slack Integration</p>
                      <p className="text-sm text-gray-600">Post alerts to Slack channel</p>
                    </div>
                    <Switch checked={settings.slackIntegration} onCheckedChange={(checked) => updateSetting("slackIntegration", checked)} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">SMS Alerts</p>
                      <p className="text-sm text-gray-600">Critical alerts via SMS</p>
                    </div>
                    <Switch checked={settings.smsAlerts} onCheckedChange={(checked) => updateSetting("smsAlerts", checked)} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">PagerDuty</p>
                      <p className="text-sm text-gray-600">Integrate with PagerDuty incident management</p>
                    </div>
                    <Switch checked={settings.pagerDuty} onCheckedChange={(checked) => updateSetting("pagerDuty", checked)} />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium text-gray-900 mb-4">Alert Severity</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Critical Alerts</p>
                      <p className="text-sm text-gray-600">Immediate notification for critical issues</p>
                    </div>
                    <Switch checked={settings.criticalAlerts} onCheckedChange={(checked) => updateSetting("criticalAlerts", checked)} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Warning Alerts</p>
                      <p className="text-sm text-gray-600">Notifications for performance warnings</p>
                    </div>
                    <Switch checked={settings.warningAlerts} onCheckedChange={(checked) => updateSetting("warningAlerts", checked)} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Info Alerts</p>
                      <p className="text-sm text-gray-600">Informational updates and improvements</p>
                    </div>
                    <Switch checked={settings.infoAlerts} onCheckedChange={(checked) => updateSetting("infoAlerts", checked)} />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={() => persist("Notification preferences saved")}>Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-600" />
                AI & Machine Learning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Q-Learning Agent Settings</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="learning-rate">Learning Rate</Label>
                    <Input id="learning-rate" type="number" value={settings.learningRate} onChange={(e) => updateSetting("learningRate", e.target.value)} step="0.01" min="0" max="1" />
                    <p className="text-xs text-gray-500">Controls how quickly the agent adapts to new patterns</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exploration">Exploration Rate</Label>
                    <Input id="exploration" type="number" value={settings.explorationRate} onChange={(e) => updateSetting("explorationRate", e.target.value)} step="0.01" min="0" max="1" />
                    <p className="text-xs text-gray-500">Balance between exploring new strategies vs. exploiting known ones</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discount">Discount Factor</Label>
                    <Input id="discount" type="number" value={settings.discountFactor} onChange={(e) => updateSetting("discountFactor", e.target.value)} step="0.01" min="0" max="1" />
                    <p className="text-xs text-gray-500">Weight of future rewards vs. immediate rewards</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium text-gray-900 mb-4">AI Features</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Automatic Optimization</p>
                      <p className="text-sm text-gray-600">Let AI adjust monitoring frequency automatically</p>
                    </div>
                    <Switch checked={settings.autoOptimization} onCheckedChange={(checked) => updateSetting("autoOptimization", checked)} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Predictive Alerting</p>
                      <p className="text-sm text-gray-600">Use ML to predict potential failures</p>
                    </div>
                    <Switch checked={settings.predictiveAlerting} onCheckedChange={(checked) => updateSetting("predictiveAlerting", checked)} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">NLP Analysis</p>
                      <p className="text-sm text-gray-600">Analyze logs and generate insights</p>
                    </div>
                    <Switch checked={settings.nlpAnalysis} onCheckedChange={(checked) => updateSetting("nlpAnalysis", checked)} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Anomaly Detection</p>
                      <p className="text-sm text-gray-600">Detect unusual patterns automatically</p>
                    </div>
                    <Switch checked={settings.anomalyDetection} onCheckedChange={(checked) => updateSetting("anomalyDetection", checked)} />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={() => persist("AI settings updated")}>Update AI Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
