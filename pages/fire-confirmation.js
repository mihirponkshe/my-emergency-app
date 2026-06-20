// pages/service/fire-confirmation.js
import { useRouter } from "next/router";
import { useState } from "react";
import { FaFire } from "react-icons/fa";

export default function FireConfirmation() {
  const router = useRouter();
  const [showChatbot, setShowChatbot] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-8 relative">
      <div className="bg-white shadow-lg rounded-lg p-8 text-center">
        {/* Centered Fire Icon */}
        <div className="flex justify-center mb-4">
          <FaFire className="text-red-500 text-6xl" />
        </div>
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Fire Incident Reported
        </h1>
        {/* Message */}
        <p className="text-gray-600 mb-6">
          The nearest fire brigade has been notified and is on its way. Please follow safety guidelines and await further instructions.
        </p>
        {/* Back to Home Button */}
        <button
          onClick={() => router.push("/userProfile")}
          className="bg-red-500 text-white py-3 px-6 rounded-full font-semibold hover:bg-red-600 transition"
        >
          Back to Home
        </button>
      </div>

      {/* Chatbot Popup Modal */}
      {showChatbot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-4 rounded-lg relative w-11/12 md:w-1/2 lg:w-1/3">
            <button
              onClick={() => setShowChatbot(false)}
              className="absolute top-2 right-2 text-gray-500 text-2xl"
              aria-label="Close Chatbot"
            >
              &times;
            </button>
            <iframe
              src="/Chatbot/Chatbot/public/index.html"
              title="Emergency Assistance Chatbot"
              width="100%"
              height="500px"
              style={{ border: "none" }}
            />
          </div>
        </div>
      )}

      {/* Animated Chat Trigger Button (position adjusted inward) */}
      <button
        onClick={() => setShowChatbot(true)}
        className="fixed bottom-6 right-8 bg-blue-600 text-white rounded-full p-3 shadow-lg z-50 hover:bg-blue-700 transition transform hover:scale-105 animate-pulse"
        aria-label="Open Chatbot"
      >
        Chat with us
      </button>

      {/* Logo at the Bottom (moved further down with increased top margin) */}
      <div className="mt-20 text-center flex justify-center">
        <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain" />
        </div>
      </div>
    </div>
  );
}
