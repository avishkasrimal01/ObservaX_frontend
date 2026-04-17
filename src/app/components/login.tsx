import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Alert, AlertDescription } from "./ui/alert";
import { Eye, EyeOff } from "lucide-react";
import { createUserWithEmailAndPassword, GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseAuth, firebaseDb, isFirebaseConfigured } from "../lib/firebaseClient";
import { sendGoogleAuthNotification } from "../lib/observerxApi";

interface AuthPageProps {
  mode?: "login" | "signup";
  onSwitchMode?: (mode: "login" | "signup") => void;
  onBackToLanding?: () => void;
  onAuthSuccess?: (payload: { email: string; uid: string; isAdmin: boolean }) => void;
  themeMode: "light" | "dark";
  onThemeToggle: () => void;
}

function AuthPage({ mode = "login", onSwitchMode, onAuthSuccess }: AuthPageProps) {
  const isSignUp = mode === "signup";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleForgotPassword = async () => {
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Enter your email first to reset your password.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!isFirebaseConfigured()) {
      setError("Firebase is not configured. Add VITE_FIREBASE_* env variables.");
      return;
    }

    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim());
      setSuccess("Password reset email sent. Check your inbox.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send password reset email.";
      setError(message);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsGoogleLoading(false);
    setIsLoading(true);

    // Validate inputs
    if (!email || !password || (isSignUp && !fullName.trim())) {
      setError("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (isSignUp && !agreedToTerms) {
      setError("Please agree to the Terms & Privacy Policy");
      setIsLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setError("Firebase is not configured. Add VITE_FIREBASE_* env variables.");
      setIsLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        const isAdmin = false;
        if (fullName.trim()) {
          await updateProfile(cred.user, { displayName: fullName.trim() });
        }

        await setDoc(
          doc(firebaseDb, "users", cred.user.uid),
          {
            uid: cred.user.uid,
            email: cred.user.email,
            displayName: fullName.trim() || cred.user.email,
            provider: "password",
            role: isAdmin ? "admin" : "user",
            accessLevel: isAdmin ? "full" : "standard",
            accountStatus: "active",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
          },
          { merge: true },
        );

        localStorage.setItem("authToken", await cred.user.getIdToken());
        localStorage.setItem("userEmail", cred.user.email || email);
        localStorage.setItem("userUid", cred.user.uid);
        localStorage.setItem("userRole", isAdmin ? "admin" : "user");
        try {
          await sendGoogleAuthNotification({
            to_email: cred.user.email || email,
            event_type: "registration",
            provider: "Email/Password",
            website: "ObservaX",
            timestamp: new Date().toISOString(),
          });
        } catch (notifyErr) {
          // Best-effort notification: do not block sign-up flow if email service is unavailable.
          console.warn("Failed to send registration notification email", notifyErr);
        }
        setSuccess("Account created successfully. Signing you in...");
        onAuthSuccess?.({ email: cred.user.email || email, uid: cred.user.uid, isAdmin });
      } else {
        const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
        const userRef = doc(firebaseDb, "users", cred.user.uid);
        const existingUserDoc = await getDoc(userRef);
        const existingRole = existingUserDoc.exists() ? existingUserDoc.data()?.role : undefined;
        const accountStatus = existingUserDoc.exists() ? existingUserDoc.data()?.accountStatus : undefined;

        if (accountStatus === "deactivated" || accountStatus === "removed") {
          await signOut(firebaseAuth);
          setError("This account has been deactivated by the administrator.");
          return;
        }

        const isAdmin = String(existingRole || "user").toLowerCase() === "admin";
        await setDoc(
          userRef,
          {
            uid: cred.user.uid,
            email: cred.user.email,
            displayName: cred.user.displayName || cred.user.email,
            provider: "password",
            role: isAdmin ? "admin" : "user",
            accessLevel: isAdmin ? "full" : "standard",
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
          },
          { merge: true },
        );

        localStorage.setItem("authToken", await cred.user.getIdToken());
        localStorage.setItem("userEmail", cred.user.email || email);
        localStorage.setItem("userUid", cred.user.uid);
        localStorage.setItem("userRole", isAdmin ? "admin" : "user");
        setSuccess("Login successful");
        onAuthSuccess?.({ email: cred.user.email || email, uid: cred.user.uid, isAdmin });
      }

      // Fallback if parent isn't handling auth state.
      if (!onAuthSuccess) {
        window.location.reload();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");

    if (isSignUp && !agreedToTerms) {
      setError("Please agree to the Terms & Privacy Policy");
      return;
    }

    if (!isFirebaseConfigured()) {
      setError("Firebase is not configured. Add VITE_FIREBASE_* env variables.");
      return;
    }

    setIsGoogleLoading(true);
    setIsLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(firebaseAuth, provider);

      if (!cred.user.email) {
        throw new Error("Google account is missing an email address.");
      }

      const userRef = doc(firebaseDb, "users", cred.user.uid);
      const existingUserDoc = await getDoc(userRef);
      const existingRole = existingUserDoc.exists() ? existingUserDoc.data()?.role : undefined;
      const accountStatus = existingUserDoc.exists() ? existingUserDoc.data()?.accountStatus : undefined;

      if (accountStatus === "deactivated" || accountStatus === "removed") {
        await signOut(firebaseAuth);
        setError("This account has been deactivated by the administrator.");
        return;
      }

      const isAdmin = String(existingRole || "user").toLowerCase() === "admin";
      const userPayload: Record<string, unknown> = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || cred.user.email,
        provider: "google",
        role: isAdmin ? "admin" : "user",
        accessLevel: isAdmin ? "full" : "standard",
        accountStatus: "active",
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      };

      if (!existingUserDoc.exists()) {
        userPayload.createdAt = serverTimestamp();
      }

      await setDoc(userRef, userPayload, { merge: true });

      localStorage.setItem("authToken", await cred.user.getIdToken());
      localStorage.setItem("userEmail", cred.user.email);
      localStorage.setItem("userUid", cred.user.uid);
      localStorage.setItem("userRole", isAdmin ? "admin" : "user");

      try {
        await sendGoogleAuthNotification({
          to_email: cred.user.email,
          event_type: existingUserDoc.exists() ? "login" : "registration",
          provider: "Google",
          website: "ObservaX",
          timestamp: new Date().toISOString(),
        });
      } catch (notifyErr) {
        // Best-effort notification: do not block authentication flow if email service is unavailable.
        console.warn("Failed to send Google auth notification email", notifyErr);
      }

      setSuccess(existingUserDoc.exists() ? "Google sign-in successful" : "Account created successfully. Signing you in...");
      onAuthSuccess?.({ email: cred.user.email, uid: cred.user.uid, isAdmin });

      if (!onAuthSuccess) {
        window.location.reload();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-in failed. Please try again.";
      setError(message);
    } finally {
      setIsGoogleLoading(false);
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      style={{
        backgroundImage:
          "linear-gradient(rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.65)), url('https://res.cloudinary.com/dujfud9ha/image/upload/v1772124639/WF0s65CI53CU2PM_3YNbe_qgdunr.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-cyan-500/20 animate-pulse" />
      <Card className="relative z-10 w-full max-w-md bg-white/85 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-700">
          <CardHeader className="space-y-2">
          <div className="flex justify-center pb-2">
            <img
              src="https://res.cloudinary.com/dujfud9ha/image/upload/v1772124500/ObservaX_logo_2_sjv7ur.png"
              alt="ObservaX"
              className="h-20 w-auto animate-in fade-in duration-700"
            />
          </div>
          <CardTitle className="text-2xl">{isSignUp ? "Create Account" : "Welcome Back"}</CardTitle>
          <CardDescription>
            {isSignUp ? "Sign up to start monitoring websites" : "Sign in to your account to continue"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="pr-16"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 px-3 text-slate-600 hover:text-slate-900"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:underline"
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="pr-16"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 px-3 text-slate-600 hover:text-slate-900"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    disabled={isLoading}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
            )}

            {isSignUp && (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="termsAgreement"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  disabled={isLoading}
                />
                <Label htmlFor="termsAgreement" className="text-sm leading-5 text-gray-700">
                  I agree to the Terms & Privacy Policy
                </Label>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (isGoogleLoading ? "Please wait..." : isSignUp ? "Creating account..." : "Signing in...") : isSignUp ? "Sign Up" : "Sign In"}
            </Button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-300/80" />
              </div>
              <div className="relative flex justify-center text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                <span className="bg-white/85 px-2">OR</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3.1.8 3.8 1.4l2.6-2.5C16.9 3.5 14.7 2.6 12 2.6 6.9 2.6 2.8 6.8 2.8 12s4.1 9.4 9.2 9.4c5.3 0 8.8-3.7 8.8-8.9 0-.6-.1-1-.1-1.4H12z"
                />
                <path
                  fill="#34A853"
                  d="M2.8 7.4l3.2 2.3c.9-2 2.9-3.4 6-3.4 1.8 0 3.1.8 3.8 1.4l2.6-2.5C16.9 3.5 14.7 2.6 12 2.6c-3.6 0-6.8 2.1-8.2 4.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M12 21.4c2.6 0 4.8-.9 6.4-2.5l-3-2.5c-.8.6-1.9 1-3.4 1-3.1 0-5.1-2.1-6-3.4l-3.2 2.5c1.4 2.8 4.6 4.9 8.2 4.9z"
                />
                <path
                  fill="#4285F4"
                  d="M21 12.5c0-.6-.1-1-.1-1.4H12v3.9h5.4c-.3 1.5-1.2 2.5-2 3l3 2.5c1.8-1.7 2.6-4.1 2.6-8z"
                />
              </svg>
              {isGoogleLoading ? "Connecting Google..." : "Continue with Google"}
            </Button>

            <div className="text-center text-sm text-gray-600">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                className="text-blue-600 hover:underline"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setConfirmPassword("");
                  setShowPassword(false);
                  setShowConfirmPassword(false);
                  setAgreedToTerms(false);
                  onSwitchMode?.(isSignUp ? "login" : "signup");
                }}
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function LoginPage(props: Omit<AuthPageProps, "mode">) {
  return <AuthPage mode="login" {...props} />;
}

export function SignupPage(props: Omit<AuthPageProps, "mode">) {
  return <AuthPage mode="signup" {...props} />;
}
