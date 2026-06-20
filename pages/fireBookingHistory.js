import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getFirestore, collection, query, onSnapshot } from "firebase/firestore";
import { IoArrowBack } from "react-icons/io5";
import { getAuth } from "firebase/auth";

export default function FireBookingHistory() {
  const router = useRouter();
  const db = getFirestore();
  const auth = getAuth();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    // Query for all fire reports from the fireReports collection
    const fireQuery = query(collection(db, "fireReports"));
    const unsubscribeFire = onSnapshot(fireQuery, (snapshot) => {
      const fires = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: "Fire",
          userName: data.userName,
          email: data.email,
          phone: data.phone,
          location: data.location,
          fireStation: data.fireStation,
          time: data.reportedAt ? new Date(data.reportedAt) : new Date(0),
          status: data.status,
        };
      });
      // Sort by time descending (newest first)
      fires.sort((a, b) => b.time - a.time);
      setBookings(fires);
    });

    return () => {
      unsubscribeFire();
    };
  }, [db]);

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
        <h1 className="text-2xl font-bold text-gray-800">Fire Reports History</h1>
      </div>
      {bookings.length === 0 ? (
        <p className="text-gray-600">No booking history found.</p>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-gray-100 p-4 rounded shadow">
              <p className="font-bold">
                User: {booking.userName} ({booking.type})
              </p>
              {booking.email && <p>Email: {booking.email}</p>}
              {booking.phone && <p>Phone: {booking.phone}</p>}
              <p>Location: {booking.location}</p>
              <p>Fire Station: {booking.fireStation}</p>
              <p>
                Reported At:{" "}
                {booking.time ? booking.time.toLocaleString() : "N/A"}
              </p>
              <p>Status: {booking.status ? booking.status : "Pending"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
