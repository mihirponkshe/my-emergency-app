import { useState } from 'react';
import { useRouter } from 'next/router';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  OAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { IoArrowBack } from 'react-icons/io5';
import { FaGoogle, FaApple, FaFacebookF } from 'react-icons/fa';

export default function SignInAdmin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const auth = getAuth();
  const db = getFirestore();

  // Social Providers
  const googleProvider = new GoogleAuthProvider();
  const facebookProvider = new FacebookAuthProvider();
  const appleProvider = new OAuthProvider('apple.com');

  // Helper: Check if Firestore document exists and role is 'admin'
  // Returns the admin data if valid; otherwise null.
  const verifyAdmin = async (uid) => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      alert("This account is not registered. Please sign up first.");
      await auth.signOut();
      return null;
    }
    const data = userDoc.data();
    if (data.role !== 'admin') {
      alert("This account is not registered as an admin. Please sign in from the user page.");
      await auth.signOut();
      return null;
    }
    return data;
  };

  // Redirect admin based on instituteType
  const redirectBasedOnInstitute = (adminData) => {
    if (adminData.instituteType === "Hospital") {
      router.push('/ambulanceAdmin');
    } else if (adminData.instituteType === "Fire Brigade") {
      router.push('/fireAdmin');
    } else if (adminData.instituteType === "Police Station") {
      router.push('/policeAdmin');
    } else {
      router.push('/adminProfile'); // Fallback in case instituteType is missing or unexpected.
    }
  };

  // Email/Password Sign In
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const adminData = await verifyAdmin(userCredential.user.uid);
      if (adminData) {
        alert('Logged in as Admin successfully!');
        redirectBasedOnInstitute(adminData);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  // Social Sign In Handlers
  const handleGoogleSignIn = async () => {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const adminData = await verifyAdmin(userCredential.user.uid);
      if (adminData) {
        alert('Logged in with Google (Admin) successfully!');
        redirectBasedOnInstitute(adminData);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      const userCredential = await signInWithPopup(auth, facebookProvider);
      const adminData = await verifyAdmin(userCredential.user.uid);
      if (adminData) {
        alert('Logged in with Facebook (Admin) successfully!');
        redirectBasedOnInstitute(adminData);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const userCredential = await signInWithPopup(auth, appleProvider);
      const adminData = await verifyAdmin(userCredential.user.uid);
      if (adminData) {
        alert('Logged in with Apple (Admin) successfully!');
        redirectBasedOnInstitute(adminData);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  // Forgot Password Handler
  const handleForgotPassword = async () => {
    if (!email) {
      alert("Please enter your email to reset your password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent!");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-200 via-purple-300 to-purple-500">
      {/* Card Container */}
      <div className="w-full max-w-md p-6 bg-white rounded shadow-md relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800 transition"
          >
            <IoArrowBack size={24} />
          </button>
          <h2 className="text-lg font-bold text-gray-800">Sign In as Admin</h2>
          {/* Placeholder for alignment */}
          <div style={{ width: "24px" }}></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-gray-600">Admin Email</label>
          <input
            type="email"
            className="w-full p-2 mt-1 mb-3 border rounded focus:outline-none"
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="block text-sm font-semibold text-gray-600">Password</label>
          <input
            type="password"
            className="w-full p-2 mt-1 mb-1 border rounded focus:outline-none"
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="text-right mb-4">
            <button type="button" onClick={handleForgotPassword} className="text-xs text-purple-500 hover:underline">
              Forgot your password?
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center mb-4">
            <div className="border-b flex-grow border-gray-300"></div>
            <span className="mx-2 text-gray-400 text-sm">OR</span>
            <div className="border-b flex-grow border-gray-300"></div>
          </div>

          {/* Social Logins */}
          <div className="flex justify-center space-x-4 mb-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="border border-gray-300 p-2 rounded-full hover:bg-gray-100 transition"
            >
              <FaGoogle size={18} />
            </button>
            <button
              type="button"
              onClick={handleAppleSignIn}
              className="border border-gray-300 p-2 rounded-full hover:bg-gray-100 transition"
            >
              <FaApple size={18} />
            </button>
            <button
              type="button"
              onClick={handleFacebookSignIn}
              className="border border-gray-300 p-2 rounded-full hover:bg-gray-100 transition"
            >
              <FaFacebookF size={18} />
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-purple-500 text-white py-3 rounded-full font-semibold hover:bg-purple-600 transition"
          >
            Sign In
          </button>
        </form>

        {/* Sign Up Link */}
        <div className="mt-4 text-center">
          <span className="text-sm text-gray-500">Need An Account?</span>{" "}
          <a href="/signup" className="text-purple-500 hover:underline text-sm">
            Sign Up
          </a>
        </div>
      </div>
    </main>
  );
}
