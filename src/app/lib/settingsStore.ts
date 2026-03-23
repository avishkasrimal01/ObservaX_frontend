export interface ObserverSettings {
  general: {
    companyName: string;
    primaryEmail: string;
    autoResolveAlerts: boolean;
    maintenanceMode: boolean;
    publicStatusPage: boolean;
  };
  notifications: {
    channels: {
      email: boolean;
      slack: boolean;
      sms: boolean;
      pagerDuty: boolean;
    };
    severity: {
      critical: boolean;
      warning: boolean;
      info: boolean;
    };
  };
  ai: {
    learningRate: number;
    explorationRate: number;
    discountFactor: number;
    automaticOptimization: boolean;
    predictiveAlerting: boolean;
    nlpAnalysis: boolean;
    anomalyDetection: boolean;
  };
  integration: {
    dataRetentionDays: number;
    apiKey: string;
    webhookUrl: string;
  };
}

const SETTINGS_KEY = "observerx.settings.v1";

function randomApiKey() {
  const value = Math.random().toString(36).slice(2, 12);
  return `ox_${value}${Date.now().toString(36).slice(-4)}`;
}

export function defaultObserverSettings(primaryEmail = "admin@example.com"): ObserverSettings {
  return {
    general: {
      companyName: "Acme Corporation",
      primaryEmail,
      autoResolveAlerts: true,
      maintenanceMode: false,
      publicStatusPage: false,
    },
    notifications: {
      channels: {
        email: true,
        slack: true,
        sms: false,
        pagerDuty: false,
      },
      severity: {
        critical: true,
        warning: true,
        info: false,
      },
    },
    ai: {
      learningRate: 0.75,
      explorationRate: 0.35,
      discountFactor: 0.9,
      automaticOptimization: true,
      predictiveAlerting: true,
      nlpAnalysis: true,
      anomalyDetection: true,
    },
    integration: {
      dataRetentionDays: 90,
      apiKey: randomApiKey(),
      webhookUrl: "",
    },
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeSettings(input: Partial<ObserverSettings>, fallbackEmail = "admin@example.com"): ObserverSettings {
  const defaults = defaultObserverSettings(fallbackEmail);
  return {
    general: {
      companyName: input.general?.companyName || defaults.general.companyName,
      primaryEmail: input.general?.primaryEmail || defaults.general.primaryEmail,
      autoResolveAlerts: input.general?.autoResolveAlerts ?? defaults.general.autoResolveAlerts,
      maintenanceMode: input.general?.maintenanceMode ?? defaults.general.maintenanceMode,
      publicStatusPage: input.general?.publicStatusPage ?? defaults.general.publicStatusPage,
    },
    notifications: {
      channels: {
        email: input.notifications?.channels?.email ?? defaults.notifications.channels.email,
        slack: input.notifications?.channels?.slack ?? defaults.notifications.channels.slack,
        sms: input.notifications?.channels?.sms ?? defaults.notifications.channels.sms,
        pagerDuty: input.notifications?.channels?.pagerDuty ?? defaults.notifications.channels.pagerDuty,
      },
      severity: {
        critical: input.notifications?.severity?.critical ?? defaults.notifications.severity.critical,
        warning: input.notifications?.severity?.warning ?? defaults.notifications.severity.warning,
        info: input.notifications?.severity?.info ?? defaults.notifications.severity.info,
      },
    },
    ai: {
      learningRate: clamp(Number(input.ai?.learningRate ?? defaults.ai.learningRate), 0, 1),
      explorationRate: clamp(Number(input.ai?.explorationRate ?? defaults.ai.explorationRate), 0, 1),
      discountFactor: clamp(Number(input.ai?.discountFactor ?? defaults.ai.discountFactor), 0, 1),
      automaticOptimization: input.ai?.automaticOptimization ?? defaults.ai.automaticOptimization,
      predictiveAlerting: input.ai?.predictiveAlerting ?? defaults.ai.predictiveAlerting,
      nlpAnalysis: input.ai?.nlpAnalysis ?? defaults.ai.nlpAnalysis,
      anomalyDetection: input.ai?.anomalyDetection ?? defaults.ai.anomalyDetection,
    },
    integration: {
      dataRetentionDays: clamp(Number(input.integration?.dataRetentionDays ?? defaults.integration.dataRetentionDays), 1, 3650),
      apiKey: input.integration?.apiKey || defaults.integration.apiKey,
      webhookUrl: input.integration?.webhookUrl || defaults.integration.webhookUrl,
    },
  };
}

export function loadObserverSettings(primaryEmail = "admin@example.com"): ObserverSettings {
  if (typeof window === "undefined") return defaultObserverSettings(primaryEmail);
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultObserverSettings(primaryEmail);
    const parsed = JSON.parse(raw) as Partial<ObserverSettings>;
    return normalizeSettings(parsed, primaryEmail);
  } catch {
    return defaultObserverSettings(primaryEmail);
  }
}

export function saveObserverSettings(settings: ObserverSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore write errors to avoid breaking UX.
  }
}

export function generateObserverApiKey() {
  return randomApiKey();
}
