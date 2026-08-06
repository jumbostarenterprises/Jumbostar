"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import { supabase } from "@/lib/supabaseClient";
import {
  ShoppingCart,
  Heart,
  User,
  Package,
  ChevronDown,
  LogOut,
  LayoutGrid,
  Home,
  ShoppingBag
} from "lucide-react";

import { ReactNode } from "react";

interface NavProps {
  href: string;
  icon: ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  requiresAuth?: boolean;
  onAuthRequired?: () => void;
  isLoggedIn?: boolean;
}

export default function Header() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  const pathname = usePathname();

  useEffect(() => {
    const checkUser = () => {
      const savedUser = localStorage.getItem("wholesale_user");
      setUser(savedUser ? JSON.parse(savedUser) : null);
    };

    checkUser();
    window.addEventListener("wholesale_login", checkUser);
    return () => window.removeEventListener("wholesale_login", checkUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("wholesale_user");
    setUser(null);
    setIsProfileOpen(false);
    window.location.href = "/Wholesale/home";
  };

  const fetchCounts = async () => {
    const savedUser = localStorage.getItem("wholesale_user");
    if (!savedUser) {
      setCartCount(0);
      setWishlistCount(0);
      return;
    }
    const userId = JSON.parse(savedUser).id;

    const [{ count: cCount }, { count: wCount }] = await Promise.all([
      supabase.from("cart").select("*", { count: 'exact', head: true }).eq("user_id", userId),
      supabase.from("wishlist").select("*", { count: 'exact', head: true }).eq("user_id", userId)
    ]);

    setCartCount(cCount || 0);
    setWishlistCount(wCount || 0);
  };

  useEffect(() => {
    fetchCounts();
    window.addEventListener("wholesale_login", fetchCounts);
    window.addEventListener("cartUpdated", fetchCounts);
    return () => {
      window.removeEventListener("wholesale_login", fetchCounts);
      window.removeEventListener("cartUpdated", fetchCounts);
    };
  }, [user]);

  // Opens login modal instead of navigating, when user is not logged in
  const handleProtectedClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      setIsAuthOpen(true);
    }
  };

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-lg border-b border-slate-200/60 shadow-sm"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">

            {/* Logo Section */}
            <div className="flex items-center">
              <Link href="/Wholesale/home" className="flex-shrink-0 transition-transform hover:scale-105">
                <Image
                  src="/logoremovebg.png"
                  alt="Logo"
                  width={45}
                  height={55}
                  className="object-contain"
                  priority
                />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center bg-slate-100/50 rounded-full px-2 py-1 gap-1">
              <NavLink
                href="/Wholesale/home"
                icon={<Home size={18} />}
                label="Home"
                active={pathname === "/Wholesale/home"}
              />
              <NavLink
                href="/Wholesale/categories"
                icon={<LayoutGrid size={18} />}
                label="Categories"
                active={pathname === "/Wholesale/categories"}
              />
              <NavLink
                href="/Wholesale/productgallery"
                icon={<ShoppingBag size={18} />}
                label="Products"
                active={pathname === "/Wholesale/productgallery"}
              />
            </nav>

            {/* Action Group */}
            <div className="flex items-center gap-2 sm:gap-3">

              {user ? (
                <div className="flex items-center gap-2 border-l border-slate-200 ml-2 pl-4">

                  {/* Desktop Wishlist */}
                  <Link
                    href="/Wholesale/wishlist"
                    className={`hidden sm:flex relative p-2 rounded-full transition-all ${
                      pathname === "/Wholesale/wishlist"
                        ? "bg-red-50 text-red-600"
                        : "text-slate-600 hover:bg-red-50 hover:text-red-600"
                    }`}
                  >
                    <Heart size={22} />
                    {wishlistCount > 0 && (
                      <span className="absolute top-1 right-1 h-4 w-4 bg-red-600 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                        {wishlistCount}
                      </span>
                    )}
                  </Link>

                  {/* Desktop Cart */}
                  <Link
                    href="/Wholesale/cart"
                    className={`hidden sm:flex relative p-2 rounded-full transition-all ${
                      pathname === "/Wholesale/cart"
                        ? "bg-red-50 text-red-600"
                        : "text-slate-600 hover:bg-red-50 hover:text-red-600"
                    }`}
                  >
                    <ShoppingCart size={22} />
                    {cartCount > 0 && (
                      <span className="absolute top-1 right-1 h-4 w-4 bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                        {cartCount}
                      </span>
                    )}
                  </Link>

                  {/* Profile Dropdown */}
                  <div className="relative ml-2">
                    <button
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="flex items-center gap-2 p-1.5 pr-3 bg-white hover:bg-slate-50 rounded-full border border-slate-200 transition-all shadow-sm"
                    >
                      <div className="h-8 w-8 bg-gradient-to-tr from-slate-800 to-slate-600 rounded-full flex items-center justify-center text-white">
                        <User size={16} />
                      </div>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isProfileOpen && (
                      <div className="absolute right-0 mt-3 w-60 bg-white border border-slate-100 rounded-2xl shadow-xl p-2 z-[60] animate-in fade-in zoom-in duration-200">
                        <div className="px-4 py-3 border-b border-slate-50 mb-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Business Account</p>
                          <p className="text-sm font-semibold text-slate-900 truncate">{user.email}</p>
                        </div>
                        <MenuLink href="/Wholesale/profile" icon={<User size={16} />} label="Account Settings" />
                        <MenuLink href="/Wholesale/orders" icon={<Package size={16} />} label="Order History" />
                        <hr className="my-1 border-slate-50" />
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                          <LogOut size={16} /> Logout
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Not logged in — desktop wishlist/cart icons still visible, open login modal on click */}
                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="hidden sm:flex relative p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-full transition-all"
                  >
                    <Heart size={22} />
                  </button>
                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="hidden sm:flex relative p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-full transition-all"
                  >
                    <ShoppingCart size={22} />
                  </button>

                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="px-5 py-2.5 bg-red-600 text-white rounded-full font-bold text-xs uppercase tracking-wider hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95"
                  >
                    Login
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-6 pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex justify-between items-center max-w-md mx-auto relative">
          <BottomTab
            href="/Wholesale/home"
            icon={<Home size={22} />}
            label="Home"
            active={pathname === "/Wholesale/home"}
          />
          <BottomTab
            href="/Wholesale/categories"
            icon={<LayoutGrid size={22} />}
            label="Explore"
            active={pathname === "/Wholesale/categories"}
          />

          {/* Center Cart Button */}
          {user ? (
            <Link href="/Wholesale/cart" className="relative -mt-12 group">
              <div className="h-16 w-16 bg-red-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-red-200 border-[6px] border-white group-active:scale-90 transition-transform">
                <ShoppingCart size={26} />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 h-5 w-5 bg-slate-900 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-900">Cart</span>
            </Link>
          ) : (
            <button onClick={() => setIsAuthOpen(true)} className="relative -mt-12 group">
              <div className="h-16 w-16 bg-red-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-red-200 border-[6px] border-white group-active:scale-90 transition-transform">
                <ShoppingCart size={26} />
              </div>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-900">Cart</span>
            </button>
          )}

          {user ? (
            <BottomTab
              href="/Wholesale/wishlist"
              icon={<Heart size={22} />}
              label="Wishlist"
              count={wishlistCount}
              active={pathname === "/Wholesale/wishlist"}
            />
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="flex flex-col items-center gap-1 text-slate-400 hover:text-red-600 transition-colors"
            >
              <Heart size={22} />
              <span className="text-[10px] font-bold tracking-tight uppercase">Wishlist</span>
            </button>
          )}

          <BottomTab
            href="/Wholesale/productgallery"
            icon={<ShoppingBag size={22} />}
            label="Shop"
            active={pathname === "/Wholesale/productgallery"}
          />
        </div>
      </nav>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}

// --- Sub-Components ---

function NavLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 ${
        active
          ? "bg-white text-red-600 shadow-sm"
          : "text-slate-600 hover:text-red-600 hover:bg-white"
      }`}
    >
      <span className={active ? "text-red-500" : "text-slate-400"}>{icon}</span>
      {label}
    </Link>
  );
}

function MenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-red-600 rounded-xl transition-all">
      <span className="opacity-70">{icon}</span> {label}
    </Link>
  );
}

function BottomTab({ href, icon, label, count = 0, active }: NavProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 transition-colors ${
        active ? "text-red-600" : "text-slate-400 hover:text-red-600"
      }`}
    >
      <div className="relative">
        {icon}
        {count > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-600 text-white text-[8px] font-bold flex items-center justify-center rounded-full border border-white">
            {count}
          </span>
        )}
      </div>
      <span className="text-[10px] font-bold tracking-tight uppercase">{label}</span>
    </Link>
  );
}