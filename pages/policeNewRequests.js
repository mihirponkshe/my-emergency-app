import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { IoArrowBack } from "react-icons/io5";

export default function PoliceNewRequests() {
  const router = useRouter();
  const db = getFirestore();
  const auth = getAuth();

  // State for pending crime reports only
  const [bookings, setBookings] = useState([]);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // Query pending crime reports only
    const crimeQuery = query(
      collection(db, "crimeReports"),
      where("status", "==", "pending")
    );
    const unsubscribeCrime = onSnapshot(crimeQuery, (snapshot) => {
      const crimes = snapshot.docs.map((doc) => ({
        id: doc.id,
        type: "crime",
        ...doc.data(),
      }));
      setBookings(crimes);
    });

    return () => {
      unsubscribeCrime();
    };
  }, [db]);

  // Sort bookings by reported time (newest first)
  const sortedBookings = bookings.sort((a, b) => {
    const timeA = a.reportedAt ? new Date(a.reportedAt) : new Date(0);
    const timeB = b.reportedAt ? new Date(b.reportedAt) : new Date(0);
    return timeB - timeA;
  });

  // Handle "Address" button click: update the booking status in the crimeReports collection
  const handleAddress = async (booking) => {
    setUpdating(true);
    try {
      const bookingRef = doc(db, "crimeReports", booking.id);
      await updateDoc(bookingRef, { status: "addressed" });
      alert("Booking has been addressed and moved to booking history.");
      // Remove the addressed booking from the state list
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    } catch (error) {
      console.error("Error updating booking status:", error);
      alert("Error addressing booking. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4">
      {/* Header */}
      <div className="flex items-center mb-4">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-800 mr-4"
        >
          <IoArrowBack size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">New Crime Reports</h1>
      </div>
      {sortedBookings.length === 0 ? (
        <p className="text-gray-600">No new crime reports found.</p>
      ) : (
        <div className="space-y-4">
          {sortedBookings.map((booking) => (
            <div key={booking.id} className="bg-gray-100 p-4 rounded shadow">
              <p className="font-bold">
                User: {booking.userName} (Crime Report)
              </p>
              {booking.email && <p>Email: {booking.email}</p>}
              {booking.phone && <p>Phone: {booking.phone}</p>}
              <p>Location: {booking.location}</p>
              <p>Crime Type: {booking.crimeType}</p>
              <p>
                Reported At:{" "}
                {booking.reportedAt
                  ? new Date(booking.reportedAt).toLocaleString()
                  : "N/A"}
              </p>
              <p>Status: {booking.status}</p>
              <button
                onClick={() => handleAddress(booking)}
                className={`mt-4 w-full py-2 rounded-full font-semibold transition ${
                  booking.status === "addressed"
                    ? "bg-green-500 text-white"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
                disabled={updating || booking.status === "addressed"}
              >
                {updating
                  ? "Updating..."
                  : booking.status === "addressed"
                  ? "Addressed!"
                  : "Address"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
