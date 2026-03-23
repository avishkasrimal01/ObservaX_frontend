import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Alert, AlertDescription } from "./ui/alert";
import { User, Shield, Bell, Clock, KeyRound, Mail, Smartphone } from "lucide-react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseAuth, firebaseDb } from "../lib/firebaseClient";
import { sendEmailAlertNotification } from "../lib/observerxApi";

interface ProfileViewProps {
  userEmail?: string | null;
  onUserEmailChange?: (email: string) => void;
  onUserAvatarChange?: (avatarUrl: string) => void;
}

function getInitials(email?: string | null) {
  if (!email) return "U";
  const base = email.split("@")[0] ?? "U";
  return base.slice(0, 2).toUpperCase();
}

const PROFILE_NOTIFICATION_STORAGE_KEY = "observax.profile.notifications.v1";
const PROFILE_AVATAR_STORAGE_KEY = "userAvatarUrl";
const PROFILE_EMAIL_STORAGE_KEY = "userEmail";

function loadNotificationPreferences() {
  try {
    const raw = localStorage.getItem(PROFILE_NOTIFICATION_STORAGE_KEY);
    if (!raw) {
      return { emailAlerts: true, smsCriticalAlerts: false };
    }
    const parsed = JSON.parse(raw) as Partial<{ emailAlerts: boolean; smsCriticalAlerts: boolean }>;
    return {
      emailAlerts: typeof parsed.emailAlerts === "boolean" ? parsed.emailAlerts : true,
      smsCriticalAlerts: typeof parsed.smsCriticalAlerts === "boolean" ? parsed.smsCriticalAlerts : false,
    };
  } catch {
    return { emailAlerts: true, smsCriticalAlerts: false };
  }
}

