"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  ListTree, 
  CreditCard, 
  Coins,
  PackagePlus,
  Edit,
  Truck,
  Users,
  ShoppingCart,
  ImageIcon,
  LogOut,
  ChevronRight,
  UserCircle,
  Landmark,
  Menu,
  X
} from "lucide-react";

export default function AdminHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const adminEmail = "Jsadmin@gmail.com";

  useEffect(() => {
    setMounted(true);
    const isAdmin = localStorage.getItem("adminAuth");
    if (!isAdmin) {
      router.push("/adminlogin");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("adminAuth");
    router.push("/adminlogin");
  };

  const menuItems = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Main Categories", path: "/admin/categories", icon: Boxes },
    { name: "Sub Categories", path: "/admin/subcategories", icon: ListTree },
    { name: "Add Product", path: "/admin/add-product", icon: PackagePlus },
    { name: "Update Price & Stock", path: "/admin/update-stock", icon: Edit },
    { name: "Wholesale Management", path: "/admin/wholesale", icon: Users },
    { name: "Bank Details", path: "/admin/bank-details", icon: Landmark },
    { name: "Orders", path: "/admin/orders", icon: ShoppingCart },
    { name: "Payment Approvals", path: "/admin/payment-approvals", icon: CreditCard },
    { name: "Delivery Allotment", path: "/admin/delivery", icon: Truck },
    { name: "Delivery Payment", path: "/admin/delivery/payments", icon: Coins },
    { name: "Banner Management", path: "/admin/banner", icon: ImageIcon },
  ];

  if (!mounted) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#FDFEFF]" style={{ fontFamily: 'var(--font-display)' }}>
      
      {/* --- MOBILE OVERLAY BACKDROP --- */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        
        {/* Logo Section */}
        <div className="p-6 md:p-8 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => { router.push('/admin/dashboard'); setMobileMenuOpen(false); }}>
            <div className="w-12 h-12 bg-red-600 text-white flex items-center justify-center rounded-2xl font-black text-2xl shadow-lg shadow-red-200 group-hover:rotate-6 transition-transform">
              J
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tighter">
                JUMBO<span className="text-red-600">STAR</span>
              </h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">System Active</span>
              </div>
            </div>
          </div>
          {/* Close button on mobile view */}
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-2 text-gray-400 hover:text-gray-600 rounded-xl"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto scrollbar-hide">
          <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 mt-2">Main Controls</p>
          
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            return (
              <button
                key={item.name}
                onClick={() => {
                  router.push(item.path);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between group px-4 py-3 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? "bg-red-600 text-white shadow-xl shadow-red-100"
                    : "text-gray-500 hover:bg-red-50 hover:text-red-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl transition-colors ${
                    isActive ? "bg-white/20 shadow-inner" : "bg-gray-50 group-hover:bg-white"
                  }`}>
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-sm font-bold tracking-tight ${isActive ? "font-black" : ""}`}>
                    {item.name}
                  </span>
                </div>
                {isActive && <ChevronRight size={14} className="opacity-70 animate-pulse" />}
              </button>
            );
          })}
        </nav>

        {/* Logout Section */}
        <div className="p-6 mt-auto border-t border-gray-50">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all group"
          >
            <div className="p-2 bg-gray-50 group-hover:bg-white rounded-xl transition-colors">
              <LogOut size={18} />
            </div>
            <span className="text-sm font-bold">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col ml-0 md:ml-72 w-full">

        {/* STICKY TOP HEADER */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 md:px-10 py-4 md:py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* Hamburger button for mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Open Menu"
            >
              <Menu size={20} />
            </button>
            <div>
              <h2 className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                Administration
              </h2>
              <p className="text-base md:text-xl font-bold text-gray-900 tracking-tight truncate max-w-[180px] sm:max-w-xs">
                {pathname === "/admin/dashboard" ? "Dashboard Overview" : pathname.split("/").pop()?.replace("-", " ").toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-gray-50 pl-2 pr-3 md:pr-4 py-1.5 rounded-2xl border border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shrink-0">
                <UserCircle size={20} />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase leading-none">Logged in as</span>
                <span className="text-xs font-bold text-gray-800 tracking-tight">{adminEmail}</span>
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-2 md:p-6">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-3 duration-500">
            {children}
          </div>
        </main>
      </div>

      {/* Hide Scrollbar CSS */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}