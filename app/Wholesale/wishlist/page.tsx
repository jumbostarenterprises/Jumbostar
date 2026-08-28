"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ProductCard from "@/Components/ProductCard";
import { Heart, ShoppingBag, Loader2, LockKeyhole, ArrowRight } from "lucide-react";
import Link from "next/link";
import AuthModal from "@/Components/AuthModal"; // Path adjusted to your folder

export default function WishlistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userStr = localStorage.getItem("wholesale_user");
    
    if (session?.user || userStr) {
      setIsLoggedIn(true);
      const userId = session?.user?.id || JSON.parse(userStr!).id;
      fetchWishlist(userId);
    } else {
      setIsLoggedIn(false);
      setLoading(false);
    }
  };

  const fetchWishlist = async (userId: string) => {
    try {
      // Fetch wishlist with nested product and variant data
      const { data, error } = await supabase
        .from("wishlist")
        .select(`
          id,
          products (
            *,
            product_images (image_url),
            product_variants (*)
          )
        `)
        .eq("user_id", userId);

      if (error) throw error;

      // Format the data to match what ProductCard expects
      const formattedProducts = data?.map((item: any) => item.products) || [];
      setItems(formattedProducts);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    } finally {
      setLoading(false);
    }
  };

  // Called by ProductCard the moment a product is unhearted, so the card
  // disappears from this grid immediately instead of just flipping its
  // internal heart-filled state.
  const handleWishlistRemove = (productId: string) => {
    setItems((prev) => prev.filter((p) => p.id !== productId));
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <Loader2 className="animate-spin text-red-600" size={40} />
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Accessing Vault...</p>
      </div>
    );
  }

  // NOT LOGGED IN STATE
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white rounded-[2.5rem] p-8 md:p-16 text-center border border-slate-100 shadow-2xl max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 transform -rotate-6">
            <LockKeyhole className="text-red-600" size={28} />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter mb-3">Private Collection</h2>
          <p className="text-slate-500 text-xs md:text-sm mb-8 leading-relaxed">
            Your wishlist is saved to your wholesale account. Please login to view your curated selections.
          </p>
          <button 
            onClick={() => setShowAuthModal(true)}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-all shadow-lg active:scale-95"
          >
            Sign In to View
          </button>
          <AuthModal isOpen={showAuthModal} onClose={() => { setShowAuthModal(false); checkUser(); }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header Section - Mobile Optimized */}
      <div className="bg-slate-50 py-10 md:py-16 px-4 mb-8 md:mb-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 md:gap-4 mb-3">
            <div className="h-10 w-10 md:h-12 md:w-12 bg-red-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-100">
              <Heart size={20} fill="currentColor" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter">
              My Wishlist
            </h1>
          </div>
          <p className="text-slate-500 text-xs md:text-sm font-medium max-w-md leading-relaxed">
            {items.length} premium products currently saved in your wholesale sourcing vault.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {items.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-8">
            {items.map((product) => (
              <div key={product.id} className="w-full">
                <ProductCard product={product} onWishlistRemove={handleWishlistRemove} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 md:py-24 border-2 border-dashed border-slate-100 rounded-[2rem] md:rounded-[3rem] bg-slate-50/30">
            <div className="bg-white h-16 w-16 md:h-20 md:w-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <ShoppingBag className="text-slate-200" size={28} />
            </div>
            <h3 className="text-lg md:text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Vault is Empty</h3>
            <p className="text-slate-400 text-xs md:text-sm mb-8 px-6">Explore our latest inventory to start building your order.</p>
            <Link 
              href="/Wholesale/productgallery" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] md:text-xs hover:bg-red-600 transition-all shadow-xl"
            >
              Browse Products <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}