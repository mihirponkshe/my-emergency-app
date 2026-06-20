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

export default function SignInUser() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();
  const auth = getAuth();
  const db = getFirestore();

  // Social Providers
  const googleProvider = new GoogleAuthProvider();
  const facebookProvider = new FacebookAuthProvider();
  const appleProvider = new OAuthProvider('apple.com');

  // Helper: Check user role from Firestore (record existence already checked)
  const checkUserRole = async (uid) => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    const data = userDoc.data();
    if (data.role === 'user') {
      setRedirecting(true);
      router.push('/userProfile'); // Redirect to user profile view page
    } else {
      alert("This account is not registered as a user. Please sign in from the admin page.");
    }
  };

  // Email/Password Sign In
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      alert('Logged in as User successfully!');
      await checkUserRole(userCredential.user.uid);
    } catch (error) {
      alert(error.message);
    }
  };

  // Social Sign In Handlers
  const handleGoogleSignIn = async () => {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const uid = userCredential.user.uid;
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        alert("This Google account is not registered. Please sign up first.");
        auth.signOut();
        return;
      }
      alert('Logged in with Google (User) successfully!');
      await checkUserRole(uid);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      const userCredential = await signInWithPopup(auth, facebookProvider);
      const uid = userCredential.user.uid;
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        alert("This Facebook account is not registered. Please sign up first.");
        auth.signOut();
        return;
      }
      alert('Logged in with Facebook (User) successfully!');
      await checkUserRole(uid);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const userCredential = await signInWithPopup(auth, appleProvider);
      const uid = userCredential.user.uid;
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        alert("This Apple account is not registered. Please sign up first.");
        auth.signOut();
        return;
      }
      alert('Logged in with Apple (User) successfully!');
      await checkUserRole(uid);
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

  if (redirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-xl font-bold text-gray-700">Loading...</p>
      </div>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-500 via-red-500 to-red-600">
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
          <h2 className="text-lg font-bold text-gray-800">Sign In as User</h2>
          <div style={{ width: "24px" }}></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-gray-600">Email</label>
          <input
            type="email"
            className="w-full p-2 mt-1 mb-3 border rounded focus:outline-none"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="block text-sm font-semibold text-gray-600">Password</label>
          <input
            type="password"
            className="w-full p-2 mt-1 mb-1 border rounded focus:outline-none"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="text-right mb-4">
            <button type="button" onClick={handleForgotPassword} className="text-xs text-red-500 hover:underline">
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
            className="w-full bg-red-500 text-white py-3 rounded-full font-semibold hover:bg-red-600 transition"
          >
            Sign In
          </button>
        </form>

        {/* Sign Up Link */}
        <div className="mt-4 text-center">
          <span className="text-sm text-gray-500">Need An Account?</span>{" "}
          <a href="/signup" className="text-red-500 hover:underline text-sm">
            Sign Up
          </a>
        </div>
      </div>
    </main>
  );
}
  