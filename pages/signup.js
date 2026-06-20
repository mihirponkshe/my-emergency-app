import { useState } from 'react';
import { useRouter } from 'next/router';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider
} from 'firebase/auth';
import { IoArrowBack } from 'react-icons/io5';
import { FaGoogle, FaApple, FaFacebookF } from 'react-icons/fa';

const db = getFirestore();

export default function SignUp() {
  const router = useRouter();
  const auth = getAuth();

  // Form field states
  const [role, setRole] = useState('user'); // "user" or "admin"
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [agreedToOffers, setAgreedToOffers] = useState(false);

  // Loading state for sign-up processing
  const [loading, setLoading] = useState(false);

  // Social Providers
  const googleProvider = new GoogleAuthProvider();
  const facebookProvider = new FacebookAuthProvider();
  const appleProvider = new OAuthProvider('apple.com');

  // Handle email/password sign-up
  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!name || !phone || !email || !password || !confirmPass) {
      alert("Please fill out all the fields.");
      return;
    }
    if (password !== confirmPass) {
      alert("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      // Create user with email/password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Save user details in Firestore with role and agreedToOffers
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name,
        phone,
        email,
        role, // "admin" or "user"
        agreedToOffers
      });
      
      alert(`Signed up successfully as ${role.toUpperCase()}!`);
      // Navigate to the appropriate profile page
      if (role === 'admin') {
        router.push('/profile-admin');
      } else {
        router.push('/profile-user');
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Social sign-up handler (shared for all roles)
  const handleSocialSignUp = async (provider) => {
    setLoading(true);
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const uid = userCredential.user.uid;
      // Check if Firestore record exists; if not, create one with the selected role.
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', uid), {
          name: userCredential.user.displayName || '',
          email: userCredential.user.email || '',
          role, // Use the role selected in the form
          phone, // May be empty for social accounts
          agreedToOffers
        });
      }
      alert('Signed up with social account successfully!');
      // Redirect based on role
      if (role === 'admin') {
        router.push('/profile-admin');
      } else {
        router.push('/profile-user');
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-red-400 to-red-500 flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
      {/* White Card */}
      <div className="w-full max-w-md p-6 bg-white rounded shadow-md relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800 transition"
          >
            <IoArrowBack size={24} />
          </button>
          <h2 className="text-lg font-bold text-gray-800">Sign Up</h2>
          {/* Placeholder for alignment */}
          <div style={{ width: "24px" }}></div>
        </div>

        {/* Role Selection */}
        <label className="block text-sm font-semibold text-gray-600 mb-2">
          I am a
        </label>
        <div className="flex items-center space-x-4 mb-4">
          <label className="flex items-center space-x-1 text-sm">
            <input
              type="radio"
              name="role"
              value="user"
              checked={role === 'user'}
              onChange={() => setRole('user')}
              required
            />
            <span>User</span>
          </label>
          <label className="flex items-center space-x-1 text-sm">
            <input
              type="radio"
              name="role"
              value="admin"
              checked={role === 'admin'}
              onChange={() => setRole('admin')}
              required
            />
            <span>Admin</span>
          </label>
        </div>

        {/* Name */}
        <label className="block text-sm font-semibold text-gray-600">Name</label>
        <input
          type="text"
          className="w-full p-2 mt-1 mb-3 border rounded focus:outline-none"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {/* Phone */}
        <label className="block text-sm font-semibold text-gray-600">Phone Number</label>
        <input
          type="tel"
          className="w-full p-2 mt-1 mb-3 border rounded focus:outline-none"
          placeholder="+1 234 567 8901"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />

        {/* Email */}
        <label className="block text-sm font-semibold text-gray-600">Email</label>
        <input
          type="email"
          className="w-full p-2 mt-1 mb-3 border rounded focus:outline-none"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {/* Password */}
        <label className="block text-sm font-semibold text-gray-600">Password</label>
        <input
          type="password"
          className="w-full p-2 mt-1 mb-3 border rounded focus:outline-none"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {/* Confirm Password */}
        <label className="block text-sm font-semibold text-gray-600">Confirm Password</label>
        <input
          type="password"
          className="w-full p-2 mt-1 mb-3 border rounded focus:outline-none"
          placeholder="Confirm Password"
          value={confirmPass}
          onChange={(e) => setConfirmPass(e.target.value)}
          required
        />

        {/* Divider */}
        <div className="flex items-center mb-4">
          <div className="border-b flex-grow border-gray-300"></div>
          <span className="mx-2 text-gray-400 text-sm">OR</span>
          <div className="border-b flex-grow border-gray-300"></div>
        </div>

        {/* Social Sign Up */}
        <div className="flex justify-center space-x-4 mb-4">
          <button
            type="button"
            onClick={() => handleSocialSignUp(appleProvider)}
            className="border border-gray-300 p-2 rounded-full hover:bg-gray-100 transition"
          >
            <FaApple size={18} />
          </button>
          <button
            type="button"
            onClick={() => handleSocialSignUp(googleProvider)}
            className="border border-gray-300 p-2 rounded-full hover:bg-gray-100 transition"
          >
            <FaGoogle size={18} />
          </button>
          <button
            type="button"
            onClick={() => handleSocialSignUp(facebookProvider)}
            className="border border-gray-300 p-2 rounded-full hover:bg-gray-100 transition"
          >
            <FaFacebookF size={18} />
          </button>
        </div>

        {/* Create Account Button */}
        <button
          onClick={handleSignUp}
          className="w-full bg-black text-white py-3 rounded-full font-semibold hover:bg-gray-800 transition disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </div>
    </div>
  );
}
