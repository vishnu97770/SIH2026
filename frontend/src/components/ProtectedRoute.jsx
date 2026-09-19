import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute() {
  const { isLoggedIn, authLoading } = useAuth();
  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-stone-950 text-sm text-stone-400">Loading...</div>;
  }
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
