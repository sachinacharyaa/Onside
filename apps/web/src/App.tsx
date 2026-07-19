import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LivePage } from "./pages/LivePage";
import { ProofPage } from "./pages/ProofPage";
import { RulebookPage } from "./pages/RulebookPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/live" element={<LivePage />} />
      <Route path="/rulebook" element={<RulebookPage />} />
      <Route path="/proof" element={<ProofPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
