import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { IoArrowBack } from 'react-icons/io5';
import { FaBell, FaCog, FaComments, FaShoppingBag } from 'react-icons/fa';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Set auth persistence to LOCAL so the admin stays logged in on refresh.
const auth = getAuth();
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting auth persistence:", error);
});

export default function ProfileAdmin() {
  const router = useRouter();
  const db = getFirestore();

  const [adminName, setAdminName] = useState('Admin Name');
  const [institution, setInstitution] = useState('N/A'); 
  const [email, setEmail] = useState('admin@example.com');

  // Always show initials even if profilePic exists – we only show initials in the avatar.
  const getInitials = (name) => {
    if (!name) return "U";
    const words = name.trim().split(" ");
    return words.length === 1
      ? words[0][0].toUpperCase()
      : (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  // Listen for auth state changes and fetch admin details from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        const snapshot = await getDoc(doc(db, 'users', uid));
        if (snapshot.exists()) {
          const data = snapshot.data();
          setAdminName(data.name || 'Admin Name');
          setEmail(data.email || 'admin@example.com');
          setInstitution(data.institution || 'N/A');
        } else {
          setAdminName(user.displayName || 'Admin Name');
        }
      }
    });
    return () => unsubscribe();
  }, [auth, db]);

  const handleLogout = () => {
    auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-purple-200 px-4 py-6">
      {/* Header */}
      <div className="flex items-center mb-4">
        <button onClick={() => router.back()} className="text-gray-700 mr-2">
          <IoArrowBack size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Profile</h1>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-lg p-4 shadow mb-6">
        <div className="flex items-center justify-between">
          {/* Left: Name & Institution */}
          <div>
            <h2 className="font-bold text-lg text-gray-700">{adminName}</h2>
            <p className="text-sm text-gray-500">{institution}</p>
          </div>
          {/* Avatar: Always display initials */}
          <div className="w-14 h-14 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-xl font-bold text-gray-700">
              {getInitials(adminName)}
            </span>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="bg-white rounded-lg p-4 shadow">
        <ul className="space-y-4 text-gray-700">
          <li
            className="flex items-center cursor-pointer"
            onClick={() => router.push('/policeBookingHistory')}
          >
            <FaShoppingBag className="mr-3 text-purple-500" />
            <span>Booking history</span>
          </li>
          <li
            className="flex items-center cursor-pointer"
            onClick={() => router.push('/policeNewRequests')}
          >
            <FaBell className="mr-3 text-purple-500" />
            <span>New Requests</span>
          </li>
          <li className="flex items-center cursor-pointer" onClick={handleLogout}>
            <FaCog className="mr-3 text-purple-500" />
            <span>Log out</span>
          </li>
        </ul>
      </div>

      {/* Footer/Logo */}
      <div className="mt-6 text-center flex justify-center">
        <div className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain" />
        </div>
      </div>
    </div>
  );
}
