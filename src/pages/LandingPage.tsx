// src/pages/LandingPage.tsx
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div
      className="relative w-full h-screen bg-cover bg-center"
      style={{ backgroundImage: `url('/plant-bg.jpg')` }} // Place your image in public/
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
        <div className="text-center text-white px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
            Plan Your Trip, Save the Planet 🌱
          </h1>
          <p className="text-lg md:text-xl mb-8 drop-shadow-md">
            Travel smarter. Calculate your carbon emissions and offset them instantly.
          </p>
          <button
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-full shadow-lg"
            onClick={() => navigate("/plan")}
          >
            Start Planning
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
