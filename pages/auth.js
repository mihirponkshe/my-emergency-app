// pages/auth.js
import { useRouter } from 'next/router';
import { IoArrowBack } from 'react-icons/io5';

export default function Auth() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 flex flex-col justify-center items-center px-4 py-8">
      {/* White Card */}
      <div className="bg-white w-full max-w-sm rounded-lg shadow-lg relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800 transition"
          >
            <IoArrowBack size={24} />
          </button>
          <h2 className="text-lg font-bold text-gray-800">Hello!</h2>
          {/* Skip button removed */}
          <div style={{ width: '24px' }}></div>
        </div>

        {/* Illustration */}
        <div className="px-4 pt-6 pb-4 flex justify-center">
          <img
            src="/signin.jpg"
            alt="Sign In Illustration"
            className="w-full max-w-xs h-auto object-contain"
          />
        </div>

        {/* Buttons */}
        <div className="px-4 pb-6 flex flex-col space-y-3">
          <button
            onClick={() => router.push('/signin-user')}
            className="w-full bg-red-500 text-white py-3 rounded-full font-semibold hover:bg-red-600 transition"
          >
            Sign In as User
          </button>
          <button
            onClick={() => router.push('/signin-admin')}
            className="w-full bg-red-500 text-white py-3 rounded-full font-semibold hover:bg-red-600 transition"
          >
            Sign In as Administration
          </button>
          <div className="text-center text-gray-500 font-semibold">OR</div>
          <button
            onClick={() => router.push('/signup')}
            className="w-full bg-red-500 text-white py-3 rounded-full font-semibold hover:bg-red-600 transition"
          >
            Sign Up
          </button>
          <button
            onClick={() => router.push('/userHome')}
            className="w-full text-red-500 py-3 rounded-full border border-red-300 font-semibold hover:bg-red-50 transition"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
