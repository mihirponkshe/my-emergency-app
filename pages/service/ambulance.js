import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { 
  getAuth, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  addDoc, 
  collection, 
  runTransaction 
} from "firebase/firestore";

// Helper: get initials from a name (for profile icon)
const getInitials = (name) => {
  if (!name) return "U";
  const words = name.trim().split(" ");
  return words.length === 1
    ? words[0][0].toUpperCase()
    : (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

export default function AmbulanceBooking() {
  const router = useRouter();
  const auth = getAuth();
  const db = getFirestore();

  // States for user, location, hospital info, and loading
  const [userName, setUserName] = useState("User");
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  const [locationText, setLocationText] = useState("Fetching location...");
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // Map viewport state for Google Maps iframe (if used)
  const [viewport, setViewport] = useState({
    latitude: 19.0760,
    longitude: 72.8777,
    zoom: 16,
    width: "90%",
    height: "250px",
  });

  // Maintain user session on refresh and fetch user details
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        const snapshot = await getDoc(doc(db, "users", uid));
        if (snapshot.exists()) {
          const data = snapshot.data();
          setUserName(data.name || "User");
        } else {
          setUserName(user.displayName || "User");
        }
      }
    });
    return () => unsubscribe();
  }, [auth, db]);

  // Function to fetch location, reverse geocode, and search for hospitals
  const handleTrackLocation = () => {
    setLoading(true);
    if (!navigator.geolocation) {
      setLocationText("Location not supported");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const preciseLat = Number(latitude.toFixed(6));
        const preciseLon = Number(longitude.toFixed(6));
        setLat(preciseLat);
        setLon(preciseLon);
        setViewport((prev) => ({
          ...prev,
          latitude: preciseLat,
          longitude: preciseLon,
        }));

        // Reverse geocode for human-friendly location text
        const reversePromise = fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${preciseLat}&lon=${preciseLon}&addressdetails=1`
        )
          .then((res) => res.json())
          .then((data) => {
            const place =
              data.address && data.address.city
                ? data.address.city +
                  (data.address.state ? ", " + data.address.state : "")
                : data.display_name || `${preciseLat}, ${preciseLon}`;
            setLocationText(place);
          })
          .catch((error) => {
            console.error("Reverse geocoding error:", error);
            setLocationText(`${preciseLat}, ${preciseLon}`);
          });

        // Use a smaller delta (0.02) to limit hospital search to nearby results
        const delta = 0.02;
        const viewbox = `${preciseLon - delta},${preciseLat + delta},${preciseLon + delta},${preciseLat - delta}`;

        // Search for nearby hospitals using Nominatim API
        const hospitalPromise = fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&q=hospital&limit=5&viewbox=${viewbox}&bounded=1`
        )
          .then((res) => res.json())
          .then((data) => {
            if (data && data.length > 0) {
              // Take the first 4 hospitals and add a fixed option "City Hospital"
              const fourHospitals = data.slice(0, 4);
              const allOptions = [...fourHospitals, { display_name: "City Hospital" }];
              setHospitals(allOptions);
              setSelectedHospital(allOptions[0].display_name);
            } else {
              setHospitals([]);
              setSelectedHospital("");
            }
          })
          .catch((error) => {
            console.error("Hospital search error:", error);
            setHospitals([]);
            setSelectedHospital("");
          });

        Promise.all([reversePromise, hospitalPromise]).finally(() => {
          setLoading(false);
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationText("Location unavailable");
        setHospitals([]);
        setSelectedHospital("Hospital search unavailable");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    handleTrackLocation();
  }, []);

  // Book ambulance handler: create a booking entry and navigate to the booking status page.
  // The new booking will include an "isNew" flag so that it is visible in the admin's ambulanceNewRequest page.
  const handleBook = async () => {
    let uid = auth.currentUser?.uid;
    // If user is not logged in, generate a guest UID using a Firestore transaction on a counter.
    if (!uid) {
      try {
        const bookingCounterRef = doc(db, "counters", "ambulanceBookings");
        uid = await runTransaction(db, async (transaction) => {
          const counterDoc = await transaction.get(bookingCounterRef);
          let newCount = 1;
          if (!counterDoc.exists()) {
            transaction.set(bookingCounterRef, { count: 1 });
          } else {
            newCount = counterDoc.data().count + 1;
            transaction.update(bookingCounterRef, { count: newCount });
          }
          return "guest_" + newCount;
        });
      } catch (error) {
        console.error("Error generating guest UID:", error);
        alert("Error booking ambulance. Please try again.");
        return;
      }
    }

    try {
      // Include the "isNew" flag in the document for admin visibility.
      const docRef = await addDoc(collection(db, "ambulanceRequests"), {
        uid,
        userName,
        location: locationText,
        latitude: lat,
        longitude: lon,
        hospital: selectedHospital,
        bookedAt: new Date().toISOString(),
        status: "pending", // initial status
        isGuest: !auth.currentUser, // flag for guest booking
        isNew: true, // flag for new requests visible to admin in ambulanceNewRequest
      });
      alert(
        `Ambulance booked!\nYour location: ${locationText}\nSelected Hospital: ${selectedHospital}`
      );
      // Navigate the user to the booking-status page.
      router.push({
        pathname: "/service/booking-status",
        query: { requestId: docRef.id },
      });
    } catch (error) {
      console.error("Booking error:", error);
      alert("Error booking ambulance. Please try again.");
    }
  };

  const handleCancel = () => {
    router.push("/userProfile");
  };

  const handleLogout = () => {
    auth.signOut().then(() => router.push("/auth"));
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Bar */}
      <div className="px-4 py-4 bg-gray-100 shadow flex items-center justify-between">
        <button
          onClick={() => router.push("/userProfile")}
          className="text-gray-600 hover:text-gray-800 transition text-xl"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold text-gray-800 text-center flex-1">
          Book An Ambulance
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

      {/* Location Bar */}
      <div className="px-4 py-2 bg-white shadow flex justify-center">
        <p className="text-gray-600 text-center">{locationText}</p>
      </div>

      {/* Map Section */}
      <div className="flex-1 p-4 flex flex-col items-center">
        {lat && lon ? (
          <iframe
            title="map"
            width="90%"
            height="250"
            style={{ border: 0 }}
            src={`https://www.google.com/maps?q=${lat},${lon}&z=16&output=embed`}
            allowFullScreen
          />
        ) : (
          <div className="h-64 w-11/12 bg-gray-100 flex items-center justify-center">
            <p className="text-gray-500">Map not available</p>
          </div>
        )}
        <button
          onClick={handleTrackLocation}
          className="w-11/12 bg-red-500 text-white py-3 rounded-full font-semibold hover:bg-red-600 transition mt-4"
        >
          {loading ? "Loading location..." : "Track My Location"}
        </button>
      </div>

      {/* Hospitals & Action Buttons */}
      <div className="px-4 py-6 flex flex-col items-center space-y-4 mb-8">
        <div className="w-full max-w-md bg-white shadow rounded p-4 flex flex-col items-center">
          <p className="text-gray-600 text-center mb-2">
            Select Nearest Hospital:
          </p>
          {hospitals.length > 0 ? (
            <select
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none text-center mx-auto"
            >
              {hospitals.slice(0, 4).map((hospital, index) => (
                <option key={index} value={hospital.display_name}>
                  {hospital.display_name}
                </option>
              ))}
              <option value="City Hospital">City Hospital</option>
            </select>
          ) : (
            <input
              type="text"
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
              placeholder="Enter hospital name"
              className="w-full p-2 border rounded focus:outline-none text-center mx-auto"
            />
          )}
          <div className="mt-4 flex space-x-4">
            <button
              onClick={handleCancel}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-400 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleBook}
              className="px-6 py-2 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 transition"
            >
              Book
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
