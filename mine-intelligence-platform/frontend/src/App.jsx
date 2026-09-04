import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { MainLayout } from "./layouts/MainLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Assistant } from "./pages/Assistant";
import { Production } from "./pages/Production";
import { Reports } from "./pages/Reports";
import { Documents } from "./pages/Documents";
import { Geology } from "./pages/Geology";
import { Anomalies } from "./pages/Anomalies";
import { Forecast } from "./pages/Forecast";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/production" element={<Production />} />
            <Route path="/anomalies" element={<Anomalies />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/geology" element={<Geology />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
