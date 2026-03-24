import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Loader2, CheckCircle2, XCircle, Clock, User, Code2, Trophy, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button.jsx";

export default function UserProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSubmission, setExpandedSubmission] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/submission/user/${username}`);
        setUserData(response.data);
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
        setError(err.response?.data?.error || "User not found");
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchUserProfile();
    }
  }, [username]);

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

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#22c55e]" />
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="p-8 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">User Not Found</h2>
            <p className="text-muted-foreground mb-4">{error || "The requested user could not be found."}</p>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { user, submissions, stats } = userData;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* User Info Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
              <User className="h-8 w-8 text-[#22c55e]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user.username}</h1>
              <Badge variant="outline" className="mt-2">
                {user.role || "USER"}
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
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-[#22c55e]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Easy</p>
              <p className="text-2xl font-bold">{stats.easy}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Medium</p>
              <p className="text-2xl font-bold">{stats.medium}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hard</p>
              <p className="text-2xl font-bold">{stats.hard}</p>
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
              No submissions yet.
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
