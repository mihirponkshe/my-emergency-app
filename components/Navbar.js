// components/Navbar.js
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-gray-800 p-4 text-white">
      <div className="container mx-auto flex justify-between items-center">
        <div className="font-bold">
        <Link href="/">Emergency Response</Link>
        </div>
        <div className="space-x-4">
          <Link href="/dashboard">Dashboard</Link>
        </div>
      </div>
    </nav>
  )
}
