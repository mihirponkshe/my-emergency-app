import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { IoArrowBack } from 'react-icons/io5';
import { FaPlus, FaMinus } from 'react-icons/fa';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

export default function UserAddEmergencyContact() {
  const router = useRouter();
  const auth = getAuth();
  const db = getFirestore();

  const [searchQuery, setSearchQuery] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [description, setDescription] = useState('');
  const [contacts, setContacts] = useState([]);
  const [uid, setUid] = useState(null);

  // Set up real-time listener for emergency contacts once the user is authenticated.
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        const colRef = collection(db, 'users', user.uid, 'emergencyContacts');
        const unsubscribeContacts = onSnapshot(colRef, (snapshot) => {
          let list = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() });
          });
          setContacts(list);
        });
        // Clean up the onSnapshot listener when component unmounts or user changes.
        return () => unsubscribeContacts();
      } else {
        setUid(null);
        setContacts([]);
      }
    });
    return () => unsubscribeAuth();
  }, [auth, db]);

  // Filter contacts by search query
  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add a new contact to the subcollection
  const handleAddContact = async () => {
    if (!uid) {
      alert('No user logged in.');
      return;
    }
    if (!contactName || !contactNumber) {
      alert('Please fill out contact name and number.');
      return;
    }
    try {
      await addDoc(collection(db, 'users', uid, 'emergencyContacts'), {
        name: contactName,
        number: contactNumber,
        note: description,
        addedAt: new Date().toISOString(),
      });
      alert('Contact added!');
      setContactName('');
      setContactNumber('');
      setDescription('');
      // No need to manually reload contacts because onSnapshot updates the state.
    } catch (error) {
      alert(error.message);
    }
  };

  // Remove a contact from the subcollection
  const handleRemoveContact = async (contactId) => {
    if (!uid) {
      alert('No user logged in.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'users', uid, 'emergencyContacts', contactId));
      alert('Contact removed!');
      // onSnapshot will automatically update the contacts state.
    } catch (error) {
      alert(error.message);
    }
  };

  // Clear input fields
  const handleClear = () => {
    setContactName('');
    setContactNumber('');
    setDescription('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 px-4 py-6 relative">
      {/* Header */}
      <div className="flex items-center mb-4">
        <button onClick={() => router.back()} className="text-gray-700 mr-2">
          <IoArrowBack size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Add Emergency Contact</h1>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          className="w-full p-2 rounded border focus:outline-none"
          placeholder="Search for Contact"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="mb-2 text-gray-600 font-semibold">Description</div>
      <p className="text-gray-600 mb-4">Add your emergency contacts here!</p>

      {/* Existing Contacts */}
      <div className="space-y-3 mb-4">
        {filteredContacts.map((c) => (
          <div key={c.id} className="bg-red-200 p-3 rounded flex justify-between items-center">
            <div>
              <p className="font-bold">Name: {c.name}</p>
              <p>Contact number: {c.number}</p>
              {c.note && <p className="mt-1 text-sm text-gray-700">{c.note}</p>}
            </div>
            <button
              onClick={() => handleRemoveContact(c.id)}
              className="ml-4 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Contact Form */}
      <div className="bg-white p-4 rounded shadow mb-4">
        <label className="block text-sm font-semibold text-gray-600">Name</label>
        <input
          type="text"
          className="w-full p-2 mb-3 border rounded focus:outline-none"
          placeholder="Contact Name"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />

        <label className="block text-sm font-semibold text-gray-600">Contact Number</label>
        <input
          type="tel"
          className="w-full p-2 mb-3 border rounded focus:outline-none"
          placeholder="e.g. +1 234 567 8901"
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value)}
        />

        <label className="block text-sm font-semibold text-gray-600">Note</label>
        <textarea
          className="w-full p-2 mb-3 border rounded focus:outline-none"
          placeholder="Any additional note..."
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex space-x-2">
          <button
            onClick={handleAddContact}
            className="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600 transition"
          >
            Done
          </button>
          <button
            onClick={handleClear}
            className="flex-1 bg-gray-300 text-black py-2 rounded hover:bg-gray-400 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Floating Plus/Minus Buttons (Optional) */}
      <button
        className="absolute bottom-8 right-16 bg-red-500 text-white p-4 rounded-full shadow-lg hover:bg-red-600 transition"
        onClick={handleAddContact}
        title="Add new contact"
      >
        <FaPlus />
      </button>
      <button
        className="absolute bottom-8 right-4 bg-gray-300 text-black p-4 rounded-full shadow-lg hover:bg-gray-400 transition"
        onClick={handleClear}
        title="Clear form"
      >
        <FaMinus />
      </button>
    </div>
  );
}
