import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api.js";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Label } from "../components/ui/label.jsx";
import { Textarea } from "../components/ui/textarea.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.jsx";
import { Alert, AlertDescription } from "../components/ui/alert.jsx";
import { Loader2, Plus, Trash2 } from "lucide-react";

export default function CreateProblemPage() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    difficulty: "Medium",
    testCases: [{ input: "", expectedOutput: "", isHidden: false }],
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTestCaseChange = (index, field, value) => {
    const newTestCases = [...formData.testCases];
    newTestCases[index][field] = value;
    setFormData({ ...formData, testCases: newTestCases });
  };

  const addTestCase = () => {
    setFormData({
      ...formData,
      testCases: [...formData.testCases, { input: "", expectedOutput: "", isHidden: false }],
    });
  };

  const removeTestCase = (index) => {
    if (formData.testCases.length === 1) return;
    const newTestCases = formData.testCases.filter((_, i) => i !== index);
    setFormData({ ...formData, testCases: newTestCases });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validate
    if (!formData.title.trim() || !formData.description.trim()) {
      setError("Title and description are required");
      setIsLoading(false);
      return;
    }

    // Filter out empty test cases
    const validTestCases = formData.testCases.filter(
      (tc) => tc.input.trim() || tc.expectedOutput.trim()
    );

    if (validTestCases.length === 0) {
      setError("At least one test case is required");
      setIsLoading(false);
      return;
    }

    try {
      await api.post("/problems", {
        title: formData.title,
        description: formData.description,
        difficulty: formData.difficulty,
        testCases: validTestCases,
      });

      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create problem. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Create New Problem</CardTitle>
          <CardDescription>
            Create a new coding problem with test cases for the community
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Problem Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Two Sum"
                value={formData.title}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the problem, constraints, and examples..."
                value={formData.description}
                onChange={handleChange}
                required
                disabled={isLoading}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {/* Test Cases */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Test Cases</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    First 2-3 test cases will be shown as examples. Mark others as hidden.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTestCase}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Test Case
                </Button>
              </div>

              {formData.testCases.map((testCase, index) => (
                <Card key={index} className="border-border">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Test Case {index + 1}</span>
                      {formData.testCases.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTestCase(index)}
                          disabled={isLoading}
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs">Input</Label>
                        <Textarea
                          placeholder="Enter input..."
                          value={testCase.input}
                          onChange={(e) =>
                            handleTestCaseChange(index, "input", e.target.value)
                          }
                          disabled={isLoading}
                          rows={3}
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Expected Output</Label>
                        <Textarea
                          placeholder="Enter expected output..."
                          value={testCase.expectedOutput}
                          onChange={(e) =>
                            handleTestCaseChange(index, "expectedOutput", e.target.value)
                          }
                          disabled={isLoading}
                          rows={3}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* Hidden Test Case Toggle */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <input
                        type="checkbox"
                        id={`hidden-${index}`}
                        checked={testCase.isHidden}
                        onChange={(e) =>
                          handleTestCaseChange(index, "isHidden", e.target.checked)
                        }
                        disabled={isLoading}
                        className="h-4 w-4 rounded border-border accent-[#22c55e]"
                      />
                      <Label htmlFor={`hidden-${index}`} className="text-xs cursor-pointer">
                        Hidden test case (not shown to users)
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#22c55e] text-black hover:bg-[#22c55e]/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Problem"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
