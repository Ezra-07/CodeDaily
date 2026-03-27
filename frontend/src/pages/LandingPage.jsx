import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore.js";
import { useToast } from "../components/ToastProvider.jsx";
import { Button } from "../components/ui/button.jsx";
import { ArrowRight, Zap, Shield, Clock, Server } from "lucide-react";
import api from "../lib/api.js";

export default function LandingPage() {
  const { authUser } = useAuthStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [serverStatus, setServerStatus] = useState("checking");

  useEffect(() => {
    const checkServerWarmup = async () => {
      const startTime = Date.now();
      try {
        await api.get("/problems", { timeout: 30000 });
        const elapsed = Date.now() - startTime;
        if (elapsed > 3000) {
          setServerStatus("slow");
          addToast(
            "Server was sleeping (free tier). It's now awake and ready!",
            "info",
            5000
          );
        } else {
          setServerStatus("live");
        }
      } catch {
        setServerStatus("error");
        addToast(
          "Server is warming up... Please wait a few seconds for the free Render server to start.",
          "warning",
          8000
        );
      }
    };

    checkServerWarmup();
  }, [addToast]);

  const handleCTA = () => {
    if (authUser) {
      navigate("/dashboard");
    } else {
      navigate("/signup");
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="max-w-3xl space-y-8">
          {/* Server Status Badge*/}
          {serverStatus !== "live" && (
            <div className="inline-flex items-center rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-sm text-yellow-500">
              <Server className="mr-2 h-3 w-3" />
              {serverStatus === "checking"
                ? "Checking server status..."
                : "Free tier server - may take 30s to wake up"}
            </div>
          )}

          {/* Badge */}
          <div className="inline-flex items-center rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1 text-sm text-[#22c55e]">
            <Zap className="mr-2 h-3 w-3" />
            Docker-powered judging
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Master your{" "}
            <span className="text-[#22c55e]">coding skills</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Daily challenges, real-time Docker judging, zero friction.
            Practice algorithms, track your progress, and compete with developers worldwide.
          </p>

          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={handleCTA}
              className="bg-[#22c55e] text-black hover:bg-[#22c55e]/90 px-8 py-6 text-lg"
            >
              {authUser ? "Go to Dashboard" : "Start Coding Now"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 pt-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#22c55e]" />
              <span>Secure Docker sandbox</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#22c55e]" />
              <span>Real-time results</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-border bg-secondary/50 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#22c55e]/10">
                <Zap className="h-5 w-5 text-[#22c55e]" />
              </div>
              <h3 className="mb-2 font-semibold">Async Execution</h3>
              <p className="text-sm text-muted-foreground">
                Built on a high-performance Redis and BullMQ queue to handle concurrent submissions without dropping requests.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#22c55e]/10">
                <Shield className="h-5 w-5 text-[#22c55e]" />
              </div>
              <h3 className="mb-2 font-semibold">Isolated Sandbox</h3>
              <p className="text-sm text-muted-foreground">
                Every submission runs in a heavily restricted, network-isolated container for maximum security.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#22c55e]/10">
                <Clock className="h-5 w-5 text-[#22c55e]" />
              </div>
              <h3 className="mb-2 font-semibold">Track Progress</h3>
              <p className="text-sm text-muted-foreground">
                Monitor your solve rate, execution times, and compete on the leaderboard.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}