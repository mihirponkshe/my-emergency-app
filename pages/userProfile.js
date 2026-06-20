import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { IoArrowBack } from "react-icons/io5";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { FaAmbulance, FaUserShield, FaFireExtinguisher } from 'react-icons/fa';

// Helper function to get initials from a name
const getInitials = (name) => {
  if (!name) return "U";
  const words = name.trim().split(" ");
  return words.length === 1
    ? words[0][0].toUpperCase()
    : (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

export default function ProfileUser() {
  const router = useRouter();
  const db = getFirestore();
  const auth = getAuth();

  const [userName, setUserName] = useState("User");
  const [currentLocation, setCurrentLocation] = useState("Fetching location...");
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch current user details immediately, then subscribe to auth state changes.
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      // Try fetching user details from Firestore
      getDoc(doc(db, "users", user.uid))
        .then((snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setUserName(data.name || user.displayName || "User");
          } else {
            setUserName(user.displayName || "User");
          }
        })
        .catch((error) => {
          console.error("Error fetching user details:", error);
          setUserName(user.displayName || "User");
        });
    }

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        if (snapshot.exists()) {
          const data = snapshot.data();
          setUserName(data.name || user.displayName || "User");
        } else {
          setUserName(user.displayName || "User");
        }
      }
    });
    return () => unsubscribe();
  }, [auth, db]);

  // Fetch current location via geolocation and reverse geocoding
  useEffect(() => {
    if (!navigator.geolocation) {
      setCurrentLocation("Location not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
        )
          .then((response) => response.json())
          .then((data) => {
            const place =
              data.address && data.address.city
                ? data.address.city +
                  (data.address.state ? ", " + data.address.state : "")
                : data.display_name ||
                  `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setCurrentLocation(place);
          })
          .catch((error) => {
            console.error("Reverse geocoding error:", error);
            setCurrentLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          });
      },
      (error) => {
        console.error("Geolocation error:", error);
        setCurrentLocation("Location unavailable");
      }
    );
  }, []);

  // Logout handler
  const handleLogout = () => {
    auth.signOut().then(() => router.push("/auth"));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 shadow relative">
        <div></div>
        <div className="text-gray-600 font-semibold">{currentLocation}</div>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="text-gray-700"
          >
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-gray-700">
              {getInitials(userName)}
            </div>
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg">
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

      {/* Welcome Section */}
      <div className="bg-red-500 text-white px-4 py-6 text-center text-2xl font-bold">
        Hello, {userName}
      </div>

      {/* Service Buttons Section */}
      <div className="px-4 py-6">
        <p className="text-gray-600 text-center mb-4">
          Select a service below to request help.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {/* Ambulance */}
          <div
            className="bg-gray-100 rounded-lg shadow p-4 flex flex-col items-center cursor-pointer hover:bg-gray-200 transition w-40"
            onClick={() => router.push("/service/ambulance")}
          >
            <FaAmbulance className="text-red-600 w-12 h-12 mb-2" />
            <span className="font-semibold text-gray-700">Ambulance</span>
          </div>
          {/* Police */}
          <div
            className="bg-gray-100 rounded-lg shadow p-4 flex flex-col items-center cursor-pointer hover:bg-gray-200 transition w-40"
            onClick={() => router.push("/service/police")}
          >
            <FaUserShield className="text-blue-600 w-12 h-12 mb-2" />
            <span className="font-semibold text-gray-700">Police</span>
          </div>
          {/* Fire */}
          <div
            className="bg-gray-100 rounded-lg shadow p-4 flex flex-col items-center cursor-pointer hover:bg-gray-200 transition w-40"
            onClick={() => router.push("/service/fire")}
          >
            <FaFireExtinguisher className="text-orange-600 w-12 h-12 mb-2" />
            <span className="font-semibold text-gray-700">Fire</span>
          </div>
        </div>
      </div>
    </div>
  );
}
