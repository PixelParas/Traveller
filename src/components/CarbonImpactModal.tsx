import { useEffect, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { motion } from "framer-motion"; // Import Framer Motion
import { marked } from "marked"; // Import Marked for Markdown support

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tripPlan: Record<string, string[]>;
}

export const CarbonImpactModal = ({ isOpen, onClose, tripPlan }: Props) => {
  const [loading, setLoading] = useState(true);
  const [emissionReport, setEmissionReport] = useState<string>("");

  // Create Gemini model instance
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

  const fetchCarbonReport = async () => {
    setLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `say 
${JSON.stringify(tripPlan, null, 2)}

Break it down by day and route. Use kg CO₂.
Format:
Day 1:
- From A to B: ~X kg CO₂
- From B to C: ~Y kg CO₂
Total for Day 1: ~Z kg CO₂

Day 2:
- From C to D: ~X kg CO₂
Total for Day 2: ~Z kg CO₂

Overall Total: ~N kg CO₂
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const emissionsText = response.text();
      setEmissionReport(emissionsText);
    } catch (err) {
      console.error("Error fetching carbon report:", err);
      setEmissionReport("Failed to fetch carbon report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCarbonReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-2xl font-bold mb-4">🌍 Carbon Emissions Report</h2>

        {loading ? (
          <p className="text-gray-600">Loading data from Gemini...</p>
        ) : (
          <div
            className="prose prose-sm text-gray-800"
            dangerouslySetInnerHTML={{ __html: marked(emissionReport) }} // Render Markdown
          />
        )}

        <button
          className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded"
          onClick={() => alert("Thank you for offsetting your carbon footprint!")}
        >
          🌳 Plant Trees to Offset
        </button>

        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-xl font-bold text-gray-500 hover:text-gray-700"
        >
          &times;
        </button>
      </motion.div>
    </motion.div>
  );
};