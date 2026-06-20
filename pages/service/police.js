import { useEffect, useState, Fragment } from "react";
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
  updateDoc,
  runTransaction
} from "firebase/firestore";
import { IoArrowBack } from "react-icons/io5";
import { FaUserShield } from "react-icons/fa";
import { Dialog, Transition } from "@headlessui/react";

// Helper: get initials from a name
const getInitials = (name) => {
  if (!name) return "U";
  const words = name.trim().split(" ");
  return words.length === 1
    ? words[0][0].toUpperCase()
    : (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

// Predefined crime types
const crimeTypes = ["Theft", "Assault", "Harassment", "Vandalism"];

export default function PoliceReporting() {
  const router = useRouter();
  const auth = getAuth();
  const db = getFirestore();

  // States for user info, location, police station info, and loading
  const [userName, setUserName] = useState("User");
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  const [locationText, setLocationText] = useState("Fetching location...");
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal states for crime selection
  const [showCrimeModal, setShowCrimeModal] = useState(false);
  const [selectedCrime, setSelectedCrime] = useState("");
  const [customCrime, setCustomCrime] = useState("");

  // Map viewport state for Google Maps iframe
  const [viewport, setViewport] = useState({
    latitude: 19.0760, // Default (Mumbai)
    longitude: 72.8777,
    zoom: 16,
    width: "90%",
    height: "250px",
  });

  // Maintain user session on refresh and fetch user details (including emergency contacts)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        const userRef = doc(db, "users", uid);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setUserName(data.name || "User");
          if (data.emergencyContacts) {
            setEmergencyContacts(data.emergencyContacts);
          }
        } else {
          setUserName(user.displayName || "User");
        }
      }
    });
    return () => unsubscribe();
  }, [auth, db]);

  // Function to fetch location, reverse geocode, and search for police stations
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

        // Reverse geocode to get a friendly location name
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

        // Increase delta to 0.20 (approx. 20 km radius) to search for police stations
        const delta = 0.20;
        const viewbox = `${preciseLon - delta},${preciseLat + delta},${preciseLon + delta},${preciseLat - delta}`;

        // Fetch nearby police stations using Nominatim API
        const stationPromise = fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&q=police+station&limit=5&viewbox=${viewbox}&bounded=1`
        )
          .then((res) => res.json())
          .then((data) => {
            if (data && data.length > 0) {
              // Optionally, take first 4 and then add a fixed option "City Police"
              const fourStations = data.slice(0, 4);
              const allOptions = [...fourStations, { display_name: "City Police" }];
              setStations(allOptions);
              setSelectedStation(allOptions[0].display_name);
            } else {
              setStations([]);
              setSelectedStation("");
            }
          })
          .catch((error) => {
            console.error("Police station search error:", error);
            setStations([]);
            setSelectedStation("");
          });

        Promise.all([reversePromise, stationPromise]).finally(() => {
          setLoading(false);
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationText("Location unavailable");
        setStations([]);
        setSelectedStation("Police station search unavailable");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    handleTrackLocation();
  }, []);

  const handleLogout = () => {
    auth.signOut().then(() => router.push("/auth"));
  };

  // Modal functions for crime selection
  const handleOpenCrimeModal = () => {
    setShowCrimeModal(true);
  };

  const handleCloseCrimeModal = () => {
    setShowCrimeModal(false);
    setSelectedCrime("");
    setCustomCrime("");
  };

  // Report crime handler with guest feature:
  const handleSubmitCrime = async () => {
    const crimeToReport = selectedCrime === "Other" ? customCrime : selectedCrime;
    if (!crimeToReport) {
      alert("Please select or enter a crime type.");
      return;
    }
    let uid = auth.currentUser?.uid;
    if (!uid) {
      try {
        const counterRef = doc(db, "counters", "crimeReports");
        uid = await runTransaction(db, async (transaction) => {
          const counterDoc = await transaction.get(counterRef);
          let newCount = 1;
          if (!counterDoc.exists()) {
            transaction.set(counterRef, { count: 1 });
          } else {
            newCount = counterDoc.data().count + 1;
            transaction.update(counterRef, { count: newCount });
          }
          return "guest_" + newCount;
        });
      } catch (error) {
        console.error("Error generating guest UID:", error);
        alert("Error reporting crime. Please try again.");
        return;
      }
    }
    try {
      // Create the crime report with the "isNew" flag for admin visibility in policeNewRequest
      const docRef = await addDoc(collection(db, "crimeReports"), {
        uid,
        userName,
        location: locationText,
        latitude: lat,
        longitude: lon,
        policeStation: selectedStation,
        crimeType: crimeToReport,
        reportedAt: new Date().toISOString(),
        status: "pending",
        isNew: true,
      });
      
      alert(
        `Crime reported!\nLocation: ${locationText}\nNearest Police Station: ${selectedStation}\nCrime Type: ${crimeToReport}`
      );
      handleCloseCrimeModal();
      router.push("/police-confirmation");
    } catch (error) {
      console.error("Crime report error:", error);
      alert("Error reporting crime. Please try again.");
    }
  };

  const handleCancel = () => {
    router.push("/userProfile");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with Back button, Title, and Profile Dropdown */}
      <div className="px-4 py-4 bg-gray-100 shadow flex items-center justify-between">
        <button
          onClick={() => router.push("/userProfile")}
          className="text-gray-600 hover:text-gray-800 transition text-xl"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold text-gray-800 text-center flex-1">
          Call Police Station
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

      {/* Current Location Bar */}
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

      {/* Police Stations & Action Buttons Container */}
      <div className="px-4 py-6 flex flex-col items-center space-y-4 mb-8">
        <div className="w-full max-w-md bg-white shadow rounded p-4 flex flex-col items-center">
          <p className="text-gray-600 text-center mb-2">
            Select Nearest Police Station:
          </p>
          {stations.length > 0 ? (
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none text-center mx-auto"
            >
              {stations.map((station, index) => (
                <option key={index} value={station.display_name}>
                  {station.display_name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              placeholder="Enter police station name"
              className="w-full p-2 border rounded focus:outline-none text-center mx-auto"
            />
          )}
          {/* Action Buttons */}
          <div className="mt-4 flex flex-col space-y-4 w-full items-center">
            <button
              onClick={handleOpenCrimeModal}
              className="w-full px-6 py-2 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 transition"
            >
              Report Crime
            </button>
            <div className="flex justify-evenly w-full mt-2">
              <button
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Crime Type Selection Modal */}
      <Transition show={showCrimeModal} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
          onClose={handleCloseCrimeModal}
        >
          <Dialog.Panel className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <Dialog.Title className="text-lg font-bold mb-4">
              Select Crime Type
            </Dialog.Title>
            <div className="space-y-2">
              {crimeTypes.map((crime, index) => (
                <button
                  key={index}
                  className={`w-full px-4 py-2 rounded ${
                    selectedCrime === crime
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200"
                  }`}
                  onClick={() => setSelectedCrime(crime)}
                >
                  {crime}
                </button>
              ))}
              <button
                className={`w-full px-4 py-2 rounded ${
                  selectedCrime === "Other"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200"
                }`}
                onClick={() => setSelectedCrime("Other")}
              >
                Other
              </button>
              {selectedCrime === "Other" && (
                <input
                  type="text"
                  placeholder="Specify crime type"
                  className="w-full px-4 py-2 border rounded"
                  value={customCrime}
                  onChange={(e) => setCustomCrime(e.target.value)}
                />
              )}
            </div>
            <div className="mt-4 flex justify-between">
              <button
                className="px-4 py-2 bg-gray-400 text-white rounded"
                onClick={handleCloseCrimeModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded"
                onClick={handleSubmitCrime}
              >
                Submit
              </button>
            </div>
          </Dialog.Panel>
        </Dialog>
      </Transition>
    </div>
  );
}

export { PoliceReporting };
