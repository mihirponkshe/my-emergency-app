// pages/profile-user.js
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { IoArrowBack } from "react-icons/io5";
import { FaCamera } from "react-icons/fa";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

export default function ProfileUser() {
  const router = useRouter();
  const auth = getAuth();
  const db = getFirestore();
  const fileInputRef = useRef(null);

  // Initialize state from localStorage so that unsaved data persists
  const [name, setName] = useState(
    typeof window !== "undefined" ? localStorage.getItem("profileName") || "" : ""
  );
  const [email, setEmail] = useState(
    typeof window !== "undefined" ? localStorage.getItem("profileEmail") || "" : ""
  );
  const [mobile, setMobile] = useState(
    typeof window !== "undefined" ? localStorage.getItem("profileMobile") || "" : ""
  );
  const [gender, setGender] = useState(
    typeof window !== "undefined" ? localStorage.getItem("profileGender") || "male" : "male"
  );
  const [dob, setDob] = useState(
    typeof window !== "undefined" ? localStorage.getItem("profileDob") || "" : ""
  );
  const [location, setLocation] = useState(
    typeof window !== "undefined" ? localStorage.getItem("profileLocation") || "" : ""
  );
  const [differentlyAbled, setDifferentlyAbled] = useState(
    typeof window !== "undefined" ? localStorage.getItem("profileDifferentlyAbled") === "true" : false
  );
  const [profilePic, setProfilePic] = useState(
    typeof window !== "undefined" ? localStorage.getItem("profilePic") || null : null
  );

  // When the component mounts, try to load existing profile data from Firestore.
  // Only update a field if Firestore returns a nonempty value so that unsaved local changes remain.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const uid = user?.uid;
      if (uid) {
        getDoc(doc(db, "users", uid)).then((snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.name) {
              setName(data.name);
              localStorage.setItem("profileName", data.name);
            }
            if (data.email) {
              setEmail(data.email);
              localStorage.setItem("profileEmail", data.email);
            }
            if (data.phone) {
              setMobile(data.phone);
              localStorage.setItem("profileMobile", data.phone);
            }
            if (data.gender) {
              setGender(data.gender);
              localStorage.setItem("profileGender", data.gender);
            }
            if (data.dob) {
              setDob(data.dob);
              localStorage.setItem("profileDob", data.dob);
            }
            if (data.location) {
              setLocation(data.location);
              localStorage.setItem("profileLocation", data.location);
            }
            if (data.differentlyAbled !== undefined) {
              setDifferentlyAbled(data.differentlyAbled);
              localStorage.setItem("profileDifferentlyAbled", data.differentlyAbled ? "true" : "false");
            }
            if (data.profilePic) {
              setProfilePic(data.profilePic);
              localStorage.setItem("profilePic", data.profilePic);
            }
          }
        });
      }
    });
    return () => unsubscribe();
  }, [auth, db]);

  // Handle avatar selection
  const handleAvatarClick = () => {
    fileInputRef.current && fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setProfilePic(previewUrl);
      localStorage.setItem("profilePic", previewUrl);
      // TODO: Upload file to Firebase Storage and update Firestore with its URL.
    }
  };

  // Get live location using geolocation and reverse geocoding using Nominatim
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
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
            setLocation(place);
            localStorage.setItem("profileLocation", place);
          })
          .catch((error) => {
            console.error("Reverse geocoding error:", error);
            const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setLocation(fallback);
            localStorage.setItem("profileLocation", fallback);
          });
      },
      (error) => {
        alert("Error retrieving location: " + error.message);
      }
    );
  };

  // Save profile data in Firestore and keep localStorage in sync
  const handleSaveProfile = async () => {
    // Validate all fields (except profilePic) are filled
    if (
      !name.trim() ||
      !email.trim() ||
      !mobile.trim() ||
      !gender.trim() ||
      !dob.trim() ||
      !location.trim()
    ) {
      alert("All fields except profile picture are mandatory. Please fill out every field.");
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert("No user is currently logged in.");
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
        },
        { merge: true }
      );
      alert("Profile updated successfully!");
      router.push("/userProfile");
    } catch (error) {
      alert(error.message);
    }
  };

  // Navigate to emergency contacts page
  const handleAddEmergencyContact = () => {
    router.push("/userAddEmergencyContact");
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
      {/* White Card */}
      <div className="w-full max-w-md p-6 bg-white rounded shadow-md relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800 transition">
            <IoArrowBack size={24} />
          </button>
          <h2 className="text-lg font-bold text-gray-800">Profile</h2>
          {/* Placeholder to maintain alignment */}
          <div style={{ width: "24px" }}></div>
        </div>

        {/* Profile Image */}
        <div className="flex items-center justify-center mb-6">
          <div
            onClick={handleAvatarClick}
            className="relative w-24 h-24 rounded-full bg-gray-200 overflow-hidden cursor-pointer flex items-center justify-center"
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
                localStorage.setItem("profileName", e.target.value);
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
                localStorage.setItem("profileEmail", e.target.value);
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
                localStorage.setItem("profileMobile", e.target.value);
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
                      localStorage.setItem("profileGender", "male");
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
                      localStorage.setItem("profileGender", "female");
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
                      localStorage.setItem("profileGender", "other");
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
                  localStorage.setItem("profileDob", e.target.value);
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
                  localStorage.setItem("profileLocation", e.target.value);
                }}
              />
              <button
                onClick={handleGetLocation}
                className="ml-2 bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 transition text-sm"
              >
                Get Location
              </button>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex flex-col space-y-3">
          <button
            onClick={handleAddEmergencyContact}
            className="w-full bg-red-500 text-white py-3 rounded-full font-semibold hover:bg-red-600 transition"
          >
            Add Emergency Contact
          </button>
          <button
            onClick={handleSaveProfile}
            className="w-full bg-red-500 text-white py-3 rounded-full font-semibold hover:bg-red-600 transition"
          >
            Update Profile
          </button>
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
