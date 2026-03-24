import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore.js";
import api from "../lib/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Button } from "../components/ui/button.jsx";
import { Loader2, CheckCircle2, XCircle, Clock, User, Code2, Trophy } from "lucide-react";

export default function ProfilePage() {
  const { authUser } = useAuthStore();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    totalSolved: 0,
    easySolved: 0,
    easyTotal: 0,
    mediumSolved: 0,
    mediumTotal: 0,
    hardSolved: 0,
    hardTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [expandedSubmission, setExpandedSubmission] = useState(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const response = await api.get("/submission/me");
        const subs = response.data?.submissions || [];
        setSubmissions(subs);

        // Calculate difficulty stats
        const easySolved = new Set(subs.filter((s) => s.problem?.difficulty === "Easy" && s.verdict === "Accepted").map((s) => s.problemId)).size;
        const mediumSolved = new Set(subs.filter((s) => s.problem?.difficulty === "Medium" && s.verdict === "Accepted").map((s) => s.problemId)).size;
        const hardSolved = new Set(subs.filter((s) => s.problem?.difficulty === "Hard" && s.verdict === "Accepted").map((s) => s.problemId)).size;

        setStats({
          ...response.data?.stats,
          easySolved,
          mediumSolved,
          hardSolved,
        });
      } catch (err) {
        console.error("Failed to fetch submissions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  const getVerdictIcon = (verdict) => {
    switch (verdict) {
      case "Accepted":
        return <CheckCircle2 className="h-5 w-5 text-[#22c55e]" />;
      case "Pending":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getVerdictClass = (verdict) => {
    switch (verdict) {
      case "Accepted":
        return "bg-[#22c55e]/10 text-[#22c55e]";
      case "Pending":
        return "bg-yellow-500/10 text-yellow-500";
      default:
        return "bg-red-500/10 text-red-500";
    }
  };

  const handleProblemClick = (slug) => {
    navigate(`/problems/${slug}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#22c55e]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* User Info Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
              <User className="h-8 w-8 text-[#22c55e]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{authUser?.username}</h1>
              <p className="text-muted-foreground">{authUser?.email}</p>
              <Badge variant="outline" className="mt-2">
                {authUser?.role || "USER"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Difficulty Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Code2 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Submissions</p>
              <p className="text-2xl font-bold">{stats.totalSubmissions}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-[#22c55e]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Easy Solved</p>
              <p className="text-2xl font-bold">{stats.easySolved}/{stats.easyTotal || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Medium Solved</p>
              <p className="text-2xl font-bold">{stats.mediumSolved}/{stats.mediumTotal || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hard Solved</p>
              <p className="text-2xl font-bold">{stats.hardSolved}/{stats.hardTotal || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions List */}
      <Card>
        <CardHeader>
          <CardTitle>Submission History</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No submissions yet. Start solving problems!
            </p>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <div key={submission.id} className="rounded-lg border border-border">
                  <div
                    onClick={() => setExpandedSubmission(expandedSubmission === submission.id ? null : submission.id)}
                    className="flex items-center justify-between p-4 hover:bg-secondary/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getVerdictIcon(submission.verdict)}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{submission.problem?.title || "Unknown Problem"}</p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${submission.problem?.difficulty === "Easy"
                                ? "bg-[#22c55e]/10 text-[#22c55e]"
                                : submission.problem?.difficulty === "Medium"
                                  ? "bg-yellow-500/10 text-yellow-500"
                                  : "bg-red-500/10 text-red-500"
                              }`}
                          >
                            {submission.problem?.difficulty || "Medium"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(submission.createdAt).toLocaleDateString()} • {submission.language}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {submission.executionTimeMs !== null && (
                        <span className="text-sm text-muted-foreground">
                          {submission.executionTimeMs} ms
                        </span>
                      )}
                      <Badge className={getVerdictClass(submission.verdict)}>
                        {submission.verdict}
                      </Badge>
                    </div>
                  </div>

                  {/* Expanded Code View */}
                  {expandedSubmission === submission.id && (
                    <div className="border-t border-border p-4 bg-secondary/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Submitted Code</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/problems/${submission.problem?.slug}`);
                          }}
                        >
                          Open Problem
                        </Button>
                      </div>
                      <pre className="p-3 bg-background rounded text-sm font-mono overflow-x-auto max-h-64 overflow-y-auto">
                        <code>{submission.code}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
