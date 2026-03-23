import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CreditCard, CalendarClock, ReceiptText, ShieldCheck } from "lucide-react";
import {
  SUBSCRIPTION_PLANS,
  formatSubscriptionAmount,
  type CurrentSubscription,
  type SubscriptionRecord,
} from "../lib/subscriptionStore";

interface BillingViewProps {
  currentSubscription: CurrentSubscription | null;
  subscriptionHistory: SubscriptionRecord[];
  onChangePlanClick?: () => void;
}

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function BillingView({ currentSubscription, subscriptionHistory, onChangePlanClick }: BillingViewProps) {
  const selectedPlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === currentSubscription?.planId) ?? SUBSCRIPTION_PLANS[1];
  const activeSince = currentSubscription ? formatDateLabel(currentSubscription.activatedAtISO) : "Pending";

  const handleUpdatePaymentMethod = () => {
    const subject = encodeURIComponent("ObservaX Billing - Update Payment Method");
    const body = encodeURIComponent(
      "Hi Billing Team,%0D%0A%0D%0AI want to update my payment method for my ObservaX subscription.%0D%0A%0D%0AAccount email:%0D%0APlan:%0D%0A%0D%0AThanks."
    );
    window.location.href = `mailto:billing@observax.io?subject=${subject}&body=${body}`;
    toast.message("Opening billing request", {
      description: "Your email client is opening with a payment update request.",
    });
  };

  const handleDownloadAllInvoices = () => {
    if (subscriptionHistory.length === 0) {
      toast.message("No invoice history available yet.");
      return;
    }

    const fileName = `observax-invoices-${new Date().toISOString().slice(0, 10)}.txt`;
    const content = [
      "ObservaX Invoice Summary",
      `Generated: ${new Date().toLocaleString()}`,
      "",
      ...subscriptionHistory.map((invoice) => {
        const amount = formatSubscriptionAmount(invoice.amountCents, invoice.currency);
        return `${invoice.id} | ${invoice.planName} | ${amount} | ${invoice.status.toUpperCase()} | Card **** ${invoice.last4}`;
      }),
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);

    toast.success("Invoices downloaded", {
      description: `Saved as ${fileName}`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Billing</h2>
        <p className="text-sm text-gray-600">Manage your plan, payment method, and invoices</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-gray-900">{selectedPlan.name}</p>
            <p className="mt-1 text-sm text-gray-600">{selectedPlan.summary}</p>
            <Badge variant="secondary" className="mt-3">Active</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-5 w-5 text-indigo-600" />
              Next Billing Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-gray-900">
              {currentSubscription ? formatDateLabel(currentSubscription.nextBillingAtISO) : "Pending"}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Estimated charge: {formatSubscriptionAmount(selectedPlan.amountCents, selectedPlan.currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-emerald-700">{currentSubscription?.status ?? "active"}</p>
            <p className="mt-1 text-sm text-gray-600">No outstanding balance.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Plan</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{selectedPlan.name}</p>
            </div>
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Monthly Charge</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatSubscriptionAmount(selectedPlan.amountCents, selectedPlan.currency)}
              </p>
            </div>
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Active Since</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{activeSince}</p>
            </div>
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Payment Method</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                Card **** {currentSubscription?.last4 ?? "----"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Choose Your Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isSelected = selectedPlan.id === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`rounded-xl border p-4 transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/60 shadow"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold text-gray-900">{plan.name}</p>
                    {plan.featured ? <Badge>Popular</Badge> : null}
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {formatSubscriptionAmount(plan.amountCents, plan.currency)}
                    <span className="text-sm font-medium text-gray-500">/month</span>
                  </p>
                  <p className="mt-2 text-sm text-gray-600">{plan.summary}</p>

                  <ul className="mt-3 space-y-1 text-sm text-gray-700">
                    {plan.benefits.map((benefit) => (
                      <li key={benefit}>• {benefit}</li>
                    ))}
                  </ul>

                  <Button
                    className="mt-4 w-full"
                    variant={isSelected ? "secondary" : "default"}
                    onClick={() => {
                      if (isSelected) return;
                      onChangePlanClick?.();
                    }}
                    disabled={isSelected}
                  >
                    {isSelected ? "Current Plan" : "Choose Plan"}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="h-5 w-5 text-amber-600" />
            Recent Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {subscriptionHistory.length === 0 ? (
            <p className="text-sm text-gray-600">No subscription payment history yet.</p>
          ) : (
            subscriptionHistory.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-gray-900">{invoice.id}</p>
                  <p className="text-sm text-gray-600">
                    {invoice.planName} • {formatDateLabel(invoice.createdAtISO)} • Card **** {invoice.last4}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatSubscriptionAmount(invoice.amountCents, invoice.currency)}
                  </p>
                  <p className="text-xs text-gray-500">{invoice.status.toUpperCase()}</p>
                </div>
              </div>
            ))
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleUpdatePaymentMethod}>Update Payment Method</Button>
            <Button onClick={handleDownloadAllInvoices}>Download All Invoices</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
