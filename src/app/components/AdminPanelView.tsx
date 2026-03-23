import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";
import { firebaseDb } from "../lib/firebaseClient";
import type { MonitoredWebsite } from "../lib/monitoredWebsitesStore";

interface AdminPanelViewProps {
  userEmail: string | null;
  isAdmin: boolean;
  websites: MonitoredWebsite[];
  defaultSection?: AdminSection;
  showSectionTabs?: boolean;
}

type AdminSection = "overview" | "users" | "payments" | "support";

const adminSectionItems: Array<{ id: AdminSection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "payments", label: "Payments" },
  { id: "support", label: "Support" },
];

type AdminUserRow = {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  accessLevel: string;
  accountStatus: string;
  planName: string;
  subscriptionStatus: string;
};

type AdminPaymentRow = {
  id: string;
  uid: string;
  email: string;
  planName: string;
  amountCents: number;
  currency: string;
  status: string;
  last4: string;
  createdAtISO: string;
};

type SupportChatMessageRow = {
  id: string;
  uid: string;
  email: string;
  role: "user" | "bot" | "admin";
  text: string;
  createdAtISO: string;
};

const chartColors = ["#0f766e", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

function toISO(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return "";
}

function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
  }).format((amountCents || 0) / 100);
}

function formatDate(iso: string) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export function AdminPanelView({
  userEmail,
  isAdmin,
  websites,
  defaultSection = "overview",
  showSectionTabs = true,
}: AdminPanelViewProps) {
  const totalWebsites = websites.length;
  const activeMonitoring = websites.filter((site) => site.monitoring).length;
  const downWebsites = websites.filter((site) => site.status === "down").length;
  const degradedWebsites = websites.filter((site) => site.status === "degraded").length;
  const [activeSection, setActiveSection] = useState<AdminSection>(defaultSection);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [isUpdatingUser, setIsUpdatingUser] = useState<string>("");
  const [dataError, setDataError] = useState<string>("");
  const [userSearch, setUserSearch] = useState<string>("");
  const [userStatusFilter, setUserStatusFilter] = useState<string>("all");
  const [paymentSearch, setPaymentSearch] = useState<string>("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [supportMessages, setSupportMessages] = useState<SupportChatMessageRow[]>([]);
  const [selectedSupportUid, setSelectedSupportUid] = useState<string>("");
  const [adminReplyInput, setAdminReplyInput] = useState<string>("");
  const [isSendingSupportReply, setIsSendingSupportReply] = useState<boolean>(false);

  useEffect(() => {
    setActiveSection(defaultSection);
  }, [defaultSection]);

  const loadAdminData = async () => {
    setIsLoadingData(true);
    setDataError("");

    try {
      const [usersSnap, paymentSnap] = await Promise.all([
        getDocs(collection(firebaseDb, "users")),
        getDocs(collectionGroup(firebaseDb, "subscriptionHistory")),
      ]);

      const userRows: AdminUserRow[] = usersSnap.docs
        .map((entry) => {
          const data = entry.data() as Record<string, unknown>;
          const subscription = (data.subscription as Record<string, unknown> | undefined) || {};

          return {
            uid: String(data.uid || entry.id),
            email: String(data.email || "-") || "-",
            displayName: String(data.displayName || data.email || "-") || "-",
            role: String(data.role || "user"),
            accessLevel: String(data.accessLevel || "standard"),
            accountStatus: String(data.accountStatus || "active"),
            planName: String(subscription.planName || "-") || "-",
            subscriptionStatus: String(subscription.status || "-") || "-",
          };
        })
        .sort((a, b) => a.email.localeCompare(b.email));

      const userEmailByUid = new Map(userRows.map((user) => [user.uid, user.email]));

      const paymentRows: AdminPaymentRow[] = paymentSnap.docs
        .map((entry) => {
          const data = entry.data() as Record<string, unknown>;
          const uid = String(data.uid || entry.ref.parent.parent?.id || "");

          return {
            id: entry.id,
            uid,
            email: userEmailByUid.get(uid) || "-",
            planName: String(data.planName || "-") || "-",
            amountCents: Number(data.amountCents || 0),
            currency: String(data.currency || "USD"),
            status: String(data.status || "paid"),
            last4: String(data.last4 || "0000"),
            createdAtISO: toISO(data.createdAt) || toISO(data.createdAtISO),
          };
        })
        .sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1));

      setUsers(userRows);
      setPayments(paymentRows);
    } catch {
      setDataError("Unable to load admin account and payment data.");
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  useEffect(() => {
    const supportQuery = query(collection(firebaseDb, "support_messages"));
    const unsubscribe = onSnapshot(supportQuery, (snapshot) => {
      const mapped = snapshot.docs
        .map((entry) => {
          const data = entry.data() as {
            uid?: string;
            email?: string;
            role?: "user" | "bot" | "admin";
            text?: string;
            createdAt?: Timestamp;
            clientTime?: string;
          };
          const createdAtISO =
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : data.clientTime || "";

          return {
            id: entry.id,
            uid: String(data.uid || ""),
            email: String(data.email || "-") || "-",
            role: data.role || "bot",
            text: String(data.text || ""),
            createdAtISO,
          } as SupportChatMessageRow;
        })
        .filter((entry) => entry.uid && entry.text.trim().length > 0)
        .sort((a, b) => (a.createdAtISO < b.createdAtISO ? -1 : a.createdAtISO > b.createdAtISO ? 1 : a.id.localeCompare(b.id)));

      setSupportMessages(mapped);

      if (!selectedSupportUid && mapped.length > 0) {
        setSelectedSupportUid(mapped[0].uid);
      }
      if (selectedSupportUid && !mapped.some((entry) => entry.uid === selectedSupportUid)) {
        setSelectedSupportUid(mapped[0]?.uid || "");
      }
    });

    return () => unsubscribe();
  }, [selectedSupportUid]);

  const handleDeactivateForUnpaid = async (user: AdminUserRow) => {
    if (!isAdmin) {
      setDataError("Only admins can deactivate accounts.");
      return;
    }

    try {
      setIsUpdatingUser(user.uid);
      setDataError("");

      await updateDoc(doc(firebaseDb, "users", user.uid), {
        accountStatus: "deactivated",
        accessLevel: "none",
        updatedAt: serverTimestamp(),
        deactivatedAt: serverTimestamp(),
      });

      await loadAdminData();
    } catch {
      setDataError("Failed to deactivate user account.");
    } finally {
      setIsUpdatingUser("");
    }
  };

  const handleActivateAccount = async (user: AdminUserRow) => {
    if (!isAdmin) {
      setDataError("Only admins can activate accounts.");
      return;
    }

    if (user.accountStatus === "removed") {
      setDataError("Removed accounts cannot be reactivated.");
      return;
    }

    try {
      setIsUpdatingUser(user.uid);
      setDataError("");

      await updateDoc(doc(firebaseDb, "users", user.uid), {
        accountStatus: "active",
        accessLevel: user.role === "admin" ? "full" : "standard",
        updatedAt: serverTimestamp(),
      });

      await loadAdminData();
    } catch {
      setDataError("Failed to activate user account.");
    } finally {
      setIsUpdatingUser("");
    }
  };

  const handleRemoveAccount = async (user: AdminUserRow) => {
    if (!isAdmin) {
      setDataError("Only admins can remove accounts.");
      return;
    }

    const approved = window.confirm(`Remove account data for ${user.email}? This action removes payment history records.`);
    if (!approved) {
      return;
    }

    try {
      setIsUpdatingUser(user.uid);
      setDataError("");

      const historySnap = await getDocs(collection(firebaseDb, "users", user.uid, "subscriptionHistory"));
      const batch = writeBatch(firebaseDb);

      historySnap.forEach((entry) => {
        batch.delete(entry.ref);
      });

      batch.set(
        doc(firebaseDb, "users", user.uid),
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: "user",
          accessLevel: "none",
          accountStatus: "removed",
          subscription: null,
          updatedAt: serverTimestamp(),
          removedAt: serverTimestamp(),
        },
        { merge: true },
      );

      await batch.commit();
      await loadAdminData();
    } catch {
      setDataError("Failed to remove account.");
    } finally {
      setIsUpdatingUser("");
    }
  };

  const totalRevenueLabel = useMemo(() => {
    const totalCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
    return formatMoney(totalCents, payments[0]?.currency || "USD");
  }, [payments]);

  const filteredUsers = useMemo(() => {
    const needle = userSearch.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !needle ||
        user.email.toLowerCase().includes(needle) ||
        user.displayName.toLowerCase().includes(needle) ||
        user.planName.toLowerCase().includes(needle);
      const matchesStatus = userStatusFilter === "all" || user.accountStatus === userStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [users, userSearch, userStatusFilter]);

  const filteredPayments = useMemo(() => {
    const needle = paymentSearch.trim().toLowerCase();
    return payments.filter((payment) => {
      const matchesSearch =
        !needle ||
        payment.email.toLowerCase().includes(needle) ||
        payment.planName.toLowerCase().includes(needle) ||
        payment.last4.toLowerCase().includes(needle);
      const matchesStatus = paymentStatusFilter === "all" || payment.status === paymentStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [payments, paymentSearch, paymentStatusFilter]);

  const userStatusData = useMemo(() => {
    const counts = users.reduce<Record<string, number>>((acc, user) => {
      const key = user.accountStatus || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [users]);

  const paymentStatusData = useMemo(() => {
    const counts = payments.reduce<Record<string, number>>((acc, payment) => {
      const key = payment.status || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [payments]);

  const planData = useMemo(() => {
    const counts = users.reduce<Record<string, number>>((acc, user) => {
      const key = user.planName || "-";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, usersOnPlan]) => ({ name, usersOnPlan }))
      .sort((a, b) => b.usersOnPlan - a.usersOnPlan)
      .slice(0, 6);
  }, [users]);

  const monthlyRevenueData = useMemo(() => {
    const revenueByMonth = payments.reduce<Record<string, number>>((acc, payment) => {
      if (!payment.createdAtISO) return acc;
      const date = new Date(payment.createdAtISO);
      if (Number.isNaN(date.getTime())) return acc;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      acc[monthKey] = (acc[monthKey] || 0) + payment.amountCents;
      return acc;
    }, {});

    return Object.entries(revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, revenueCents]) => ({
        month,
        revenue: Number((revenueCents / 100).toFixed(2)),
      }));
  }, [payments]);

  const supportConversations = useMemo(() => {
    const byUid = new Map<string, { uid: string; email: string; lastText: string; lastCreatedAtISO: string }>();
    supportMessages.forEach((entry) => {
      const existing = byUid.get(entry.uid);
      if (!existing || existing.lastCreatedAtISO <= entry.createdAtISO) {
        byUid.set(entry.uid, {
          uid: entry.uid,
          email: entry.email,
          lastText: entry.text,
          lastCreatedAtISO: entry.createdAtISO,
        });
      }
    });

    return Array.from(byUid.values()).sort((a, b) => (a.lastCreatedAtISO < b.lastCreatedAtISO ? 1 : -1));
  }, [supportMessages]);

  const selectedConversationMessages = useMemo(
    () => supportMessages.filter((entry) => entry.uid === selectedSupportUid),
    [supportMessages, selectedSupportUid],
  );

  const selectedConversationEmail = useMemo(
    () => supportConversations.find((entry) => entry.uid === selectedSupportUid)?.email || "",
    [supportConversations, selectedSupportUid],
  );

  const handleSendAdminReply = async () => {
    const text = adminReplyInput.trim();
    if (!text || !selectedSupportUid) {
      return;
    }

    setIsSendingSupportReply(true);
    setDataError("");

    try {
      await addDoc(collection(firebaseDb, "support_messages"), {
        uid: selectedSupportUid,
        email: selectedConversationEmail || "-",
        role: "admin",
        text,
        createdAt: serverTimestamp(),
        clientTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        adminEmail: userEmail || "admin@gmail.com",
      });
      setAdminReplyInput("");
    } catch {
      setDataError("Failed to send support reply.");
    } finally {
      setIsSendingSupportReply(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-bold text-gray-900">Welcome Admin</h1>
        <p className="mt-1 text-sm text-gray-600">Manage users, payments, and system operations from one place.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin Operations Panel</CardTitle>
          {/* <CardDescription>
            Primary control center for maintaining system health and platform configuration.
          </CardDescription> */}
        </CardHeader>
        <CardContent className="space-y-4">
          {showSectionTabs ? (
            <div className="flex flex-wrap gap-2">
              {adminSectionItems.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={activeSection === item.id ? "default" : "outline"}
                  onClick={() => setActiveSection(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          ) : null}

          {/*<div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            Signed in as <span className="font-semibold">{userEmail || "admin"}</span>. Admin role has full read/write access.
          </div>*/}
          {isLoadingData ? <p className="text-sm text-gray-600">Loading account and payment details...</p> : null}
          {dataError ? <p className="text-sm text-red-600">{dataError}</p> : null}

          {(activeSection === "overview" || activeSection === "users") ? (
            <div className="space-y-3">
              {activeSection === "overview" ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Total Websites</p>
                      <p className="mt-2 text-4xl font-extrabold leading-none tracking-tight text-slate-900">{totalWebsites}</p>
                    </div>
                    <div className="rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-4 shadow-sm">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-700">Monitoring Enabled</p>
                      <p className="mt-2 text-4xl font-extrabold leading-none tracking-tight text-cyan-900">{activeMonitoring}</p>
                    </div>
                    <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-4 shadow-sm">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-red-700">Down</p>
                      <p className="mt-2 text-4xl font-extrabold leading-none tracking-tight text-red-700">{downWebsites}</p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-amber-700">Degraded</p>
                      <p className="mt-2 text-4xl font-extrabold leading-none tracking-tight text-amber-700">{degradedWebsites}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-indigo-700">Total Accounts</p>
                      <p className="mt-2 text-4xl font-extrabold leading-none tracking-tight text-indigo-900">{users.length}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-700">Total Payments</p>
                      <p className="mt-2 text-4xl font-extrabold leading-none tracking-tight text-emerald-900">{payments.length}</p>
                    </div>
                    <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-4 shadow-sm">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-teal-700">Total Revenue</p>
                      <p className="mt-2 text-4xl font-extrabold leading-none tracking-tight text-teal-900">{totalRevenueLabel}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-900">Maintenance Workflow</p>
                    <p className="mt-1 text-sm text-blue-800">
                      Use this panel as the main operational workspace: check alerts, run monitoring, fix settings, and
                      validate analytics before moving to other tabs.
                    </p>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">User Status Analytics</CardTitle>
                        <CardDescription>Live breakdown of active, deactivated, and removed accounts.</CardDescription>
                      </CardHeader>
                      <CardContent className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={userStatusData} dataKey="value" nameKey="name" outerRadius={95} label>
                              {userStatusData.map((entry, index) => (
                                <Cell key={`user-status-${entry.name}`} fill={chartColors[index % chartColors.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Payment Status Analytics</CardTitle>
                        <CardDescription>Paid, pending, and failed payment distribution.</CardDescription>
                      </CardHeader>
                      <CardContent className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={paymentStatusData} dataKey="value" nameKey="name" outerRadius={95} label>
                              {paymentStatusData.map((entry, index) => (
                                <Cell key={`payment-status-${entry.name}`} fill={chartColors[index % chartColors.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Revenue Trend (Last 6 Months)</CardTitle>
                        <CardDescription>Monthly payment revenue trend from recorded transactions.</CardDescription>
                      </CardHeader>
                      <CardContent className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={monthlyRevenueData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="revenue" stroke="#0f766e" strokeWidth={3} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Users by Plan</CardTitle>
                        <CardDescription>Most used plans among current user accounts.</CardDescription>
                      </CardHeader>
                      <CardContent className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={planData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="usersOnPlan" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : null}

              {activeSection === "users" ? (
                <>
                  <h3 className="text-base font-semibold text-gray-900">All User Accounts</h3>
                  <div className="grid gap-3 rounded-lg border bg-white p-3 md:grid-cols-2">
                    <input
                      className="h-10 rounded-md border border-gray-300 px-3 text-sm outline-none ring-offset-white focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                      placeholder="Search users by email, name, or plan"
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                    />
                    <select
                      className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none ring-offset-white focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                      value={userStatusFilter}
                      onChange={(event) => setUserStatusFilter(event.target.value)}
                    >
                      <option value="all">All Account Statuses</option>
                      <option value="active">Active</option>
                      <option value="deactivated">Deactivated</option>
                      <option value="removed">Removed</option>
                    </select>
                  </div>
                  <div className="rounded-lg border bg-white p-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Display Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Access</TableHead>
                          <TableHead>Account Status</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Subscription Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-gray-500">No matching user account data found.</TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((user) => (
                            <TableRow key={user.uid}>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>{user.displayName}</TableCell>
                              <TableCell className="uppercase">{user.role}</TableCell>
                              <TableCell className="capitalize">{user.accessLevel}</TableCell>
                              <TableCell className="capitalize">{user.accountStatus}</TableCell>
                              <TableCell>{user.planName}</TableCell>
                              <TableCell className="capitalize">{user.subscriptionStatus}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={!isAdmin || isUpdatingUser === user.uid || user.accountStatus !== "deactivated"}
                                    onClick={() => void handleActivateAccount(user)}
                                  >
                                    Activate
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={!isAdmin || isUpdatingUser === user.uid || user.accountStatus !== "active"}
                                    onClick={() => void handleDeactivateForUnpaid(user)}
                                  >
                                    Deactivate
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    disabled={!isAdmin || isUpdatingUser === user.uid || user.accountStatus === "removed"}
                                    onClick={() => void handleRemoveAccount(user)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {activeSection === "payments" ? (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-gray-900">All Payment History</h3>
              <div className="grid gap-3 rounded-lg border bg-white p-3 md:grid-cols-2">
                <input
                  className="h-10 rounded-md border border-gray-300 px-3 text-sm outline-none ring-offset-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  placeholder="Search payments by email, plan, or card last 4"
                  value={paymentSearch}
                  onChange={(event) => setPaymentSearch(event.target.value)}
                />
                <select
                  className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none ring-offset-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  value={paymentStatusFilter}
                  onChange={(event) => setPaymentStatusFilter(event.target.value)}
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div className="rounded-lg border bg-white p-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User Email</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Card</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500">No matching payment history found.</TableCell>
                      </TableRow>
                    ) : (
                      filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.createdAtISO)}</TableCell>
                          <TableCell>{payment.email}</TableCell>
                          <TableCell>{payment.planName}</TableCell>
                          <TableCell>{formatMoney(payment.amountCents, payment.currency)}</TableCell>
                          <TableCell className="capitalize">{payment.status}</TableCell>
                          <TableCell>****{payment.last4}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          {activeSection === "support" ? (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-gray-900">Support Chat Inbox</h3>
              <div className="grid gap-3 rounded-lg border bg-white p-3 md:grid-cols-2">
                <select
                  className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none ring-offset-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={selectedSupportUid}
                  onChange={(event) => setSelectedSupportUid(event.target.value)}
                >
                  {supportConversations.length === 0 ? (
                    <option value="">No support conversations</option>
                  ) : (
                    supportConversations.map((thread) => (
                      <option key={thread.uid} value={thread.uid}>
                        {thread.email} - {thread.lastText.slice(0, 60)}
                      </option>
                    ))
                  )}
                </select>
                <div className="text-sm text-gray-600 flex items-center">
                  {selectedConversationEmail
                    ? `Selected user: ${selectedConversationEmail}`
                    : "Choose a conversation to reply"}
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3 space-y-3">
                <div className="max-h-72 overflow-y-auto space-y-2 rounded-md border bg-slate-50 p-3">
                  {selectedConversationMessages.length === 0 ? (
                    <p className="text-sm text-gray-500">No messages for the selected conversation.</p>
                  ) : (
                    selectedConversationMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`rounded-md px-3 py-2 text-sm ${
                          message.role === "user"
                            ? "ml-8 bg-emerald-100 text-emerald-900"
                            : message.role === "admin"
                              ? "mr-8 bg-blue-100 text-blue-900"
                              : "mr-8 bg-gray-200 text-gray-700"
                        }`}
                      >
                        <p>{message.text}</p>
                        <p className="mt-1 text-[11px] text-gray-500">{formatDate(message.createdAtISO)}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={adminReplyInput}
                    onChange={(event) => setAdminReplyInput(event.target.value)}
                    placeholder="Type admin reply to user support chat..."
                    disabled={!selectedSupportUid || isSendingSupportReply}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleSendAdminReply();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => void handleSendAdminReply()}
                    disabled={!selectedSupportUid || !adminReplyInput.trim() || isSendingSupportReply}
                  >
                    {isSendingSupportReply ? "Sending..." : "Reply"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