export function ProfileView({ userEmail, onUserEmailChange, onUserAvatarChange }: ProfileViewProps) {
  const currentUser = firebaseAuth.currentUser;
  const storedAvatar = localStorage.getItem(PROFILE_AVATAR_STORAGE_KEY) || "";
  const initialEmail = userEmail || currentUser?.email || "user@example.com";
  const initialNameParts = useMemo(() => {
    const displayName = currentUser?.displayName?.trim();
    if (!displayName) return { firstName: "ObservaX", lastName: "User" };
    const parts = displayName.split(/\s+/);
    return {
      firstName: parts[0] || "ObservaX",
      lastName: parts.slice(1).join(" ") || "User",
    };
  }, [currentUser?.displayName]);

  const [firstName, setFirstName] = useState(initialNameParts.firstName);
  const [lastName, setLastName] = useState(initialNameParts.lastName);
  const [email, setEmail] = useState(initialEmail);
  // Prefer locally saved avatar first so uploaded images persist even if Firebase photoURL is empty/stale.
  const [avatarUrl, setAvatarUrl] = useState(storedAvatar || currentUser?.photoURL || "");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityStatusMessage, setSecurityStatusMessage] = useState("");
  const [securityErrorMessage, setSecurityErrorMessage] = useState("");
  const [isUpdatingSecurity, setIsUpdatingSecurity] = useState(false);
  const [notificationStatusMessage, setNotificationStatusMessage] = useState("");
  const [notificationErrorMessage, setNotificationErrorMessage] = useState("");
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const initialNotifications = useMemo(() => loadNotificationPreferences(), []);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(initialNotifications.emailAlerts);
  const [smsCriticalEnabled, setSmsCriticalEnabled] = useState(initialNotifications.smsCriticalAlerts);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    const latestStoredAvatar = localStorage.getItem(PROFILE_AVATAR_STORAGE_KEY) || "";
    if (latestStoredAvatar && latestStoredAvatar !== avatarUrl) {
      setAvatarUrl(latestStoredAvatar);
      return;
    }
    if (!latestStoredAvatar && currentUser?.photoURL && currentUser.photoURL !== avatarUrl) {
      setAvatarUrl(currentUser.photoURL);
    }
  }, [currentUser?.photoURL, avatarUrl]);

  const displayName = `${firstName} ${lastName}`.trim();

  const persistProfileLocally = (nextEmail: string, nextAvatarUrl: string) => {
    try {
      localStorage.setItem(PROFILE_EMAIL_STORAGE_KEY, nextEmail.trim());
      localStorage.setItem(PROFILE_AVATAR_STORAGE_KEY, nextAvatarUrl.trim());
      return true;
    } catch {
      return false;
    }
  };

  const handleSaveProfile = async () => {
    setErrorMessage("");
    setStatusMessage("");

    if (!firstName.trim()) {
      setErrorMessage("First name is required.");
      return;
    }

    if (!email.trim()) {
      setErrorMessage("Email is required.");
      return;
    }

    setIsSaving(true);
    const normalizedEmail = email.trim();
    const normalizedAvatar = avatarUrl.trim();
    const localSaved = persistProfileLocally(normalizedEmail, normalizedAvatar);
    onUserEmailChange?.(normalizedEmail);
    onUserAvatarChange?.(normalizedAvatar);

    try {
      if (currentUser) {
        const photoURLForProfile =
          normalizedAvatar && !normalizedAvatar.startsWith("data:")
            ? normalizedAvatar
            : currentUser.photoURL || null;

        await updateProfile(currentUser, {
          displayName,
          photoURL: photoURLForProfile,
        });

        await setDoc(
          doc(firebaseDb, "users", currentUser.uid),
          {
            displayName,
            email: normalizedEmail,
            photoURL: photoURLForProfile,
            avatarDataUrl: normalizedAvatar.startsWith("data:") ? normalizedAvatar : null,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      if (localSaved) {
        setStatusMessage("Profile updated successfully.");
      } else {
        setStatusMessage("Profile saved, but local avatar cache could not be updated.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update profile.";
      if (localSaved) {
        setStatusMessage("Avatar saved locally. Cloud profile sync failed.");
        setErrorMessage(message);
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeAvatar = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const nextAvatar = reader.result;
        setAvatarUrl(nextAvatar);
        persistProfileLocally(email, nextAvatar);
        onUserAvatarChange?.(nextAvatar);
        setErrorMessage("");
        setStatusMessage("Avatar selected and cached locally. Click Save Profile to sync account.");
      }
    };
    reader.readAsDataURL(file);

    e.currentTarget.value = "";
  };

  const handleUpdateSecurity = async () => {
    setSecurityErrorMessage("");
    setSecurityStatusMessage("");

    const activeUser = firebaseAuth.currentUser;
    if (!activeUser || !activeUser.email) {
      setSecurityErrorMessage("You must be signed in to change your password.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setSecurityErrorMessage("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      setSecurityErrorMessage("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityErrorMessage("New password and confirm password do not match.");
      return;
    }

    setIsUpdatingSecurity(true);
    try {
      const credential = EmailAuthProvider.credential(activeUser.email, currentPassword);
      await reauthenticateWithCredential(activeUser, credential);
      await updatePassword(activeUser, newPassword);

      await setDoc(
        doc(firebaseDb, "users", activeUser.uid),
        {
          passwordChangedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSecurityStatusMessage("Password updated successfully.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update password.";
      setSecurityErrorMessage(message);
    } finally {
      setIsUpdatingSecurity(false);
    }
  };

  const handleSendPasswordReset = async () => {
    setSecurityErrorMessage("");
    setSecurityStatusMessage("");

    const targetEmail = firebaseAuth.currentUser?.email || email.trim();
    if (!targetEmail) {
      setSecurityErrorMessage("No email found for password reset.");
      return;
    }

    setIsUpdatingSecurity(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, targetEmail);
      setSecurityStatusMessage(`Password reset email sent to ${targetEmail}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send password reset email.";
      setSecurityErrorMessage(message);
    } finally {
      setIsUpdatingSecurity(false);
    }
  };

  const getAlertSummaryFromSystem = () => {
    try {
      const raw = localStorage.getItem("observerx.monitoredWebsites.v1");
      if (!raw) {
        return {
          subject: "ObservaX Alert Notification",
          message: "No active critical alerts were found. This is a test notification confirming email alert service is active.",
          metadata: {
            type: "test",
            source: "profile-notifications",
          },
        };
      }

      const parsed = JSON.parse(raw) as Array<{
        name?: string;
        url?: string;
        status?: string;
        scanError?: string | null;
        lastChecked?: string;
      }>;

      const activeAlert = parsed.find((site) => site.status === "down" || Boolean(site.scanError));
      if (!activeAlert) {
        return {
          subject: "ObservaX Alert Notification",
          message: "No active critical alerts were found. This is a test notification confirming email alert service is active.",
          metadata: {
            type: "test",
            source: "profile-notifications",
          },
        };
      }

      return {
        subject: `ObservaX Alert: ${activeAlert.name || activeAlert.url || "Website"}`,
        message:
          activeAlert.scanError ||
          `Website status is ${activeAlert.status || "unknown"}. Immediate attention may be required.`,
        metadata: {
          site: activeAlert.name || activeAlert.url || "unknown",
          url: activeAlert.url || "unknown",
          status: activeAlert.status || "unknown",
          lastChecked: activeAlert.lastChecked || "unknown",
        },
      };
    } catch {
      return {
        subject: "ObservaX Alert Notification",
        message: "Email alert service is active. Unable to parse current alert feed, so this is a fallback test notification.",
        metadata: {
          type: "fallback",
          source: "profile-notifications",
        },
      };
    }
  };

  const handleSaveNotifications = async () => {
    setNotificationErrorMessage("");
    setNotificationStatusMessage("");

    const targetEmail = firebaseAuth.currentUser?.email || email.trim();
    if (emailAlertsEnabled && !targetEmail) {
      setNotificationErrorMessage("No account email found for alert delivery.");
      return;
    }

    setIsSavingNotifications(true);
    try {
      const preferences = {
        emailAlerts: emailAlertsEnabled,
        smsCriticalAlerts: smsCriticalEnabled,
      };

      localStorage.setItem(PROFILE_NOTIFICATION_STORAGE_KEY, JSON.stringify(preferences));

      const activeUser = firebaseAuth.currentUser;
      if (activeUser) {
        await setDoc(
          doc(firebaseDb, "users", activeUser.uid),
          {
            notificationPreferences: preferences,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      if (emailAlertsEnabled && targetEmail) {
        const alertPayload = getAlertSummaryFromSystem();
        const normalizedMetadata = Object.fromEntries(
          Object.entries(alertPayload.metadata).map(([key, value]) => [key, String(value)]),
        );
        const result = await sendEmailAlertNotification({
          to_email: targetEmail,
          subject: alertPayload.subject,
          message: alertPayload.message,
          metadata: normalizedMetadata,
        });

        setNotificationStatusMessage(
          `Preferences saved and alert email sent to ${result.to_email}.`,
        );
      } else {
        setNotificationStatusMessage("Notification preferences saved.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save notification preferences.";
      setNotificationErrorMessage(message);
    } finally {
      setIsSavingNotifications(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Profile</h2>
        <p className="text-sm text-gray-600">Manage your account, security settings, and preferences</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border">
                {avatarUrl ? <AvatarImage key={avatarUrl} src={avatarUrl} alt="Profile avatar" /> : null}
                <AvatarFallback className="text-lg font-semibold">{getInitials(email)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold text-gray-900">{email || "User"}</p>
                <p className="text-sm text-gray-600">ObservaX Workspace Member</p>
                <div className="mt-2 flex gap-2">
                  <Badge variant="secondary">Active</Badge>
                  <Badge variant="secondary">Verified</Badge>
                </div>
              </div>
            </div>
            <>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
              <Button variant="outline" onClick={handleChangeAvatar}>Change Avatar</Button>
            </>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="account" className="w-full">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-5 w-5 text-blue-600" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              {statusMessage && (
                <Alert>
                  <AlertDescription>{statusMessage}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" defaultValue="Operations Admin" disabled />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5 text-indigo-600" />
                Security Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {securityErrorMessage && (
                <Alert variant="destructive">
                  <AlertDescription>{securityErrorMessage}</AlertDescription>
                </Alert>
              )}
              {securityStatusMessage && (
                <Alert>
                  <AlertDescription>{securityStatusMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isUpdatingSecurity}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isUpdatingSecurity}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isUpdatingSecurity}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-600">Require verification code for logins</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => void handleSendPasswordReset()} disabled={isUpdatingSecurity}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Send Reset Email
                </Button>
                <Button onClick={() => void handleUpdateSecurity()} disabled={isUpdatingSecurity}>
                  {isUpdatingSecurity ? "Updating..." : "Update Security"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-5 w-5 text-amber-600" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationErrorMessage && (
                <Alert variant="destructive">
                  <AlertDescription>{notificationErrorMessage}</AlertDescription>
                </Alert>
              )}
              {notificationStatusMessage && (
                <Alert>
                  <AlertDescription>{notificationStatusMessage}</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">Email Alerts</p>
                    <p className="text-sm text-gray-600">Get incident and status updates by email</p>
                  </div>
                </div>
                <Switch
                  checked={emailAlertsEnabled}
                  onCheckedChange={setEmailAlertsEnabled}
                  disabled={isSavingNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Smartphone className="mt-0.5 h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">SMS for Critical Alerts</p>
                    <p className="text-sm text-gray-600">Receive high severity notifications by SMS</p>
                  </div>
                </div>
                <Switch
                  checked={smsCriticalEnabled}
                  onCheckedChange={setSmsCriticalEnabled}
                  disabled={isSavingNotifications}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => void handleSaveNotifications()} disabled={isSavingNotifications}>
                  {isSavingNotifications ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-emerald-600" />
                Recent Account Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700">
              <div className="rounded-lg border p-3">
                <p className="font-medium text-gray-900">Signed in from current device</p>
                <p className="text-gray-600">Just now • Web App</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-medium text-gray-900">Updated monitoring preferences</p>
                <p className="text-gray-600">2 hours ago • Settings</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-medium text-gray-900">Viewed AI Insights report</p>
                <p className="text-gray-600">Yesterday • Analytics</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
