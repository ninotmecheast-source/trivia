import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TriviaGame from "./TriviaGame";
import UpdateRSS from "./UpdateRSS";
import Admin from "./Admin"; // ✅ new
import NewsPage from "./pages/NewsPage";
import StockTrading from "./StockTrading";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TriviaGame />} />
        <Route path="/update-rss" element={<UpdateRSS />} />
        <Route path="/rss" element={<UpdateRSS />} />
        <Route path="/admin" element={<Admin />} /> {/* ✅ new route */}
        <Route path="/news" element={<NewsPage />} />
        <Route path="/StockTrading" element={<StockTrading />} />
      </Routes>
    </Router>
  );
}
