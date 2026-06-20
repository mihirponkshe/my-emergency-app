// pages/index.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  // State to handle showing/hiding the splash screen
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Simulate loading/animation time (e.g., 3 seconds).
    // After that, hide the splash screen and show the main homepage.
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000); // 3000ms = 3s

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    // SPLASH SCREEN
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-500 overflow-hidden">
        {/* Splash Container */}
        <div className="flex flex-col items-center justify-center">
          {/* Enlarged Logo with animation */}
          <img
            src="/logo.png"
            alt="Resq'd Logo"
            className="w-48 h-48 animate-pulse transform transition-transform duration-700"
          />
          <p className="mt-4 text-white font-bold text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  // MAIN HOMEPAGE CONTENT (after splash finishes)
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-red-300 to-red-400 flex items-center justify-center overflow-hidden">
      {/* Main Content Container */}
      <div className="container mx-auto px-6 py-10 flex flex-col-reverse md:flex-row items-center justify-between relative z-10">
        
        {/* Left Text Section */}
        <div className="md:w-1/2 text-center md:text-left mt-8 md:mt-0">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Welcome to Emergency Response System
          </h1>
          <p className="text-lg md:text-xl text-gray-50 mb-6">
            Your trusted partner in critical times.
          </p>

          {/* Brief Bulleted List of Features */}
          <ul className="list-disc list-inside text-left text-gray-100 text-base md:text-lg mb-8">
            <li>Report emergencies instantly</li>
            <li>Request ambulance, police, or fire services</li>
            <li>Track help in real-time</li>
          </ul>

          <button
            onClick={() => router.push('/auth')}
            className="inline-block px-8 py-3 bg-red-500 text-white font-semibold rounded-full shadow-md hover:bg-red-600 transition transform hover:scale-105"
          >
            Get Started
          </button>
        </div>

        {/* Right Image Section */}
        <div className="md:w-1/2 flex justify-center">
          <img
            src="/homepage.jpg"
            alt="Emergency Personnel"
            className="w-full max-w-sm h-auto object-contain shadow-2xl rounded-lg"
          />
        </div>
      </div>

      {/* Decorative Wave at the Bottom */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] rotate-180">
        <svg
          className="relative block w-[calc(100%+1.3px)] h-40"
          viewBox="0 0 500 150"
          preserveAspectRatio="none"
        >
          <path
            d="M0.00,49.98 C150.00,150.00 271.55,-50.01 500.00,49.98 L500.00,150.00 L0.00,150.00 Z"
            fill="#ffffff"
          />
        </svg>
      </div>
    </div>
  );
}
