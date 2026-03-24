import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore.js";
import { useTheme } from "./ThemeProvider.jsx";
import { Button } from "./ui/button.jsx";
import { Moon, Sun, Code2, LogOut, LayoutDashboard, Plus, Loader2, User } from "lucide-react";

export default function Navbar() {
  const { authUser, logout, isCheckingAuth } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // While checking auth, render minimal placeholder (no spinner) to prevent flicker
  if (isCheckingAuth) {
    return (
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center px-4">
          <Link to="/" className="flex items-center gap-2 mr-6">
            <Code2 className="h-6 w-6 text-[#22c55e]" />
            <span className="font-bold text-lg tracking-tight">CodeDaily</span>
          </Link>
          <div className="flex-1" />
          {/* Empty placeholder - no spinner here */}
          <div className="h-9 w-20" />
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mr-6">
          <Code2 className="h-6 w-6 text-[#22c55e]" />
          <span className="font-bold text-lg tracking-tight">CodeDaily</span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>

          {authUser ? (
            <>
              {/* User Profile - Clickable */}
              <div
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{authUser.username}</span>
              </div>

              {/* Dashboard Link */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>

              {/* Create Problem (Admin Only) */}
              {authUser.role === "ADMIN" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => navigate("/admin/create-problem")}
                >
                  <Plus className="h-4 w-4" />
                  Create Problem
                </Button>
              )}

              {/* Logout */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <>
              {/* Login Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/login")}
              >
                Login
              </Button>

              {/* Signup Button */}
              <Button
                size="sm"
                onClick={() => navigate("/signup")}
                className="bg-[#22c55e] text-black hover:bg-[#22c55e]/90"
              >
                Signup
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}