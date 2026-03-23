import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import {
  SUBSCRIPTION_PLANS,
  formatSubscriptionAmount,
  saveSuccessfulSubscription,
  type CurrentSubscription,
  type SubscriptionPlanId,
} from "../lib/subscriptionStore";

interface SubscriptionOnboardingViewProps {
  userUid: string;
  userEmail: string;
  onSubscriptionActivated: (payload: {
    currentSubscription: CurrentSubscription;
    planId: SubscriptionPlanId;
  }) => void;
}

export function SubscriptionOnboardingView({
  userUid,
  userEmail,
  onSubscriptionActivated,
}: SubscriptionOnboardingViewProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>("pro");
  const [nameOnCard, setNameOnCard] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedPlan = useMemo(
    () => SUBSCRIPTION_PLANS.find((plan) => plan.id === selectedPlanId) ?? SUBSCRIPTION_PLANS[1],
    [selectedPlanId],
  );

  const handlePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const digits = cardNumber.replace(/\D/g, "");
    const parsedMonth = Number(expMonth);
    const parsedYear = Number(expYear);

    if (!nameOnCard.trim()) {
      setError("Please enter the name on card.");
      return;
    }

    if (digits.length < 12) {
      setError("Please enter a valid card number.");
      return;
    }

    if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      setError("Enter a valid expiry month (1-12).");
      return;
    }

    if (!Number.isInteger(parsedYear) || parsedYear < new Date().getFullYear()) {
      setError("Enter a valid expiry year.");
      return;
    }

    if (!/^\d{3,4}$/.test(cvc)) {
      setError("Please enter a valid CVC.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulated checkout workflow. Replace with payment gateway tokenization in production.
      const result = await saveSuccessfulSubscription({
        uid: userUid,
        email: userEmail,
        planId: selectedPlanId,
        cardNumber: digits,
      });

      toast.success("Payment successful", {
        description: `You are now subscribed to ${selectedPlan.name}.`,
      });

      onSubscriptionActivated({
        currentSubscription: result.currentSubscription,
        planId: selectedPlanId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to complete payment. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen p-4 sm:p-8"
      style={{
        backgroundImage:
          "linear-gradient(rgba(248, 250, 252, 0.92), rgba(248, 250, 252, 0.92)), url('https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1800&q=80')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="mx-auto max-w-6xl space-y-6 rounded-2xl bg-gradient-to-br from-cyan-100/30 via-white/45 to-violet-100/30 p-4 sm:p-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-gray-900">Choose your monthly subscription</h2>
          <p className="mt-2 text-sm text-gray-600">
            Complete your plan payment to unlock full dashboard access for {userEmail}.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`rounded-xl border p-5 text-left transition ${
                  isSelected ? "border-blue-500 bg-blue-50/80 shadow" : "border-gray-200 bg-white/95 hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-lg font-semibold text-gray-900">{plan.name}</p>
                  {plan.featured ? <Badge>Popular</Badge> : null}
                </div>
                <p className="mt-3 text-2xl font-bold text-gray-900">{plan.priceLabel}</p>
                <p className="mt-2 text-sm text-gray-600">{plan.summary}</p>
                <ul className="mt-3 space-y-1 text-sm text-gray-700">
                  {plan.benefits.map((benefit) => (
                    <li key={benefit}>• {benefit}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>
              You will be charged {formatSubscriptionAmount(selectedPlan.amountCents, selectedPlan.currency)} monthly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handlePayment}>
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nameOnCard">Name on card</Label>
                  <Input
                    id="nameOnCard"
                    value={nameOnCard}
                    onChange={(e) => setNameOnCard(e.target.value)}
                    placeholder="Jane Doe"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card number</Label>
                  <Input
                    id="cardNumber"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4242 4242 4242 4242"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="expMonth">Expiry month</Label>
                  <Input
                    id="expMonth"
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value)}
                    placeholder="MM"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expYear">Expiry year</Label>
                  <Input
                    id="expYear"
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value)}
                    placeholder="YYYY"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    placeholder="123"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Processing payment..." : `Pay ${selectedPlan.priceLabel} and continue`}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
