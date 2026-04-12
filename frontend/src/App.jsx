import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Catalog from "./pages/Catalog";
import TestPage from "./pages/TestPage";
import ResultPage from "./pages/ResultPage";
import History from "./pages/History";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem" }}>
        <Routes>
          <Route path="/" element={<Navigate to="/catalog" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/test/:id" element={<TestPage />} />
          <Route path="/result/:id" element={<ResultPage />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
