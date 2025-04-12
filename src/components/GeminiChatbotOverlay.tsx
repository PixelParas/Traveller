import { useEffect, useRef, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { marked } from "marked";
import { motion } from "framer-motion"; // Import Framer Motion

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const tripQuestions = [
  "What destination are you planning to visit?",
  "When do you want to travel and for how long?",
  "Who are you traveling with (solo, family, friends, etc.)?",
  "What's your total budget for this trip?",
  "What experiences are you hoping for (adventure, relaxation, culture, etc.)?",
  "Do you prefer cities, nature, or a mix of both?",
  "Are there any specific attractions or sites you want to visit?",
  "Do you have any accessibility needs or physical limitations?",
  "Do you prefer a packed schedule or relaxed pace?",
  "What kind of transportation do you prefer during the trip?",
];

export default function GeminiChatbot({
  onClose,
  onTripJsonReady,
}: {
  onClose: () => void;
  onTripJsonReady: (json: any) => void;
}) {
  const [chat, setChat] = useState<{ from: "user" | "bot"; text: string }[]>([]);
  const [userInput, setUserInput] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (questionIndex === 0) {
      setChat([{ from: "bot", text: tripQuestions[0] }]);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const askNextQuestion = async (updatedAnswers: string[]) => {
    if (questionIndex < tripQuestions.length - 1) {
      const next = tripQuestions[questionIndex + 1];
      setChat((prev) => [...prev, { from: "bot", text: next }]);
      setQuestionIndex((i) => i + 1);
    } else {
      const qaString = tripQuestions
        .map((q, i) => `Q: ${q}\nA: ${updatedAnswers[i]}`)
        .join("\n");

      const prompt = `
Based on the following trip planning Q&A. make sure each day has at least 2-4 activites if relaxed and 4-5 if packed
DO NOT overexplain or add unnecessary info. Only mention destinations which will be available on google Maps and give me their exact location.
Include:

1. A readable version (for user).
2. A JSON version formatted as:
\`\`\`json
{
  "days": [
    { "day": 1, "stops": ["Place 1", "Place 2"] },
    { "day": 2, "stops": ["Place 3", "Place 4"] }
  ]
}
\`\`\`

Q&A:
${qaString}
    `.trim();

      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const split = text.split("```json");
        const humanReadable = split[0].trim();
        const jsonRaw = split[1]?.replace("```", "").trim() ?? "{}";
        const parsedJson = JSON.parse(jsonRaw);

        onTripJsonReady(parsedJson);

        // Add human-readable text to the chat
        setChat((prev) => [
          ...prev,
          { from: "bot", text: humanReadable }, // Render human-readable text
        ]);

        // Debugging: Add JSON as a string to the chat (optional)
        setChat((prev) => [
          ...prev,
          { from: "bot", text: `Generated JSON: ${JSON.stringify(parsedJson, null, 2)}` },
        ]);

        console.log("Parsed JSON:", parsedJson);
      } catch (e) {
        console.error("Failed to parse trip JSON", e);
        setChat((prev) => [
          ...prev,
          {
            from: "bot",
            text: "Oops! I couldn't generate your itinerary. Try again later.",
          },
        ]);
      }
    }
  };

  const handleSend = () => {
    if (!userInput.trim()) return;
    const newAnswers = [...answers, userInput];
    setAnswers(newAnswers);
    setChat((prev) => [...prev, { from: "user", text: userInput }]);
    setUserInput("");
    askNextQuestion(newAnswers);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex justify-center items-center">
      <div className="w-full max-w-2xl h-[85vh] bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Trip Planner</h2>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
          {chat.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.from === "bot" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`prose prose-sm p-3 max-w-[75%] text-sm rounded-2xl ${
                  msg.from === "bot"
                    ? "bg-gray-200 text-gray-800 rounded-bl-sm"
                    : "bg-blue-600 text-white rounded-br-sm"
                }`}
                dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}
              />
            </motion.div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t flex gap-2">
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your answer..."
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button onClick={handleSend}>Send</Button>
        </div>
      </div>
    </div>
  );
}
