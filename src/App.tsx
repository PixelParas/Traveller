import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PlanningPage from "./pages/PlanningPage";
import LandingPage from "./pages/LandingPage";
import GeminiChatbot from "./components/GeminiChatbotOverlay";
import { CarbonImpactModal } from "./components/CarbonImpactModal";

function App() {
  const [showChatbot, setShowChatbot] = useState(false);
  const [emissions, setEmissions] = useState(false);
  const [importedTripPlan, setImportedTripPlan] = useState<{ days: { stops: string[] }[] }>({ days: [] });
  useEffect(() => {
    console.log("Emissions state:", emissions);
  }, [emissions]);
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/plan"
          element={
            <div className="w-full h-full relative">
              {/* Planning Page */}
              <PlanningPage
                onOpenChatbot={() => setShowChatbot(true)}
                onOpenEmissions={() => setEmissions(true)}
                importedTripPlan={importedTripPlan}
              />

              {/* Gemini Chatbot */}
              {showChatbot && (
                <GeminiChatbot
                  onClose={() => setShowChatbot(false)}
                  onTripJsonReady={(tripJson) => {
                    setImportedTripPlan(tripJson);
                    setShowChatbot(false);
                  }}
                />
              )}

              {/* Carbon Impact Modal */}
              {emissions && (
  <CarbonImpactModal
    isOpen={emissions}
    onClose={() => setEmissions(false)}
    tripPlan={importedTripPlan}
  />
)}
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;