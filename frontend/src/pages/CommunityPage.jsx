import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { useAuthStore } from "../store/useAuthStore.js";
import { Loader2, ArrowLeft, MessageSquare, Code, CheckCircle2, Lock, Users, Trash2 } from "lucide-react";

export default function CommunityPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const authUser = useAuthStore((state) => state.authUser);
  const [problem, setProblem] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [userAttempted, setUserAttempted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [discussions, setDiscussions] = useState([]);
  const [newDiscussion, setNewDiscussion] = useState("");
  const [creatingDiscussion, setCreatingDiscussion] = useState(false);
  const [solutions, setSolutions] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSolution, setNewSolution] = useState({ title: "", explanation: "", code: "" });
  const [creating, setCreating] = useState(false);
  const [deletingSolutionId, setDeletingSolutionId] = useState(null);
  const [deletingDiscussionId, setDeletingDiscussionId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch problem details
        const problemRes = await api.get(`/problems/${slug}`);
        setProblem(problemRes.data?.problem);

        // Check if user has attempted this problem
        try {
          const submissionsRes = await api.get("/submission/me");
          const userSubs = submissionsRes.data?.submissions || [];
          const problemSubs = userSubs.filter((s) => s.problem?.slug === slug);
          setSubmissions(problemSubs);
          setUserAttempted(problemSubs.length > 0);
        } catch {
          setUserAttempted(false);
        }

        // Fetch community solutions
        try {
          const solutionsRes = await api.get(`/solutions/problem/${problemRes.data?.problem?.id}`);
          setSolutions(solutionsRes.data?.solutions || []);
        } catch {
          setSolutions([]);
        }

        // Fetch discussions
        try {
          const discussionsRes = await api.get(`/discussions/problem/${problemRes.data?.problem?.id}`);
          setDiscussions(discussionsRes.data?.discussions || []);
        } catch {
          setDiscussions([]);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
        addToast("Failed to load community data", "error");
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchData();
    }
  }, [slug, addToast]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#22c55e]" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Problem not found</p>
            <Button onClick={() => navigate("/dashboard")} className="mt-4">
              Back to Problems
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const acceptedSubmissions = submissions.filter((s) => s.verdict === "Accepted");
  const hasAccepted = acceptedSubmissions.length > 0;

  const handleCreateDiscussion = async () => {
    if (!newDiscussion.trim()) {
      addToast("Please enter a message", "error");
      return;
    }

    setCreatingDiscussion(true);
    try {
      const response = await api.post("/discussions", {
        problemId: problem.id,
        content: newDiscussion,
      });

      setDiscussions([response.data.discussion, ...discussions]);
      setNewDiscussion("");
      addToast("Discussion posted!", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to post discussion", "error");
    } finally {
      setCreatingDiscussion(false);
    }
  };

  const handleCreateSolution = async () => {
    if (!newSolution.title.trim() || !newSolution.explanation.trim() || !newSolution.code.trim()) {
      addToast("Please fill in all fields", "error");
      return;
    }

    setCreating(true);
    try {
      const response = await api.post("/solutions", {
        problemId: problem.id,
        title: newSolution.title,
        explanation: newSolution.explanation,
        code: newSolution.code,
        language: "cpp",
      });

      setSolutions([response.data.solution, ...solutions]);
      setNewSolution({ title: "", explanation: "", code: "" });
      setShowCreateForm(false);
      addToast("Solution posted successfully!", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to post solution", "error");
    } finally {
      setCreating(false);
    }
  };

  const canDeletePost = (ownerId) => {
    if (!authUser) return false;
    return authUser.id === ownerId || authUser.role === "ADMIN";
  };

  const handleDeleteSolution = async (solutionId) => {
    setDeletingSolutionId(solutionId);
    try {
      await api.delete(`/solutions/${solutionId}`);
      setSolutions((prev) => prev.filter((solution) => solution.id !== solutionId));
      addToast("Solution deleted", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to delete solution", "error");
    } finally {
      setDeletingSolutionId(null);
    }
  };

  const handleDeleteDiscussion = async (discussionId) => {
    setDeletingDiscussionId(discussionId);
    try {
      await api.delete(`/discussions/${discussionId}`);
      setDiscussions((prev) => prev.filter((discussion) => discussion.id !== discussionId));
      addToast("Discussion deleted", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to delete discussion", "error");
    } finally {
      setDeletingDiscussionId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{problem.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="outline"
              className={
                problem.difficulty === "Easy"
                  ? "border-[#22c55e] text-[#22c55e]"
                  : problem.difficulty === "Medium"
                    ? "border-yellow-500 text-yellow-500"
                    : "border-red-500 text-red-500"
              }
            >
              {problem.difficulty || "Medium"}
            </Badge>
            {hasAccepted && (
              <Badge className="bg-[#22c55e]/10 text-[#22c55e]">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Solved
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={() => navigate(`/problems/${slug}`)} variant="outline">
          <Code className="h-4 w-4 mr-2" />
          Solve Problem
        </Button>
      </div>

      {/* Access Control */}
      {!userAttempted && (
        <Card className="mb-6 border-yellow-500/50">
          <CardContent className="p-6 flex items-center gap-4">
            <Lock className="h-8 w-8 text-yellow-500" />
            <div>
              <h3 className="font-semibold">Community Access Locked</h3>
              <p className="text-sm text-muted-foreground">
                You need to attempt this problem at least once to view community solutions and discussions.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="solutions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="solutions" disabled={!userAttempted}>
            <Code className="h-4 w-4 mr-2" />
            Solutions
          </TabsTrigger>
          <TabsTrigger value="discussions" disabled={!userAttempted}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Discussions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="solutions" className="space-y-4">
          {hasAccepted && (
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Community Solutions</h3>
              <Button
                onClick={() => setShowCreateForm(!showCreateForm)}
                variant="outline"
                size="sm"
              >
                {showCreateForm ? "Cancel" : "Share Your Solution"}
              </Button>
            </div>
          )}

          {showCreateForm && (
            <Card className="mb-4">
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Title</label>
                  <input
                    type="text"
                    value={newSolution.title}
                    onChange={(e) => setNewSolution({ ...newSolution, title: e.target.value })}
                    placeholder="e.g., Optimal O(n) Solution using Hash Map"
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Explanation</label>
                  <textarea
                    value={newSolution.explanation}
                    onChange={(e) => setNewSolution({ ...newSolution, explanation: e.target.value })}
                    placeholder="Explain your approach and thought process..."
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm min-h-25"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Code</label>
                  <textarea
                    value={newSolution.code}
                    onChange={(e) => setNewSolution({ ...newSolution, code: e.target.value })}
                    placeholder="Paste your solution code here..."
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm font-mono min-h-50"
                  />
                </div>
                <Button
                  onClick={handleCreateSolution}
                  disabled={creating}
                  className="w-full bg-[#22c55e] text-black hover:bg-[#22c55e]/90"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Post Solution
                </Button>
              </CardContent>
            </Card>
          )}

          {solutions.length > 0 ? (
            solutions.map((solution) => (
              <Card key={solution.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{solution.title}</CardTitle>
                      <div className="text-xs text-muted-foreground mt-1">
                        by {solution.user?.username || "Anonymous"} • {new Date(solution.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{solution.language}</Badge>
                      {canDeletePost(solution.user?.id) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSolution(solution.id)}
                          disabled={deletingSolutionId === solution.id}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          {deletingSolutionId === solution.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{solution.explanation}</p>
                  <pre className="p-3 bg-secondary rounded text-sm font-mono overflow-x-auto max-h-96 overflow-y-auto">
                    <code>{solution.code}</code>
                  </pre>
                </CardContent>
              </Card>
            ))
          ) : userAttempted ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Community Solutions Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Be the first to share your solution with the community!
                </p>
                {hasAccepted && (
                  <Button onClick={() => setShowCreateForm(true)}>
                    Share Your Solution
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Attempt the problem to unlock community solutions
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="discussions" className="space-y-4">
          {userAttempted && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <textarea
                  value={newDiscussion}
                  onChange={(e) => setNewDiscussion(e.target.value)}
                  placeholder="Share your thoughts, ask questions, or discuss approaches..."
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm min-h-20 resize-none"
                  maxLength={1000}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{newDiscussion.length}/1000</span>
                  <Button
                    onClick={handleCreateDiscussion}
                    disabled={creatingDiscussion || !newDiscussion.trim()}
                    size="sm"
                    className="bg-[#22c55e] text-black hover:bg-[#22c55e]/90"
                  >
                    {creatingDiscussion ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Post
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {discussions.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Community Discussions</h3>
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1" />
                  {discussions.length} posts
                </Badge>
              </div>
              {discussions.map((discussion) => (
                <Card key={discussion.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-[#22c55e]/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-[#22c55e]"> 
                          {discussion.user?.username?.[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{discussion.user?.username || "Anonymous"}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(discussion.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {canDeletePost(discussion.userId) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDiscussion(discussion.id)}
                              disabled={deletingDiscussionId === discussion.id}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            >
                              {deletingDiscussionId === discussion.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{discussion.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : userAttempted ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Discussions Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Be the first to start a discussion!
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Attempt the problem to unlock discussions
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
