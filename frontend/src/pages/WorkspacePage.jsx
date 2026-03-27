import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import ReactMarkdown from 'react-markdown';
import api from "../lib/api.js";
import { useTheme } from "../components/ThemeProvider.jsx";
import { Button } from "../components/ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.jsx";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../components/ui/resizable.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { Play, Send, Loader2, CheckCircle2, XCircle, Clock, Trophy, MessageSquare, Plus, Trash2, RotateCcw, Type } from "lucide-react";

export default function WorkspacePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState(() => {
    if (slug) {
      const saved = localStorage.getItem(`code_${slug}`);
      if (saved) return saved;
    }
    return "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runResults, setRunResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("description");
  const { addToast } = useToast();
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem("editor_font_size");
    return saved ? parseInt(saved, 10) : 14;
  });
  const [customTestCases, setCustomTestCases] = useState(() => {
    const saved = localStorage.getItem(`custom_test_cases_${slug}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [testCaseOutputs, setTestCaseOutputs] = useState({});
  const codeSaveTimeoutRef = useRef(null);

  useEffect(() => {
    if (codeSaveTimeoutRef.current) {
      clearTimeout(codeSaveTimeoutRef.current);
    }
    codeSaveTimeoutRef.current = setTimeout(() => {
      if (slug && code) {
        localStorage.setItem(`code_${slug}`, code);
      }
    }, 500);
    return () => {
      if (codeSaveTimeoutRef.current) {
        clearTimeout(codeSaveTimeoutRef.current);
      }
    };
  }, [code, slug]);

  useEffect(() => {
    if (slug && customTestCases) {
      localStorage.setItem(`custom_test_cases_${slug}`, JSON.stringify(customTestCases));
    }
  }, [customTestCases, slug]);

  const handleResetCode = () => {
    const defaultCode = "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}";
    setCode(defaultCode);
    if (slug) {
      localStorage.removeItem(`code_${slug}`);
    }
    addToast("Code reset to default", "info");
  };

  const addCustomTestCase = () => {
    if (customTestCases.length >= 5) {
      addToast("Maximum 5 custom test cases allowed", "warning");
      return;
    }
    setCustomTestCases([...customTestCases, { input: "", output: "" }]);
  };

  const removeCustomTestCase = (index) => {
    setCustomTestCases(customTestCases.filter((_, i) => i !== index));
  };

  const updateCustomTestCase = (index, field, value) => {
    const updated = [...customTestCases];
    updated[index][field] = value;
    setCustomTestCases(updated);
  };

  const runCustomTestCase = async (index) => {
    const tc = customTestCases[index];
    if (!tc.input.trim() || !problem) return;

    setIsRunning(true);
    try {
      const response = await api.post("/submission/run", {
        problemId: problem.id,
        code,
        language: "cpp",
        customInput: tc.input,
      });

      setTestCaseOutputs({
        ...testCaseOutputs,
        [index]: response.data.output || "No output",
      });
    } catch (err) {
      console.error("Run error:", err);
      addToast("Failed to run custom test case", "error");
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    const fetchProblem = async () => {
      if (!slug) {
        setError("Invalid problem URL");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/problems/${slug}`);

        if (response.data?.problem) {
          setProblem(response.data.problem);
        } else {
          setError("Problem not found");
        }
      } catch (err) {
        console.error("Failed to fetch problem:", err);
        setError(err.response?.data?.error || "Failed to load problem");
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [slug]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!problem?.id || activeTab !== "leaderboard") return;

      try {
        setLeaderboardLoading(true);
        const response = await api.get(`/submission/leaderboard/${problem.id}`);
        setLeaderboard(response.data?.leaderboard || []);
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
        setLeaderboard([]);
      } finally {
        setLeaderboardLoading(false);
      }
    };

    fetchLeaderboard();
  }, [problem?.id, activeTab]);

  const pollSubmission = useCallback(async (submissionId) => {
    const poll = async () => {
      try {
        const response = await api.get(`/submission/${submissionId}/status`);
        const submission = response.data?.submission;
        const verdict = submission?.verdict;

        if (verdict && verdict !== "Pending") {
          setSubmissionResult(submission);
          setIsPolling(false);
          if (verdict === "Accepted") {
            addToast("Congratulations! Solution Accepted!", "success");
          } else if (verdict === "Wrong Answer") {
            addToast("Wrong Answer - Check your logic and try again", "warning");
          } else if (verdict === "Time Limit Exceeded") {
            addToast("Time Limit Exceeded - Your solution is too slow", "warning");
          } else if (verdict === "Compilation Error") {
            addToast("Compilation Error - Check your code syntax", "error");
          } else {
            addToast(`${verdict} - Please check your solution`, "error");
          }
          return;
        }

        setTimeout(poll, 1000);
      } catch (err) {
        console.error("Polling error:", err);
        setIsPolling(false);
      }
    };

    poll();
  }, [addToast]);

  const handleSubmit = async () => {
    if (!problem) return;

    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      const response = await api.post("/submission", {
        problemId: problem.id,
        code,
        language: "cpp",
      });

      const { submissionId } = response.data;
      setIsPolling(true);
      addToast("Submission queued! Judging in progress...", "info");
      pollSubmission(submissionId);
    } catch (err) {
      console.error("Submission error:", err);
      addToast("Failed to submit. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRun = async () => {
    if (!problem) return;

    setIsRunning(true);
    setRunResults(null);

    try {
      const response = await api.post("/submission/run", {
        problemId: problem.id,
        code,
        language: "cpp",
      });

      setRunResults(response.data);

      if (response.data.status === "Accepted") {
        addToast("All test cases passed!", "success");
      } else if (response.data.status === "Compilation Error") {
        addToast("Compilation Error - Check your code syntax", "error");
      } else {
        addToast(`${response.data.passedCount}/${response.data.totalCount} test cases passed`, "info");
      }
    } catch (err) {
      console.error("Run error:", err);
      addToast("Failed to run code. Please try again.", "error");
    } finally {
      setIsRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#22c55e]" />
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Problem Not Found</h2>
            <p className="text-muted-foreground">{error || "The requested problem could not be loaded."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-hidden">
      <ResizablePanelGroup orientation="horizontal" className="h-full">

        <ResizablePanel defaultSize={40} minSize={30}>
          <div className="h-full flex flex-col bg-card">
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("description")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === "description"
                    ? "border-b-2 border-[#22c55e] text-[#22c55e]"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Description
              </button>
              <button
                onClick={() => setActiveTab("leaderboard")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === "leaderboard"
                    ? "border-b-2 border-[#22c55e] text-[#22c55e]"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Trophy className="h-4 w-4 inline mr-2" />
                Leaderboard
              </button>
              <button
                onClick={() => navigate(`/community/${slug}`)}
                className="flex-1 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageSquare className="h-4 w-4 inline mr-2" />
                Community
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar p-6">
              {activeTab === "description" ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold">{problem.title}</h1>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${problem.difficulty === "Easy"
                          ? "bg-[#22c55e]/10 text-[#22c55e]"
                          : problem.difficulty === "Medium"
                            ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-red-500/10 text-red-500"
                        }`}
                    >
                      {problem.difficulty || "Medium"}
                    </span>
                  </div>

                  {problem.stats && (
                    <div className="flex gap-4 mb-6 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Submissions:</span>
                        <span className="font-medium">{problem.stats.totalSubmissions}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Accepted:</span>
                        <span className="font-medium text-[#22c55e]">{problem.stats.acceptedSubmissions}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Success Rate:</span>
                        <span className="font-medium">
                          {problem.stats.totalSubmissions > 0
                            ? Math.round((problem.stats.acceptedSubmissions / problem.stats.totalSubmissions) * 100)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="prose dark:prose-invert max-w-none prose-slate mb-6">
                    <ReactMarkdown>{problem.description}</ReactMarkdown>
                  </div>

                  {problem.testCases && problem.testCases.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Example Test Cases</h3>
                      {problem.testCases.map((tc, index) => (
                        <Card key={index} className="bg-secondary/50">
                          <CardContent className="p-4 space-y-2">
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Input:</span>
                              <pre className="mt-1 p-2 bg-background rounded text-sm font-mono">
                                {tc.input}
                              </pre>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Output:</span>
                              <pre className="mt-1 p-2 bg-background rounded text-sm font-mono">
                                {tc.expectedOutput}
                              </pre>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-[#22c55e]" />
                    Leaderboard
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Top 20 accepted submissions sorted by execution time
                  </p>

                  {leaderboardLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No submissions yet. Be the first to solve this problem!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {leaderboard.map((entry, index) => (
                        <Card key={entry.id ?? `${entry.user?.username || "unknown"}-${index}`} className="bg-secondary/30">
                          <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0
                                    ? "bg-yellow-500/20 text-yellow-500"
                                    : index === 1
                                      ? "bg-gray-400/20 text-gray-400"
                                      : index === 2
                                        ? "bg-orange-500/20 text-orange-500"
                                        : "bg-muted text-muted-foreground"
                                  }`}
                              >
                                {index + 1}
                              </span>
                              <span className="font-medium">{entry.user?.username || "Anonymous"}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[#22c55e] font-mono text-sm">
                                {entry.executionTimeMs} ms
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-border/70 hover:bg-[#22c55e]/50 transition-colors" />

        <ResizablePanel defaultSize={60} minSize={40}>
          <ResizablePanelGroup orientation="vertical" className="h-full">

            <ResizablePanel defaultSize={70} minSize={20}>
              <div className="h-full flex flex-col bg-card overflow-hidden">

                <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border overflow-hidden">
                  <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                    <span className="text-sm font-medium px-2 truncate">main.cpp</span>
                    <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newSize = Math.max(10, fontSize - 2);
                          setFontSize(newSize);
                          localStorage.setItem("editor_font_size", newSize.toString());
                        }}
                        className="h-6 w-6"
                      >
                        <span className="text-xs font-bold">-</span>
                      </Button>
                      <div className="flex items-center gap-1 px-1">
                        <Type className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs w-4 text-center font-medium">{fontSize}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newSize = Math.min(24, fontSize + 2);
                          setFontSize(newSize);
                          localStorage.setItem("editor_font_size", newSize.toString());
                        }}
                        className="h-6 w-6"
                      >
                        <span className="text-xs font-bold">+</span>
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetCode}
                      className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRun}
                      disabled={isRunning || isSubmitting}
                      className="gap-2"
                    >
                      {isRunning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Run
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={isSubmitting || isPolling}
                      className="gap-2 bg-[#22c55e] text-black hover:bg-[#22c55e]/90"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Submit
                    </Button>
                  </div>
                </div>

                <div className="flex-1 relative min-h-0">
                  <div className="absolute inset-0">
                    <Editor
                      height="100%"
                      language="cpp"
                      value={code}
                      onChange={(value) => setCode(value || "")}
                      theme={theme === "dark" ? "vs-dark" : "light"}
                      options={{
                        minimap: { enabled: false },
                        fontSize: fontSize,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 16 },
                        scrollbar: {
                          vertical: "hidden",
                          horizontal: "hidden",
                          verticalScrollbarSize: 0,
                          horizontalScrollbarSize: 0,
                          alwaysConsumeMouseWheel: false,
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-border/70 hover:bg-[#22c55e]/50 transition-colors" />

            <ResizablePanel defaultSize={30} minSize={20}>
              <div className="h-full flex flex-col bg-card border-t border-border overflow-hidden">

                <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-foreground">Test Cases</span>
                    <div className="flex gap-1">
                      {problem?.testCases?.filter(tc => !tc.isHidden).length > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-secondary rounded-full text-muted-foreground">
                          {problem.testCases.filter(tc => !tc.isHidden).length} provided
                        </span>
                      )}
                      {customTestCases.length > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-[#22c55e]/10 text-[#22c55e] rounded-full">
                          {customTestCases.length} custom
                        </span>
                      )}
                    </div>
                    {runResults && (
                      <div className="flex items-center gap-2 ml-2 pl-3 border-l border-border">
                        {runResults.status === "Accepted" ? (
                          <span className="flex items-center gap-1 text-xs text-[#22c55e] font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {runResults.passedCount}/{runResults.totalCount}
                          </span>
                        ) : runResults.status === "Compilation Error" ? (
                          <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                            <XCircle className="h-3.5 w-3.5" />
                            Error
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                            <XCircle className="h-3.5 w-3.5" />
                            {runResults.passedCount}/{runResults.totalCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addCustomTestCase}
                    disabled={customTestCases.length >= 5}
                    className="h-7 gap-1.5 text-xs border-dashed"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Custom
                  </Button>
                </div>

                {runResults?.status === "Compilation Error" && runResults.detail && (
                  <div className="shrink-0 px-4 py-2 bg-red-500/10 border-b border-red-500/20">
                    <p className="text-xs text-red-500 font-mono">{runResults.detail}</p>
                  </div>
                )}

                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar">

                  {submissionResult && (
                    <div className="mx-4 mt-4 border border-border rounded-lg bg-card">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          {submissionResult.verdict === "Accepted" ? (
                            <>
                              <CheckCircle2 className="h-5 w-5 text-[#22c55e]" />
                              <span className="text-[#22c55e]">Accepted</span>
                            </>
                          ) : submissionResult.verdict === "Pending" ? (
                            <>
                              <Clock className="h-5 w-5 text-yellow-500" />
                              <span className="text-yellow-500">Pending</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-5 w-5 text-red-500" />
                              <span className="text-red-500">{submissionResult.verdict}</span>
                            </>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-3 pt-0">
                        <div className="flex gap-6 text-sm">
                          {submissionResult.executionTimeMs !== null && (
                            <div>
                              <span className="text-muted-foreground">Runtime: </span>
                              <span className="font-medium">{submissionResult.executionTimeMs} ms</span>
                            </div>
                          )}
                          {submissionResult.memoryUsedKb !== null && (
                            <div>
                              <span className="text-muted-foreground">Memory: </span>
                              <span className="font-medium">{submissionResult.memoryUsedKb} KB</span>
                            </div>
                          )}
                        </div>
                        {submissionResult.detail && (
                          <div className="mt-3 p-3 bg-destructive/10 rounded text-sm text-destructive">
                            {submissionResult.detail}
                          </div>
                        )}
                      </CardContent>
                    </div>
                  )}

                  {customTestCases.length > 0 && (
                    <div className="p-4 border-b border-border bg-[#22c55e]/5">
                      <h4 className="text-xs font-semibold text-[#22c55e] mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                        Custom Test Cases ({customTestCases.length}/5)
                      </h4>
                      <div className="space-y-3">
                        {customTestCases.map((tc, index) => (
                          <div key={`custom-${index}`} className="bg-card rounded-lg border border-border overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
                              <span className="text-xs font-medium text-foreground">Custom Input {index + 1}</span>
                              <div className="flex items-center gap-1">
                                {testCaseOutputs[index] && (
                                  <span className="text-[10px] text-[#22c55e] flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Executed
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeCustomTestCase(index)}
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            <div className="p-3 space-y-3">
                              <div>
                                <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1.5 block">
                                  Input
                                </label>
                                <textarea
                                  value={tc.input}
                                  onChange={(e) => updateCustomTestCase(index, "input", e.target.value)}
                                  className="w-full p-2.5 bg-background border border-input rounded-md text-xs font-mono resize-none focus:ring-2 focus:ring-[#22c55e]/20 focus:border-[#22c55e] transition-all"
                                  rows={3}
                                  placeholder="Enter your custom test case input here..."
                                  spellCheck={false}
                                />
                              </div>

                              <Button
                                size="sm"
                                onClick={() => runCustomTestCase(index)}
                                disabled={isRunning || !tc.input.trim()}
                                className="w-full bg-[#22c55e] hover:bg-[#22c55e]/90 text-black text-xs h-8"
                              >
                                {isRunning ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                ) : (
                                  <Play className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                Run Code
                              </Button>

                              {testCaseOutputs[index] && (
                                <div className="mt-2">
                                  <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1.5 block">
                                    Output
                                  </label>
                                  <div className="p-3 bg-secondary/50 rounded-md border border-border">
                                    <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all">
                                      {testCaseOutputs[index]}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {problem?.testCases && problem.testCases.filter(tc => !tc.isHidden).length > 0 && (
                    <div className="p-4">
                      <h4 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                        Provided Test Cases
                      </h4>
                      <div className="space-y-2">
                        {problem.testCases.filter(tc => !tc.isHidden).map((tc, index) => {
                          const runResult = runResults?.testResults?.find(r => r.testCase === index + 1);
                          return (
                            <div
                              key={`provided-${tc.id || index}`}
                              className={`rounded-lg border overflow-hidden transition-colors ${runResult?.passed
                                  ? "bg-[#22c55e]/5 border-[#22c55e]/30"
                                  : runResult
                                    ? "bg-red-500/5 border-red-500/30"
                                    : "bg-card border-border"
                                }`}
                            >
                              <div className={`flex items-center justify-between px-3 py-2 border-b ${runResult?.passed
                                  ? "border-[#22c55e]/20 bg-[#22c55e]/10"
                                  : runResult
                                    ? "border-red-500/20 bg-red-500/10"
                                    : "border-border bg-muted/30"
                                }`}>
                                <span className="text-xs font-medium text-foreground">Test Case {index + 1}</span>
                                {runResult?.passed ? (
                                  <span className="flex items-center gap-1 text-[10px] text-[#22c55e] font-medium">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Passed
                                  </span>
                                ) : runResult ? (
                                  <span className="flex items-center gap-1 text-[10px] text-red-500 font-medium">
                                    <XCircle className="h-3.5 w-3.5" />
                                    Failed
                                  </span>
                                ) : null}
                              </div>

                              <div className="p-3 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium block mb-1">
                                      Input
                                    </span>
                                    <pre className="p-2 bg-secondary/50 rounded text-[11px] font-mono text-foreground overflow-x-auto no-scrollbar">
                                      {tc.input}
                                    </pre>
                                  </div>
                                  <div>
                                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium block mb-1">
                                      Expected
                                    </span>
                                    <pre className="p-2 bg-secondary/50 rounded text-[11px] font-mono text-foreground overflow-x-auto no-scrollbar">
                                      {tc.expectedOutput}
                                    </pre>
                                  </div>
                                </div>
                                {runResult?.actualOutput && (
                                  <div>
                                    <span className={`text-[10px] uppercase tracking-wide font-medium block mb-1 ${runResult.passed ? "text-[#22c55e]" : "text-red-500"
                                      }`}>
                                      Your Output
                                    </span>
                                    <pre className={`p-2 rounded text-[11px] font-mono overflow-x-auto no-scrollbar ${runResult.passed
                                        ? "bg-[#22c55e]/10 text-[#22c55e]"
                                        : "bg-red-500/10 text-red-500"
                                      }`}>
                                      {runResult.actualOutput}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(!problem?.testCases || problem.testCases.filter(tc => !tc.isHidden).length === 0) && customTestCases.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                        <Play className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">No test cases available</p>
                      <p className="text-xs text-muted-foreground mt-1">Add custom test cases to test your code</p>
                    </div>
                  )}

                </div>
              </div>
            </ResizablePanel>

          </ResizablePanelGroup>
        </ResizablePanel>

      </ResizablePanelGroup>
    </div>
  );
}