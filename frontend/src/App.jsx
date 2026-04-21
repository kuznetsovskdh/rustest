import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Catalog from "./pages/Catalog";
import TestPage from "./pages/TestPage";
import ResultPage from "./pages/ResultPage";
import History from "./pages/History";
import Analytics from "./pages/Analytics";
import AdminPanel from "./pages/admin/AdminPanel";
import TestConstructor from "./pages/admin/TestConstructor";
import UserManager from "./pages/admin/UserManager";
import TeacherPanel from "./pages/TeacherPanel";
import LinkTest from "./pages/LinkTest";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem" }}>
        <Routes>
          <Route path="/" element={<Navigate to="/catalog" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/test/:id" element={<TestPage />} />
          <Route path="/result/:id" element={<ResultPage />} />
          <Route path="/history" element={<History />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin/tests" element={<TestConstructor />} />
          <Route path="/admin/users" element={<UserManager />} />
          <Route path="/teacher" element={<TeacherPanel />} />
          <Route path="/link/:token" element={<LinkTest />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
