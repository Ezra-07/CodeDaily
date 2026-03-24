import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.jsx";
import { Input } from "../components/ui/input.jsx";
import { Button } from "../components/ui/button.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { CheckCircle2, Circle, Loader2, Trophy, Search, ChevronLeft, ChevronRight } from "lucide-react";

const PROBLEMS_PER_PAGE = 10;

export default function DashboardPage() {
  const [problems, setProblems] = useState([]);
  const [solvedCount, setSolvedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [solvedSlugs, setSolvedSlugs] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch problems
        const problemsRes = await api.get("/problems");
        const problemsList = problemsRes.data.problems || [];
        setProblems(problemsList);

        // Fetch user submissions to calculate solved count
        try {
          const submissionsRes = await api.get("/submission/me");
          const submissions = submissionsRes.data?.submissions || [];
          // Get unique accepted problem slugs
          const acceptedSlugs = new Set(
            submissions
              .filter((s) => s.verdict === "Accepted")
              .map((s) => s.problem?.slug)
              .filter(Boolean)
          );
          setSolvedSlugs(acceptedSlugs);
          setSolvedCount(acceptedSlugs.size);
        } catch {
          // User might not be logged in, ignore
          setSolvedCount(0);
        }
      } catch (err) {
        console.error("Failed to fetch problems:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRowClick = (slug) => {
    navigate(`/problems/${slug}`);
  };

  // Filter problems based on search query
  const filteredProblems = useMemo(() => {
    if (!searchQuery.trim()) return problems;
    const query = searchQuery.toLowerCase();
    return problems.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.slug.toLowerCase().includes(query)
    );
  }, [problems, searchQuery]);

  // Paginate problems
  const totalPages = Math.ceil(filteredProblems.length / PROBLEMS_PER_PAGE);
  const paginatedProblems = useMemo(() => {
    const start = (currentPage - 1) * PROBLEMS_PER_PAGE;
    return filteredProblems.slice(start, start + PROBLEMS_PER_PAGE);
  }, [filteredProblems, currentPage]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#22c55e]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="text-2xl font-bold">Problems</CardTitle>
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search problems..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              {/* Stats */}
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-[#22c55e]" />
                <span className="text-muted-foreground">Solved:</span>
                <span className="font-bold text-[#22c55e]">{solvedCount}</span>
                <span className="text-muted-foreground">/</span>
                <span className="font-medium">{problems.length}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Status</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-32">Difficulty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProblems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    {searchQuery ? "No problems match your search" : "No problems available"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProblems.map((problem, index) => {
                  const isSolved = solvedSlugs.has(problem.slug);
                  const actualIndex = (currentPage - 1) * PROBLEMS_PER_PAGE + index;
                  return (
                    <TableRow
                      key={problem.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(problem.slug)}
                    >
                      <TableCell>
                        {isSolved ? (
                          <CheckCircle2 className="h-5 w-5 text-[#22c55e]" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {actualIndex + 1}. {problem.title}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${problem.difficulty === "Easy"
                              ? "bg-[#22c55e]/10 text-[#22c55e]"
                              : problem.difficulty === "Medium"
                                ? "bg-yellow-500/10 text-yellow-500"
                                : "bg-red-500/10 text-red-500"
                            }`}
                        >
                          {problem.difficulty || "Medium"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * PROBLEMS_PER_PAGE + 1} to{" "}
                {Math.min(currentPage * PROBLEMS_PER_PAGE, filteredProblems.length)} of{" "}
                {filteredProblems.length} problems
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}