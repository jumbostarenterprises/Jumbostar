"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ImageOff, ArrowRight, ShoppingCart, Minus, Plus, X, Tag } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import toast, { Toaster } from "react-hot-toast";

const getUserId = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;
  const userStr = localStorage.getItem("wholesale_user");
  return userStr ? JSON.parse(userStr).id : null;
};

export default function ProductCard({ product }: { product: any }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [showMoqModal, setShowMoqModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const variants = product.product_variants || [];
  const currentVariant = variants[activeIdx] || {};
  const displayImage = product.product_images?.[0]?.image_url;

  const wholesale = currentVariant.wholesale_price || 0;
  const mrp = currentVariant.mrp || 0;
  const stock = currentVariant.stock || 0;
  const minQty = currentVariant.min_quantity || 1;
  const maxQty = currentVariant.max_quantity || stock || 9999; 
  
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isInCart, setIsInCart] = useState(false);

  const getTieredPrice = (qty: number) => {
    const tiers = currentVariant.variant_tiers || [];
    const applicableTier = [...tiers]
      .sort((a, b) => b.min_qty - a.min_qty)
      .find(t => qty >= t.min_qty);
    return applicableTier ? parseFloat(applicableTier.price) : wholesale;
  };

  const currentPrice = getTieredPrice(quantity);

  useEffect(() => {
    const checkStatus = async () => {
      const userId = await getUserId();
      if (!userId) return;

      const { data: wish } = await supabase.from("wishlist").select("id").eq("user_id", userId).eq("product_id", product.id).maybeSingle();
      if (wish) setIsInWishlist(true);

      const variantIds = variants.map((v: any) => v.id);
      const { data: cart } = await supabase.from("cart").select("id").eq("user_id", userId).in("variant_id", variantIds).maybeSingle();
      if (cart) setIsInCart(true);
    };
    checkStatus();
  }, [product.id, variants]);

  // Don't render this product at all if no variant has stock.
  // This check MUST come after all hooks above so hook order stays
  // identical on every render regardless of stock status.
  const hasAnyStock = variants.some((v: any) => (v.stock || 0) > 0);
  if (!hasAnyStock) return null;

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevents link navigation
    e.stopPropagation(); // Prevents event bubbling
    const userId = await getUserId();
    if (!userId) { toast.error("Please login first"); return; }
    if (isInWishlist) {
      const { error } = await supabase.from("wishlist").delete().eq("user_id", userId).eq("product_id", product.id);
      if (!error) { setIsInWishlist(false); toast.success("Removed"); }
    } else {
      const { error } = await supabase.from("wishlist").insert([{ user_id: userId, product_id: product.id }]);
      if (!error) { setIsInWishlist(true); toast.success("Saved!"); }
    }
  };

  const handleAddToCartClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevents link navigation
    e.stopPropagation(); // Prevents event bubbling
    if (stock <= 0) { toast.error("This item is out of stock"); return; }
    const userId = await getUserId();
    if (!userId) { toast.error("Login to source", { icon: '🔒' }); return; }
    setQuantity(minQty);
    setShowMoqModal(true);
  };

  const handleVariantClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault(); // Prevents link navigation
    e.stopPropagation(); // Prevents event bubbling
    if ((variants[index]?.stock || 0) <= 0) {
      toast.error("This variant is out of stock");
    }
    setActiveIdx(index);
  };

  const confirmAddToCart = async () => {
    setLoading(true);
    const userId = await getUserId();
    try {
      const { error } = await supabase.from("cart").insert([{ user_id: userId, variant_id: currentVariant.id, quantity }]);
      if (error) throw error;
      setIsInCart(true);
      toast.success("Added to cart!");
      setShowMoqModal(false);
    } catch (err) { toast.error("Error updating cart"); }
    finally { setLoading(false); }
  };

  return (
    // Wrap entire card component with standard semantic Next.js link routing
    <Link 
      href={`/Wholesale/products/${product.id}`}
      className="group bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-2 md:p-4 transition-all duration-500 hover:shadow-xl border border-slate-50 flex flex-col h-full relative cursor-pointer"
    >
      <Toaster position="bottom-right" />

      {/* 1. IMAGE SECTION */}
      <div className="relative aspect-square overflow-hidden rounded-[1.2rem] md:rounded-[2rem] bg-slate-50 mb-3 group/img">
        <div className="absolute top-2 left-2 z-20">
          <div className={`px-2 py-0.5 rounded-full flex items-center gap-1 border backdrop-blur-md ${stock > 0 ? "bg-green-500/10 border-green-500/20 text-green-600" : "bg-red-500/10 border-red-500/20 text-red-600"}`}>
            <span className="text-[7px] md:text-[8px] font-black uppercase tracking-tight md:tracking-widest">
              {stock > 0 ? `${stock} In Stock` : "Sold Out"}
            </span>
          </div>
        </div>

        <div className="absolute top-2 right-2 z-20 flex flex-col gap-1.5 transition-all">
          <button onClick={toggleWishlist} className={`h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center shadow-sm transition-all ${isInWishlist ? "bg-red-50 text-red-600" : "bg-white/80 text-slate-400"}`}>
            <Heart size={14} fill={isInWishlist ? "currentColor" : "none"} />
          </button>
          <button
            onClick={handleAddToCartClick}
            disabled={stock <= 0}
            className={`h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center shadow-sm transition-all ${
              stock <= 0
                ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                : isInCart ? "bg-slate-900 text-white" : "bg-white/80 text-slate-900"
            }`}
          >
            <ShoppingCart size={14} />
          </button>
        </div>

        {displayImage ? (
          <Image src={displayImage} alt={product.name} fill className="object-contain p-4 md:p-8 transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-200"><ImageOff size={30} /></div>
        )}
      </div>

      {/* 2. VARIANT SELECTION */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3 pb-1">
        {variants.map((v: any, i: number) => (
          <button
            key={v.id}
            onClick={(e) => handleVariantClick(e, i)}
            className={`whitespace-nowrap px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeIdx === i ? "bg-slate-900 text-white shadow-md" : "bg-slate-50 text-slate-400"}`}
          >
            {v.variant}{v.unit}
          </button>
        ))}
      </div>

      {/* 3. CONTENT AREA */}
      <div className="px-1 md:px-2 flex flex-col flex-grow">
        <p className="text-[7px] md:text-[9px] font-black text-red-600 uppercase tracking-widest mb-1">{product.brand || "JumboStar"}</p>
        <h3 className="text-[11px] md:text-sm font-black text-slate-900 mb-2 md:mb-4 line-clamp-2 leading-tight uppercase tracking-tight">{product.name}</h3>

        <div className="mt-auto flex items-center justify-between border-t border-slate-50 pt-3">
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] font-bold text-slate-300 line-through leading-none">MRP₹{mrp}</span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg md:text-2xl font-black text-slate-900 tracking-tighter">₹{wholesale}</span>
              <span className="text-[6px] md:text-[8px] font-black text-slate-400 uppercase leading-none">/Wholesale</span>
            </div>
          </div>
          {/* Changed standard Link here to a simple visual indicator div to avoid invalid nested structural code */}
          <div className="h-8 w-8 md:h-12 md:w-12 bg-slate-50 text-slate-900 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all">
            <ArrowRight size={16} />
          </div>
        </div>
      </div>

      {/* --- MOQ & MAX MODAL --- */}
      {showMoqModal && (
        <div 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} 
          className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 md:p-4"
        >
          <div className="bg-white rounded-t-[2rem] md:rounded-[2.5rem] w-full max-w-sm p-6 md:p-8 shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-lg md:text-xl font-black text-slate-900 uppercase">Bulk Sourcing</h4>
                <div className="flex gap-2 mt-1">
                  <span className="text-[8px] font-bold text-slate-400 uppercase border border-slate-200 px-2 py-0.5 rounded-md">Min: {minQty}</span>
                  <span className="text-[8px] font-bold text-red-500 uppercase border border-red-100 px-2 py-0.5 rounded-md bg-red-50">Max: {maxQty}</span>
                </div>
              </div>
              <button onClick={() => setShowMoqModal(false)} className="p-2 bg-slate-50 rounded-full"><X size={18} /></button>
            </div>

            <div className="bg-slate-50 rounded-2xl md:rounded-3xl p-4 md:p-6 flex items-center justify-between mb-6">
              <button 
                disabled={quantity <= minQty} 
                onClick={() => setQuantity(q => q - 1)} 
                className="h-10 w-10 md:h-12 md:w-12 bg-white rounded-xl flex items-center justify-center disabled:opacity-30 shadow-sm transition-all active:scale-95"
              >
                <Minus size={18} />
              </button>
              
              <div className="text-center">
                <span className="text-2xl md:text-3xl font-black text-slate-900">{quantity}</span>
                <p className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase">Units</p>
              </div>

              <button 
                disabled={quantity >= maxQty} 
                onClick={() => setQuantity(q => q + 1)} 
                className="h-10 w-10 md:h-12 md:w-12 bg-slate-900 text-white rounded-xl flex items-center justify-center disabled:bg-slate-300 transition-all active:scale-95"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between mb-4 px-2">
               <div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Price per Unit</p>
                <p className="text-sm font-black text-slate-900">₹{currentPrice.toLocaleString()}</p>
               </div>
               {currentPrice < wholesale && (
                 <span className="flex items-center gap-1 text-[8px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-full animate-pulse">
                   <Tag size={10} /> TIER APPLIED
                 </span>
               )}
            </div>

            <button 
                onClick={confirmAddToCart} 
                disabled={loading || stock <= 0} 
                className={`w-full py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm shadow-xl transition-all ${
                  stock <= 0
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    : "bg-red-600 text-white shadow-red-100 hover:bg-slate-900"
                }`}
            >
              {loading ? "Adding..." : stock <= 0 ? "Out of Stock" : `Add to Cart • ₹${(currentPrice * quantity).toLocaleString()}`}
            </button>
          </div>
        </div>
      )}
    </Link>
  );
}