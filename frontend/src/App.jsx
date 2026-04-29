import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import WordsBackground from "./components/WordsBackground";
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
import RuleManager from "./pages/admin/RuleManager";
import ProductAnalytics from "./pages/admin/ProductAnalytics";
import TeacherPanel from "./pages/TeacherPanel";
import LinkTest from "./pages/LinkTest";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Reference from "./pages/Reference";

function AppInner() {
  const location = useLocation();
  const showBg = location.pathname === "/login" || location.pathname === "/register";
  return (
    <>
      {showBg && <WordsBackground />}
      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/catalog" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/test/:id" element={<Pad><TestPage /></Pad>} />
          <Route path="/result/:id" element={<Pad><ResultPage /></Pad>} />
          <Route path="/history" element={<Pad><History /></Pad>} />
          <Route path="/analytics" element={<Pad><Analytics /></Pad>} />
          <Route path="/admin" element={<Pad><AdminPanel /></Pad>} />
          <Route path="/admin/tests" element={<Pad wide><TestConstructor /></Pad>} />
          <Route path="/admin/users" element={<Pad wide><UserManager /></Pad>} />
          <Route path="/admin/rules" element={<Pad wide><RuleManager /></Pad>} />
          <Route path="/admin/product-analytics" element={<Pad wide><ProductAnalytics /></Pad>} />
          <Route path="/teacher" element={<Pad wide><TeacherPanel /></Pad>} />
          <Route path="/link/:token" element={<Pad><LinkTest /></Pad>} />
          <Route path="/notifications" element={<Pad><Notifications /></Pad>} />
          <Route path="/profile" element={<Pad><Profile /></Pad>} />
          <Route path="/reference" element={<Pad wide><Reference /></Pad>} />
        </Routes>
      </div>
    </>
  );
}

export default function App() {
  return <BrowserRouter><AppInner /></BrowserRouter>;
}

function Pad({ children, wide }) {
  return (
    <div style={{ maxWidth: wide ? 1100 : 720, margin: "0 auto", padding: "2.5rem 2rem" }}>
      {children}
    </div>
  );
}
