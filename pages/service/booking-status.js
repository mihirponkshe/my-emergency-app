// pages/service/booking-status.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

// Helper: get initials from a name (for profile icon)
const getInitials = (name) => {
  if (!name) return "U";
  const words = name.trim().split(" ");
  return words.length === 1
    ? words[0][0].toUpperCase()
    : (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

// Helper: calculate distance (in km) using the Haversine formula
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper: calculate estimated time (in minutes) assuming average speed (40 km/h)
const calculateEstimatedTime = (distanceKm, speedKmh = 40) => {
  if (!distanceKm) return null;
  const minutes = (distanceKm / speedKmh) * 60;
  return Math.round(minutes);
};

export default function BookingStatus() {
  const router = useRouter();
  const auth = getAuth();
  const db = getFirestore();
  const { requestId } = router.query;

  // States
  const [userName, setUserName] = useState("User");
  const [bookingStatus, setBookingStatus] = useState("pending"); // pending, dispatched, enRoutePickup, arrivedPickup, enRouteHospital
  const [userLocation, setUserLocation] = useState(null); // { lat, lon }
  const [hospitalLocation, setHospitalLocation] = useState(null); // { lat, lon }
  const [distance, setDistance] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  
  // State for showing chatbot modal
  const [showChatbot, setShowChatbot] = useState(false);

  // For the status timeline (no longer used, but kept for reference if needed)
  const statusSteps = [
    { key: "pending", label: "Booking Confirmed" },
    { key: "dispatched", label: "Driver Dispatched" },
    { key: "enRoutePickup", label: "Ambulance En Route to Pickup" },
    { key: "arrivedPickup", label: "Ambulance Arrived at Pickup" },
    { key: "enRouteHospital", label: "En Route to Hospital" },
  ];

  const getStepColor = (stepKey) => {
    const order = {
      pending: 1,
      dispatched: 2,
      enRoutePickup: 3,
      arrivedPickup: 4,
      enRouteHospital: 5,
    };
    return order[bookingStatus] >= order[stepKey] ? "bg-green-500" : "bg-gray-400";
  };

  // Fetch booking details from Firestore using requestId
  useEffect(() => {
    const fetchBooking = async () => {
      if (requestId) {
        const bookingSnap = await getDoc(doc(db, "ambulanceRequests", requestId));
        if (bookingSnap.exists()) {
          const bookingData = bookingSnap.data();
          setSelectedHospital(bookingData.hospital || "Unknown Hospital");
          if (bookingData.latitude && bookingData.longitude) {
            setUserLocation({ lat: bookingData.latitude, lon: bookingData.longitude });
          }
          if (bookingData.hospitalLat && bookingData.hospitalLon) {
            setHospitalLocation({ lat: bookingData.hospitalLat, lon: bookingData.hospitalLon });
          } else if (bookingData.hospital) {
            // Geocode the hospital name using Nominatim if coordinates not stored
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
                  bookingData.hospital
                )}&limit=1`
              );
              const data = await res.json();
              if (data && data.length > 0) {
                setHospitalLocation({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
              }
            } catch (err) {
              console.error("Geocoding error:", err);
            }
          }
        }
      }
    };
    fetchBooking();
  }, [requestId, db]);

  // Listen for auth state changes and fetch userName and userLocation from Firestore if available
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        const snapshot = await getDoc(doc(db, "users", uid));
        if (snapshot.exists()) {
          const data = snapshot.data();
          setUserName(data.name || "User");
          if (data.latitude && data.longitude) {
            setUserLocation({ lat: data.latitude, lon: data.longitude });
          }
        } else {
          setUserName(user.displayName || "User");
        }
      }
    });
    return () => unsubscribe();
  }, [auth, db]);

  // Instead of calculating distance from the locations, generate a random distance between 5 and 10 km.
  useEffect(() => {
    if (hospitalLocation && userLocation) {
      const randomDistance = (Math.random() * 5) + 5; // random value between 5 and 10 km
      const randomTime = calculateEstimatedTime(randomDistance);
      setDistance(randomDistance.toFixed(2));
      setEstimatedTime(randomTime);
    }
  }, [hospitalLocation, userLocation]);

  // For map: Use an OpenStreetMap embed showing the route from the hospital to the user.
  const mapSrc =
    hospitalLocation && userLocation
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${userLocation.lon - 0.01},${userLocation.lat + 0.01},${userLocation.lon + 0.01},${userLocation.lat - 0.01}&layer=mapnik&marker=${hospitalLocation.lat},${hospitalLocation.lon}`
      : "";

  // Cancel booking: update Firestore doc status to "cancelled" then navigate back.
  const handleCancelBooking = async () => {
    if (!requestId) {
      alert("No booking found.");
      router.push("/userProfile");
      return;
    }
    try {
      await updateDoc(doc(db, "ambulanceRequests", requestId), { status: "cancelled" });
      alert("Booking cancelled!");
      router.push("/userProfile");
    } catch (error) {
      console.error("Cancel booking error:", error);
      alert("Error cancelling booking. Please try again.");
    }
  };

  // Logout handler
  const handleLogout = () => {
    auth.signOut().then(() => router.push("/auth"));
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative">
      {/* Header */}
      <div className="px-4 py-4 bg-gray-100 shadow flex items-center justify-between">
        <button
          onClick={() => router.push("/userProfile")}
          className="text-gray-600 hover:text-gray-800 transition text-xl"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="text-xl font-bold text-gray-800 text-center flex-1">
          Booking Status
        </h1>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="text-gray-700"
            aria-label="User menu"
          >
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-gray-700">
              {getInitials(userName)}
            </div>
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg z-10">
              <div className="px-4 py-2 text-gray-700 font-semibold">
                Hello, {userName}
              </div>
              <hr />
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100 text-sm"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Map Section */}
      <div className="flex-1 p-4 flex flex-col items-center">
        {mapSrc ? (
          <iframe
            title="Tracking Map"
            width="90%"
            height="250"
            style={{ border: 0 }}
            src={mapSrc}
            allowFullScreen
          />
        ) : (
          <div className="h-64 w-11/12 bg-gray-100 flex items-center justify-center">
            <p className="text-gray-500">Map not available</p>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="px-4 py-6 flex flex-col items-center space-y-4 mb-8">
        <div className="w-full max-w-md bg-white shadow rounded p-4 flex flex-col items-center">
          {/* Display selected hospital, distance, and estimated time */}
          <p className="text-gray-600 text-center mb-2">
            Hospital: <span className="font-bold">{selectedHospital}</span>
          </p>
          <p className="text-gray-600 text-center mb-2">
            Distance:{" "}
            <span className="font-bold">
              {distance ? `${distance} km` : "Calculating..."}
            </span>
          </p>
          <p className="text-gray-600 text-center mb-2">
            Estimated Time:{" "}
            <span className="font-bold">
              {estimatedTime ? `${estimatedTime} min` : "Calculating..."}
            </span>
          </p>
          {/* Driver/Hospital Note */}
          <div className="bg-red-100 p-3 rounded w-full">
            <p className="font-bold text-red-700 text-center">
              Your driver is fully sanitized. Current body temperature: 98.9°F
            </p>
          </div>
          {/* Cancel Booking Button */}
          <button
            onClick={handleCancelBooking}
            className="w-full bg-red-500 text-white py-2 rounded font-semibold hover:bg-red-600 transition mt-4"
          >
            Cancel Booking
          </button>
        </div>
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
    </div>
  );
}

// Function to cancel the booking and navigate back
async function handleCancelBooking() {
  const params = new URLSearchParams(window.location.search);
  const requestId = params.get("requestId");
  if (!requestId) {
    alert("No booking found.");
    window.location.href = "/userProfile";
    return;
  }
  try {
    const { getFirestore, doc, updateDoc } = await import("firebase/firestore");
    const db = getFirestore();
    await updateDoc(doc(db, "ambulanceRequests", requestId), { status: "cancelled" });
    alert("Booking cancelled!");
    window.location.href = "/userProfile";
  } catch (error) {
    console.error("Cancel booking error:", error);
    alert("Error cancelling booking. Please try again.");
  }
}
