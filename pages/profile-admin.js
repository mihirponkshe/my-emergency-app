import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { IoArrowBack } from "react-icons/io5";
import { FaCamera } from "react-icons/fa";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// Helper: get initials from a name (for profile icon)
const getInitials = (name) => {
  if (!name) return "U";
  const words = name.trim().split(" ");
  return words.length === 1
    ? words[0][0].toUpperCase()
    : (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

export default function ProfileAdmin() {
  const router = useRouter();
  const auth = getAuth();
  const db = getFirestore();
  const fileInputRef = useRef(null);

  // Initialize state from localStorage (using "adminProfile" prefix) so that unsaved data persists
  const [name, setName] = useState(
    typeof window !== "undefined" ? localStorage.getItem("adminProfileName") || "" : ""
  );
  const [email, setEmail] = useState(
    typeof window !== "undefined" ? localStorage.getItem("adminProfileEmail") || "" : ""
  );
  const [mobile, setMobile] = useState(
    typeof window !== "undefined" ? localStorage.getItem("adminProfileMobile") || "" : ""
  );
  const [gender, setGender] = useState(
    typeof window !== "undefined" ? localStorage.getItem("adminProfileGender") || "male" : "male"
  );
  const [dob, setDob] = useState(
    typeof window !== "undefined" ? localStorage.getItem("adminProfileDob") || "" : ""
  );
  const [location, setLocation] = useState(
    typeof window !== "undefined" ? localStorage.getItem("adminProfileLocation") || "" : ""
  );
  const [differentlyAbled, setDifferentlyAbled] = useState(false);
  const [profilePic, setProfilePic] = useState(
    typeof window !== "undefined" ? localStorage.getItem("adminProfilePic") || null : null
  );
  const [institution, setInstitution] = useState(
    typeof window !== "undefined" ? localStorage.getItem("adminProfileInstitution") || "" : ""
  );
  const [instituteType, setInstituteType] = useState(
    typeof window !== "undefined" ? localStorage.getItem("adminProfileInstituteType") || "" : ""
  );
  const [locLoading, setLocLoading] = useState(false);

  // Fetch admin profile from Firestore and update localStorage accordingly.
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      getDoc(doc(db, "users", uid)).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.name) {
            setName(data.name);
            localStorage.setItem("adminProfileName", data.name);
          }
          if (data.email) {
            setEmail(data.email);
            localStorage.setItem("adminProfileEmail", data.email);
          }
          if (data.phone) {
            setMobile(data.phone);
            localStorage.setItem("adminProfileMobile", data.phone);
          }
          if (data.gender) {
            setGender(data.gender);
            localStorage.setItem("adminProfileGender", data.gender);
          }
          if (data.dob) {
            setDob(data.dob);
            localStorage.setItem("adminProfileDob", data.dob);
          }
          if (data.location) {
            setLocation(data.location);
            localStorage.setItem("adminProfileLocation", data.location);
          }
          if (data.institution) {
            setInstitution(data.institution);
            localStorage.setItem("adminProfileInstitution", data.institution);
          }
          if (data.instituteType) {
            setInstituteType(data.instituteType);
            localStorage.setItem("adminProfileInstituteType", data.instituteType);
          }
          if (data.profilePic) {
            setProfilePic(data.profilePic);
            localStorage.setItem("adminProfilePic", data.profilePic);
          }
        }
      });
    }
  }, [auth, db]);

  // Handle avatar file selection
  const handleAvatarClick = () => {
    fileInputRef.current && fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setProfilePic(previewUrl);
      localStorage.setItem("adminProfilePic", previewUrl);
      // TODO: Upload file to Firebase Storage and update Firestore with its URL.
    }
  };

  // Get live location using geolocation and reverse geocoding via Nominatim with loading indicator
  const handleGetLocation = () => {
    setLocLoading(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      setLocLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const preciseLat = Number(latitude.toFixed(6));
        const preciseLon = Number(longitude.toFixed(6));
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${preciseLat}&lon=${preciseLon}&addressdetails=1`
        )
          .then((response) => response.json())
          .then((data) => {
            const place =
              data.address && data.address.city
                ? data.address.city +
                  (data.address.state ? ", " + data.address.state : "")
                : data.display_name || `${preciseLat}, ${preciseLon}`;
            setLocation(place);
            localStorage.setItem("adminProfileLocation", place);
            setLocLoading(false);
          })
          .catch((error) => {
            console.error("Reverse geocoding error:", error);
            setLocation(`${preciseLat}, ${preciseLon}`);
            localStorage.setItem("adminProfileLocation", `${preciseLat}, ${preciseLon}`);
            setLocLoading(false);
          });
      },
      (error) => {
        alert("Error retrieving location: " + error.message);
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Update profile data in Firestore with role "admin" along with institution and instituteType.
  const handleSaveProfile = async () => {
    // Validate all fields except profilePic are filled
    if (
      !name.trim() ||
      !email.trim() ||
      !mobile.trim() ||
      !gender.trim() ||
      !dob.trim() ||
      !location.trim() ||
      !institution.trim() ||
      !instituteType.trim()
    ) {
      alert("All fields except profile picture are mandatory. Please fill out every field.");
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert("No admin is currently logged in.");
      return;
    }
    try {
      await setDoc(
        doc(db, "users", uid),
        {
          name,
          email,
          phone: mobile,
          gender,
          dob,
          location,
          differentlyAbled,
          profilePic,
          institution,
          instituteType,
          role: "admin"
        },
        { merge: true }
      );
      alert("Profile updated successfully!");
      
      // Redirect based on selected institute type:
      if (instituteType === "Hospital") {
        router.push("/ambulanceAdmin");
      } else if (instituteType === "Fire Brigade") {
        router.push("/fireAdmin");
      } else if (instituteType === "Police Station") {
        router.push("/policeAdmin");
      } else {
        router.push("/adminProfile"); // Fallback in case of an unexpected value
      }
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-purple-100 to-purple-200 px-4 py-6 overflow-hidden flex items-center justify-center">
      {/* Centering Container */}
      <div className="w-full flex justify-center">
        {/* White Card */}
        <div className="w-full max-w-md p-6 bg-white rounded shadow-md relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => router.back()} className="text-gray-700 hover:text-gray-800 transition">
              <IoArrowBack size={24} />
            </button>
            <h2 className="text-lg font-bold text-gray-800">Profile</h2>
            <div style={{ width: "24px" }}></div>
          </div>

          {/* Profile Image */}
          <div className="flex items-center justify-center mb-6">
            <div
              onClick={handleAvatarClick}
              className="relative w-16 h-16 rounded-full bg-gray-300 overflow-hidden cursor-pointer flex items-center justify-center"
            >
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <FaCamera className="text-gray-500 text-2xl" />
              )}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Name</label>
              <input
                type="text"
                className="w-full p-2 border rounded focus:outline-none"
                placeholder="Full Name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  localStorage.setItem("adminProfileName", e.target.value);
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Email</label>
              <input
                type="email"
                className="w-full p-2 border rounded focus:outline-none"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  localStorage.setItem("adminProfileEmail", e.target.value);
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Mobile Number</label>
              <input
                type="tel"
                className="w-full p-2 border rounded focus:outline-none"
                placeholder="+1 234 567 8901"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value);
                  localStorage.setItem("adminProfileMobile", e.target.value);
                }}
              />
            </div>
            {/* Row with Gender & DOB */}
            <div className="flex space-x-2">
              <div className="w-1/2">
                <label className="block text-sm font-semibold text-gray-600 mb-1">Gender</label>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-1 text-sm">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={gender === "male"}
                      onChange={() => {
                        setGender("male");
                        localStorage.setItem("adminProfileGender", "male");
                      }}
                    />
                    <span>Male</span>
                  </label>
                  <label className="flex items-center space-x-1 text-sm">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={gender === "female"}
                      onChange={() => {
                        setGender("female");
                        localStorage.setItem("adminProfileGender", "female");
                      }}
                    />
                    <span>Female</span>
                  </label>
                  <label className="flex items-center space-x-1 text-sm">
                    <input
                      type="radio"
                      name="gender"
                      value="other"
                      checked={gender === "other"}
                      onChange={() => {
                        setGender("other");
                        localStorage.setItem("adminProfileGender", "other");
                      }}
                    />
                    <span>Other</span>
                  </label>
                </div>
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-semibold text-gray-600 mb-1">Date of Birth</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded focus:outline-none"
                  value={dob}
                  onChange={(e) => {
                    setDob(e.target.value);
                    localStorage.setItem("adminProfileDob", e.target.value);
                  }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Location</label>
              <div className="flex">
                <input
                  type="text"
                  className="flex-1 p-2 border rounded focus:outline-none"
                  placeholder="City, State or Place"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    localStorage.setItem("adminProfileLocation", e.target.value);
                  }}
                />
                <button
                  onClick={handleGetLocation}
                  className="ml-2 bg-purple-500 text-white px-3 py-2 rounded hover:bg-purple-600 transition text-sm"
                >
                  {locLoading ? "Loading..." : "Get Location"}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Emergency Service Provider Name
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded focus:outline-none"
                placeholder="Enter Institution Name"
                value={institution}
                onChange={(e) => {
                  setInstitution(e.target.value);
                  localStorage.setItem("adminProfileInstitution", e.target.value);
                }}
              />
            </div>
            {/* Institute Type (mandatory) */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Institute Type <span className="text-red-500">*</span>
              </label>
              <select
                value={instituteType}
                onChange={(e) => {
                  setInstituteType(e.target.value);
                  localStorage.setItem("adminProfileInstituteType", e.target.value);
                }}
                className="w-full p-2 border rounded focus:outline-none"
              >
                <option value="">Select Type</option>
                <option value="Hospital">Hospital</option>
                <option value="Fire Brigade">Fire Brigade</option>
                <option value="Police Station">Police Station</option>
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-6 flex flex-col space-y-3">
            <button
              onClick={handleSaveProfile}
              className="w-full bg-purple-500 text-white py-3 rounded-full font-semibold hover:bg-purple-600 transition"
            >
              Update Profile
            </button>
          </div>
        </div>
      </div>

      {/* Decorative Wave */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
        <svg className="relative block w-[calc(100%+1.3px)] h-32" viewBox="0 0 500 150" preserveAspectRatio="none">
          <path d="M0,50 C150,100 350,0 500,75 L500,150 L0,150 Z" fill="#fff" />
        </svg>
      </div>
    </main>
  );
}
