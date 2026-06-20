import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { IoArrowBack, IoPersonCircle } from 'react-icons/io5';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { FaAmbulance, FaUserShield, FaFireExtinguisher } from "react-icons/fa";

export default function UserHome() {
  const router = useRouter();
  const auth = getAuth();
  const db = getFirestore();

  // For guest, always show "User"
  const [currentLocation, setCurrentLocation] = useState("Fetching location...");

  // Get user's current location and reverse geocode it
  useEffect(() => {
    if (!navigator.geolocation) {
      setCurrentLocation("Location not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`)
          .then((response) => response.json())
          .then((data) => {
            const place = data.address && data.address.city 
              ? data.address.city + (data.address.state ? ", " + data.address.state : "")
              : data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setCurrentLocation(place);
          })
          .catch((error) => {
            console.error("Reverse geocoding error:", error);
            setCurrentLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          });
      },
      (error) => {
        setCurrentLocation("Location unavailable");
        console.error("Geolocation error:", error);
      }
    );
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 shadow">
        {/* Back Arrow */}
        <button onClick={() => router.push('/auth')} className="text-gray-700">
          <IoArrowBack size={28} />
        </button>
        {/* Display current location in center */}
        <div className="text-gray-600 font-semibold">{currentLocation}</div>
        {/* Profile Icon redirects to sign in / sign up */}
        <button onClick={() => router.push('/signin-user')} className="text-gray-700">
          <IoPersonCircle size={28} />
        </button>
      </div>

      {/* Welcome Bar */}
      <div className="bg-red-500 text-white px-4 py-3 text-lg font-bold text-center">
        Welcome, User
      </div>

      {/* Main Content: Service Cards arranged horizontally */}
      <div className="px-4 py-6">
        <p className="text-gray-600 text-center mb-4">
          Select a service below to request help.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {/* Ambulance Card */}
          <div 
            className="bg-gray-100 rounded-lg shadow p-4 flex flex-col items-center cursor-pointer hover:bg-gray-200 transition w-40"
            onClick={() => router.push('/service/ambulance')}
          >
            <FaAmbulance className="text-red-600 w-12 h-12 mb-2" />
            <span className="font-semibold text-gray-700">Ambulance</span>
          </div>

          {/* Police Card */}
          <div 
            className="bg-gray-100 rounded-lg shadow p-4 flex flex-col items-center cursor-pointer hover:bg-gray-200 transition w-40"
            onClick={() => router.push('/service/police')}
          >
            <FaUserShield className="text-blue-600 w-12 h-12 mb-2" />
            <span className="font-semibold text-gray-700">Police</span>
          </div>

          {/* Fire Card */}
          <div 
            className="bg-gray-100 rounded-lg shadow p-4 flex flex-col items-center cursor-pointer hover:bg-gray-200 transition w-40"
            onClick={() => router.push('/service/fire')}
          >
            <FaFireExtinguisher className="text-orange-600 w-12 h-12 mb-2" />
            <span className="font-semibold text-gray-700">Fire</span>
          </div>
        </div>
      </div>
    </div>
  );
}
