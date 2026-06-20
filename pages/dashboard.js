// pages/dashboard.js
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Dashboard() {
  const router = useRouter();

  const handleBooking = (service) => {
    alert(`Booking for ${service} service...`);
    // Here you can route to a detailed booking page for each service if needed.
  }

  return (
    <div>
      <Navbar />
      <main className="min-h-screen container mx-auto p-4">
        <h2 className="text-3xl font-bold mb-8">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border rounded p-6 flex flex-col items-center">
            <img src="/placeholder.jpg" alt="Ambulance" className="w-24 h-24 mb-4"/>
            <h3 className="text-xl font-semibold mb-2">Ambulance</h3>
            <button onClick={() => handleBooking("Ambulance")} className="mt-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Book Now
            </button>
          </div>
          <div className="border rounded p-6 flex flex-col items-center">
            <img src="/placeholder.jpg" alt="Police" className="w-24 h-24 mb-4"/>
            <h3 className="text-xl font-semibold mb-2">Police</h3>
            <button onClick={() => handleBooking("Police")} className="mt-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Book Now
            </button>
          </div>
          <div className="border rounded p-6 flex flex-col items-center">
            <img src="/placeholder.jpg" alt="Fire" className="w-24 h-24 mb-4"/>
            <h3 className="text-xl font-semibold mb-2">Fire</h3>
            <button onClick={() => handleBooking("Fire")} className="mt-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Book Now
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
