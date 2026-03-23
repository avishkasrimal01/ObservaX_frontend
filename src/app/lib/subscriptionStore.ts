import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentData,
  Timestamp,
} from "firebase/firestore";
import { firebaseDb } from "./firebaseClient";

export type SubscriptionPlanId = "starter" | "pro" | "enterprise";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  priceLabel: string;
  amountCents: number;
  currency: string;
  interval: "month";
  summary: string;
  benefits: string[];
  featured?: boolean;
};

export type SubscriptionStatus = "active" | "past_due" | "canceled";

export type CurrentSubscription = {
  planId: SubscriptionPlanId;
  planName: string;
  amountCents: number;
  currency: string;
  interval: "month";
  status: SubscriptionStatus;
  activatedAtISO: string;
  nextBillingAtISO: string;
  paymentMethod: "card";
  last4: string;
};

export type SubscriptionRecord = {
  id: string;
  planId: SubscriptionPlanId;
  planName: string;
  amountCents: number;
  currency: string;
  interval: "month";
  status: "paid";
  paymentMethod: "card";
  last4: string;
  createdAtISO: string;
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Starter",
    priceLabel: "$19/mo",
    amountCents: 1900,
    currency: "USD",
    interval: "month",
    summary: "Best for small projects and basic uptime tracking.",
    benefits: [
      "Up to 10 monitored websites",
      "HTTP checks and basic alerts",
      "Daily email summary",
    ],
  },
  {
    id: "pro",
    name: "Pro Monitoring",
    priceLabel: "$49/mo",
    amountCents: 4900,
    currency: "USD",
    interval: "month",
    summary: "For growing teams that need AI insights and deeper monitoring.",
    benefits: [
      "Up to 50 monitored websites",
      "DOM monitor + Site QA checks",
      "AI insights and analytics",
      "Priority support",
    ],
    featured: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceLabel: "$129/mo",
    amountCents: 12900,
    currency: "USD",
    interval: "month",
    summary: "For advanced operations with multi-team governance and scale.",
    benefits: [
      "Unlimited monitored websites",
      "Custom escalation workflows",
      "Advanced integrations",
      "Dedicated success support",
    ],
  },
];

function toISO(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

function toCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountCents / 100);
}

function addOneMonthISO(date: Date) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

function parseCurrentSubscription(data: DocumentData | undefined): CurrentSubscription | null {
  if (!data?.subscription || typeof data.subscription !== "object") {
    return null;
  }

  const sub = data.subscription as Record<string, unknown>;
  if (!sub.planId || !sub.planName || !sub.activatedAtISO || !sub.nextBillingAtISO) {
    return null;
  }

  return {
    planId: sub.planId as SubscriptionPlanId,
    planName: String(sub.planName),
    amountCents: Number(sub.amountCents ?? 0),
    currency: String(sub.currency ?? "USD"),
    interval: "month",
    status: (sub.status as SubscriptionStatus) ?? "active",
    activatedAtISO: String(sub.activatedAtISO),
    nextBillingAtISO: String(sub.nextBillingAtISO),
    paymentMethod: "card",
    last4: String(sub.last4 ?? "0000"),
  };
}

function parseHistoryRecord(id: string, data: DocumentData): SubscriptionRecord | null {
  const createdAtISO = toISO(data.createdAt) ?? toISO(data.createdAtISO);
  if (!data.planId || !data.planName || !createdAtISO) {
    return null;
  }

  return {
    id,
    planId: data.planId as SubscriptionPlanId,
    planName: String(data.planName),
    amountCents: Number(data.amountCents ?? 0),
    currency: String(data.currency ?? "USD"),
    interval: "month",
    status: "paid",
    paymentMethod: "card",
    last4: String(data.last4 ?? "0000"),
    createdAtISO,
  };
}

export function formatSubscriptionAmount(amountCents: number, currency: string) {
  return toCurrency(amountCents, currency);
}

export async function loadSubscriptionSnapshot(uid: string): Promise<{
  currentSubscription: CurrentSubscription | null;
  history: SubscriptionRecord[];
}> {
  const userRef = doc(firebaseDb, "users", uid);
  const [userSnap, historySnap] = await Promise.all([
    getDoc(userRef),
    getDocs(collection(firebaseDb, "users", uid, "subscriptionHistory")),
  ]);

  const currentSubscription = parseCurrentSubscription(userSnap.data());
  const history = historySnap.docs
    .map((entry) => parseHistoryRecord(entry.id, entry.data()))
    .filter((entry): entry is SubscriptionRecord => Boolean(entry))
    .sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1));

  return { currentSubscription, history };
}

export async function saveSuccessfulSubscription(payload: {
  uid: string;
  email: string;
  planId: SubscriptionPlanId;
  cardNumber: string;
}): Promise<{
  currentSubscription: CurrentSubscription;
  record: SubscriptionRecord;
}> {
  const selectedPlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === payload.planId);
  if (!selectedPlan) {
    throw new Error("Invalid subscription plan selected.");
  }

  const now = new Date();
  const last4 = payload.cardNumber.replace(/\D/g, "").slice(-4) || "0000";

  const currentSubscription: CurrentSubscription = {
    planId: selectedPlan.id,
    planName: selectedPlan.name,
    amountCents: selectedPlan.amountCents,
    currency: selectedPlan.currency,
    interval: "month",
    status: "active",
    activatedAtISO: now.toISOString(),
    nextBillingAtISO: addOneMonthISO(now),
    paymentMethod: "card",
    last4,
  };

  const historyRef = doc(collection(firebaseDb, "users", payload.uid, "subscriptionHistory"));

  const record: SubscriptionRecord = {
    id: historyRef.id,
    planId: selectedPlan.id,
    planName: selectedPlan.name,
    amountCents: selectedPlan.amountCents,
    currency: selectedPlan.currency,
    interval: "month",
    status: "paid",
    paymentMethod: "card",
    last4,
    createdAtISO: now.toISOString(),
  };

  const userRef = doc(firebaseDb, "users", payload.uid);
  const batch = writeBatch(firebaseDb);

  batch.set(
    userRef,
    {
      uid: payload.uid,
      email: payload.email,
      subscription: {
        ...currentSubscription,
        updatedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  batch.set(historyRef, {
    ...record,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
  return { currentSubscription, record };
}
