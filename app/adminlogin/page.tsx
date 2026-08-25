"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Eye, EyeOff, Lock, Mail, ShieldAlert } from "lucide-react"

export default function AdminLogin() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="relative min-h-screen bg-black flex items-center justify-center px-4 overflow-hidden" style={{ fontFamily: 'var(--font-display)' }}>
      {/* Subtle background glow */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-[0_20px_50px_rgba(255,255,255,0.07)] p-8 sm:p-10 border border-slate-100">
        
        {/* Logo */}
        <div className="flex justify-center mb-5">
          <div className="relative h-24 w-24 rounded-2xl bg-slate-50 border border-slate-100 p-2 shadow-inner flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Admin Logo"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 mb-2">
            Secure Portal
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Admin Dashboard
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Sign in to manage your system parameters
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2.5 bg-red-50 text-red-600 text-sm p-3.5 rounded-2xl mb-6 border border-red-200/60 shadow-sm">
            <ShieldAlert size={18} className="shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          
          {/* Email Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Mail size={18} />
              </span>
              <input
                type="email"
                required
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 
                           text-slate-900 placeholder:text-slate-400 text-sm
                           focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600
                           transition-all duration-200"
              />
            </div>
          </div>

          {/* Password Input with Eye Toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3 rounded-xl border border-slate-200 bg-slate-50/50 
                           text-slate-900 placeholder:text-slate-400 text-sm
                           focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600
                           transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600
                       text-white font-semibold py-3.5 rounded-xl text-sm
                       shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/35
                       active:scale-[0.98] transition-all duration-200 cursor-pointer mt-2"
          >
            Login to Dashboard
          </button>

        </form>
      </div>
    </div>
  )
}