import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { addDoc, collection, onSnapshot, query, serverTimestamp, Timestamp, where } from "firebase/firestore";
import { LifeBuoy, Mail, MessageSquare, Clock } from "lucide-react";
import { toast } from "sonner";
import { firebaseDb } from "../lib/firebaseClient";

type ChatMessage = {
  id: string;
  role: "user" | "bot" | "admin";
  text: string;
  time: string;
  createdAtMs: number;
};

interface SupportViewProps {
  userUid?: string | null;
  userEmail?: string | null;
}

function createSupportReply(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("down") || lowerMessage.includes("offline") || lowerMessage.includes("500")) {
    return "I understand this looks like a downtime incident. Please share the affected website URL and the exact time it started, and I will guide you through urgent checks.";
  }

  if (lowerMessage.includes("alert") || lowerMessage.includes("notification")) {
    return "For alert issues, please confirm if this is false-positive noise or missing alerts. I can help you tune thresholds and notification channels step by step.";
  }

  if (lowerMessage.includes("slow") || lowerMessage.includes("latency") || lowerMessage.includes("performance")) {
    return "For performance problems, please share recent response time values and affected endpoints. I can suggest monitoring interval and threshold adjustments.";
  }

  if (lowerMessage.includes("integration") || lowerMessage.includes("api") || lowerMessage.includes("webhook")) {
    return "For integration issues, verify API key validity and webhook URL reachability first. If you share the failing integration name, I will provide targeted fixes.";
  }

  return "Thanks for the details. Please include your website URL, what you expected, what actually happened, and any error message so I can assist faster.";
}

export function SupportView({ userUid, userEmail }: SupportViewProps) {
  const [chatRequested, setChatRequested] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const normalizedUserEmail = useMemo(() => (userEmail || "").trim() || "unknown@observax.app", [userEmail]);

  const getTimeLabel = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatTime = (ts?: Timestamp | null, fallback?: string) => {
    if (ts instanceof Timestamp) {
      return ts.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return fallback || getTimeLabel();
  };

  useEffect(() => {
    if (!userUid) {
      setMessages([]);
      setChatRequested(false);
      return;
    }

    const supportQuery = query(
      collection(firebaseDb, "support_messages"),
      where("uid", "==", userUid),
    );

    const unsubscribe = onSnapshot(supportQuery, (snapshot) => {
      const mapped = snapshot.docs
        .map((entry) => {
          const data = entry.data() as {
            role?: "user" | "bot" | "admin";
            text?: string;
            createdAt?: Timestamp;
            clientTime?: string;
          };
          const createdAtMs = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : 0;
          return {
            id: entry.id,
            role: data.role || "bot",
            text: String(data.text || ""),
            time: formatTime(data.createdAt, data.clientTime),
            createdAtMs,
          } as ChatMessage;
        })
        .filter((message) => message.text.trim().length > 0)
        .sort((a, b) => (a.createdAtMs === b.createdAtMs ? a.id.localeCompare(b.id) : a.createdAtMs - b.createdAtMs));

      setMessages(mapped);
      setChatRequested(mapped.length > 0);
    });

    return () => unsubscribe();
  }, [userUid]);

  const handleStartChat = async () => {
    if (!userUid) {
      toast.error("Please sign in to start support chat.");
      return;
    }

    setChatRequested(true);
    const hasIntro = messages.some((message) => message.role === "bot");
    if (!hasIntro) {
      try {
        await addDoc(collection(firebaseDb, "support_messages"), {
          uid: userUid,
          email: normalizedUserEmail,
          role: "bot",
          text: "Hi, I’m ObservaX Support Bot. Tell me your issue and I’ll help troubleshoot it. An admin can also reply here.",
          createdAt: serverTimestamp(),
          clientTime: getTimeLabel(),
        });
      } catch {
        toast.error("Failed to start support chat. Please try again.");
        return;
      }
    }

    toast.success("Support chat request started", {
      description: "A support agent will be connected shortly.",
    });
  };

  const handleSendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text) return;

    if (!userUid) {
      toast.error("Please sign in to send support messages.");
      return;
    }

    setChatInput("");
    try {
      await addDoc(collection(firebaseDb, "support_messages"), {
        uid: userUid,
        email: normalizedUserEmail,
        role: "user",
        text,
        createdAt: serverTimestamp(),
        clientTime: getTimeLabel(),
      });

      await addDoc(collection(firebaseDb, "support_messages"), {
        uid: userUid,
        email: normalizedUserEmail,
        role: "bot",
        text: createSupportReply(text),
        createdAt: serverTimestamp(),
        clientTime: getTimeLabel(),
      });
    } catch {
      toast.error("Failed to send message. Please try again.");
    }
  };

  const handleOpenEmail = () => {
    const subject = encodeURIComponent("ObserverX Support Request");
    const body = encodeURIComponent(
      "Hi Support Team,"
    );
    window.location.href = `mailto:support@observax.lk?subject=${subject}&body=${body}`;
    toast.message("Email client opened", {
      description: "Drafted a support email with issue details template.",
    });
  };

  const handleReportIncident = () => {
    const incidentId = `INC-${Date.now().toString().slice(-6)}`;
    toast.success(`Incident reported: ${incidentId}`, {
      description: "Our on-call team has been notified.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Support</h2>
        <p className="text-sm text-gray-600">Contact the team and get help with incidents</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5 text-green-600" />
              Live Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <p>Chat with support for urgent monitoring and uptime issues.</p>
            <Button size="sm" onClick={handleStartChat} disabled={chatRequested}>
              {chatRequested ? "Chat Requested" : "Start Chat"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-5 w-5 text-green-600" />
              Email Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <p>Send detailed requests and logs to our support inbox.</p>
            <Button size="sm" variant="outline" onClick={handleOpenEmail}>
              Open Email
            </Button>
          </CardContent>
        </Card>
      </div>

      {chatRequested && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5 text-green-600" />
              Support Chatbot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border bg-white p-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-md px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "ml-8 bg-green-50 text-gray-800"
                      : message.role === "admin"
                        ? "mr-8 bg-blue-100 text-blue-900"
                        : "mr-8 bg-gray-100 text-gray-700"
                  }`}
                >
                  <p>{message.text}</p>
                  <p className="mt-1 text-[11px] text-gray-500">{message.time}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSendChatMessage();
                  }
                }}
                placeholder="Describe your issue (errors, website URL, alert behavior)..."
              />
              <Button onClick={handleSendChatMessage}>Send</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LifeBuoy className="h-5 w-5 text-green-600" />
            Service Commitment
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            First response under 1 hour
          </Badge>
          <span>Critical incidents are prioritized 24/7.</span>
          <Button size="sm" variant="outline" onClick={handleReportIncident}>
            Report Incident
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
