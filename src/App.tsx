import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Providers, useAuth } from "./contexts/AppContexts";
import { AppLayout } from "./layouts/AppLayout";
import { Landing } from "./pages/Landing";
import { Login, Register, JoinRoom } from "./pages/AuthPages";
import { Dashboard } from "./pages/Dashboard";
import { Rooms } from "./pages/Rooms";
import { Team } from "./pages/Team";
import { Cues } from "./pages/Cues";
import { Settings } from "./pages/Settings";
import { WorshipRoom } from "./pages/WorshipRoom";
import { MasterUsers, RoleManagement } from "./pages/AdminPages";
import { Songs } from "./pages/Songs";
function ProtectedApp() {
  const { user } = useAuth();
  return user && localStorage.getItem("sahata-token") ? <AppLayout /> : <Navigate to="/login" replace />;
}
function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user?.role === "Admin Gereja" ? children : <Navigate to="/dashboard" replace />;
}
function DirectorOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user?.role !== "Member" ? children : <Navigate to="/dashboard" replace />;
}
export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/join" element={<JoinRoom />} />
          <Route path="/room/:id" element={<WorshipRoom />} />
          <Route element={<ProtectedApp />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/team" element={<DirectorOnly><Team /></DirectorOnly>} />
            <Route path="/cues" element={<DirectorOnly><Cues /></DirectorOnly>} />
            <Route path="/songs" element={<DirectorOnly><Songs /></DirectorOnly>} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/master-users" element={<AdminOnly><MasterUsers /></AdminOnly>} />
            <Route path="/role-management" element={<AdminOnly><RoleManagement /></AdminOnly>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </Providers>
  );
}
