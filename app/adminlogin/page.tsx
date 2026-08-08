"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function AdminLogin() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const ADMIN_EMAIL = "Jsadmin@gmail.com"
  const ADMIN_PASSWORD = "Jsadmin@321"

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem("adminAuth", "true")
      router.push("/admin/dashboard")
    } else {
      setError("Invalid Admin Email or Password")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 border border-gray-100">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="Admin Logo"
            width={110}
            height={110}
            className="object-contain"
          />
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
          Admin Panel
        </h2>

        <p className="text-center text-gray-500 text-sm mb-8">
          Sign in to manage your store
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-5 text-center border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 
                         text-gray-900 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500
                         transition"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 
                         text-gray-900 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500
                         transition"
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 
                       text-white font-semibold py-3 rounded-xl 
                       shadow-md hover:shadow-lg 
                       transition duration-300"
          >
            Login to Dashboard
          </button>

        </form>
      </div>
    </div>
  )
}
