import { useEffect, useState, Fragment } from "react";
import { useRouter } from "next/router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  addDoc, 
  collection,
  runTransaction 
} from "firebase/firestore";
import { IoArrowBack } from "react-icons/io5";
import { Dialog, Transition } from "@headlessui/react";

// Helper: get initials from a name
const getInitials = (name) => {
  if (!name) return "U";
  const words = name.trim().split(" ");
  return words.length === 1
    ? words[0][0].toUpperCase()
    : (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

// Predefined fire incident types
const fireTypes = ["Building Fire", "Forest Fire", "Vehicle Fire", "Industrial Fire"];

function FireIncidentReporting() {
  const router = useRouter();
  const auth = getAuth();
  const db = getFirestore();

  // State variables
  const [userName, setUserName] = useState("User");
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  const [locationText, setLocationText] = useState("Fetching location...");
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // New state variables for custom fire station
  const [isCustomStation, setIsCustomStation] = useState(false);
  const [customStation, setCustomStation] = useState("");

  // Modal states for fire incident type selection
  const [showFireModal, setShowFireModal] = useState(false);
  const [selectedFireType, setSelectedFireType] = useState("");
  const [customFireType, setCustomFireType] = useState("");

  // Map viewport state for Google Maps iframe (optional)
  const [viewport, setViewport] = useState({
    latitude: 19.0760, // Default (Mumbai)
    longitude: 72.8777,
    zoom: 16,
    width: "90%",
    height: "250px",
  });

  // Listen for auth state changes and set userName
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

  // Function to fetch location, reverse geocode, and search for nearby fire stations
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

        // Reverse geocode using Nominatim
        const reversePromise = fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${preciseLat}&lon=${preciseLon}&addressdetails=1`
        )
          .then((res) => res.json())
          .then((data) => {
            const place =
              data.address && data.address.city
                ? data.address.city + (data.address.state ? ", " + data.address.state : "")
                : data.display_name || `${preciseLat}, ${preciseLon}`;
            setLocationText(place);
          })
          .catch((error) => {
            console.error("Reverse geocoding error:", error);
            setLocationText(`${preciseLat}, ${preciseLon}`);
          });

        // Use delta of 0.20 (approx. 20 km radius) for fire station search
        const delta = 0.20;
        const viewbox = `${preciseLon - delta},${preciseLat + delta},${preciseLon + delta},${preciseLat - delta}`;
        const stationPromise = fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&q=fire+station&limit=5&viewbox=${viewbox}&bounded=1`
        )
          .then((res) => res.json())
          .then((data) => {
            let stationsArray = [];
            if (data && data.length > 0) {
              stationsArray = data.slice(0, 4);
            }
            // Add the permanent City Fire Brigade entry
            stationsArray.push({ display_name: "City Fire Brigade" });
            setStations(stationsArray);
            setSelectedStation(stationsArray[0].display_name);
            setIsCustomStation(false);
          })
          .catch((error) => {
            console.error("Fire station search error:", error);
            setStations([{ display_name: "City Fire Brigade" }]);
            setSelectedStation("City Fire Brigade");
            setIsCustomStation(false);
          });

        Promise.all([reversePromise, stationPromise]).finally(() => {
          setLoading(false);
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationText("Location unavailable");
        setStations([{ display_name: "City Fire Brigade" }]);
        setSelectedStation("City Fire Brigade");
        setIsCustomStation(false);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    handleTrackLocation();
  }, []);

  // Logout handler
  const handleLogout = () => {
    auth.signOut().then(() => router.push("/auth"));
  };

  // Modal functions for fire incident type selection
  const handleOpenFireModal = () => {
    setShowFireModal(true);
  };

  const handleCloseFireModal = () => {
    setShowFireModal(false);
    setSelectedFireType("");
    setCustomFireType("");
  };

  // Report fire incident handler with guest feature
  const handleSubmitFire = async () => {
    const fireTypeToReport = selectedFireType === "Other" ? customFireType : selectedFireType;
    if (!fireTypeToReport) {
      alert("Please select or enter a fire incident type.");
      return;
    }
    // Determine the fire station to report
    const fireStationToReport = isCustomStation ? customStation : selectedStation;
    if (!fireStationToReport) {
      alert("Please select or enter a fire brigade name.");
      return;
    }
    let uid = auth.currentUser?.uid;
    if (!uid) {
      try {
        const counterRef = doc(db, "counters", "fireReports");
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
        alert("Error reporting fire incident. Please try again.");
        return;
      }
    }
    try {
      // Create the fire report document with an "isNew" flag for admin visibility in fireNewRequest
      const docRef = await addDoc(collection(db, "fireReports"), {
        uid,
        userName,
        location: locationText,
        latitude: lat,
        longitude: lon,
        fireStation: fireStationToReport, // use custom or selected station
        fireType: fireTypeToReport,
        reportedAt: new Date().toISOString(),
        status: "pending",
        isNew: true
      });
      alert(`Fire incident reported!
Location: ${locationText}
Nearest Fire Station: ${fireStationToReport}
Incident Type: ${fireTypeToReport}`);
      handleCloseFireModal();
      // Redirect to fire-confirmation.js with the requestId
      router.push({
        pathname: "/fire-confirmation",
        query: { requestId: docRef.id }
      });
    } catch (error) {
      console.error("Fire incident report error:", error);
      alert("Error reporting fire incident. Please try again.");
    }
  };

  // Contact emergency contacts handler
  const handleContactEmergencyContacts = () => {
    alert("Your emergency contacts have been informed about the fire incident.");
  };

  // Cancel button handler
  const handleCancel = () => {
    router.push("/userProfile");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 bg-gray-100 shadow flex items-center justify-between">
        <button
          onClick={() => router.push("/userProfile")}
          className="text-gray-600 hover:text-gray-800 transition text-xl"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold text-gray-800 text-center flex-1">
          Report a fire incident
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

      {/* Fire Stations & Action Buttons Container */}
      <div className="px-4 py-6 flex flex-col items-center space-y-4 mb-8">
        <div className="w-full max-w-md bg-white shadow rounded p-4 flex flex-col items-center">
          <p className="text-gray-600 text-center mb-2">
            Select Nearest Fire Station:
          </p>
          {stations.length > 0 ? (
            <>
              <select
                value={selectedStation}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedStation(value);
                  setIsCustomStation(value === "Other");
                }}
                className="w-full p-2 border rounded focus:outline-none text-center"
              >
                {stations.map((station, index) => (
                  <option key={index} value={station.display_name}>
                    {station.display_name}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>
              {isCustomStation && (
                <input
                  type="text"
                  placeholder="Enter fire brigade name"
                  value={customStation}
                  onChange={(e) => setCustomStation(e.target.value)}
                  className="w-full p-2 border rounded mt-2 text-center"
                />
              )}
            </>
          ) : (
            <p className="text-gray-500 text-center">{selectedStation}</p>
          )}
          {/* Action Buttons */}
          <div className="mt-4 flex flex-col space-y-4 w-full items-center">
            <button
              onClick={handleOpenFireModal}
              className="w-full px-6 py-2 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 transition"
            >
              Report Situation
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

      {/* Fire Incident Type Selection Modal */}
      <Transition show={showFireModal} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
          onClose={handleCloseFireModal}
        >
          <Dialog.Panel className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <Dialog.Title className="text-lg font-bold mb-4">
              Select Fire Incident Type
            </Dialog.Title>
            <div className="space-y-2">
              {fireTypes.map((fire, index) => (
                <button
                  key={index}
                  className={`w-full px-4 py-2 rounded ${
                    selectedFireType === fire
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200"
                  }`}
                  onClick={() => setSelectedFireType(fire)}
                >
                  {fire}
                </button>
              ))}
              <button
                className={`w-full px-4 py-2 rounded ${
                  selectedFireType === "Other"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200"
                }`}
                onClick={() => setSelectedFireType("Other")}
              >
                Other
              </button>
              {selectedFireType === "Other" && (
                <input
                  type="text"
                  placeholder="Specify fire incident type"
                  className="w-full px-4 py-2 border rounded"
                  value={customFireType}
                  onChange={(e) => setCustomFireType(e.target.value)}
                />
              )}
            </div>
            <div className="mt-4 flex justify-between">
              <button
                className="px-4 py-2 bg-gray-400 text-white rounded"
                onClick={handleCloseFireModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded"
                onClick={handleSubmitFire}
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

export default FireIncidentReporting;
