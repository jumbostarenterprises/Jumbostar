"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ImageOff, ShoppingCart, Minus, Plus, X, Tag, Zap, Flame } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import toast, { Toaster } from "react-hot-toast";

const getUserId = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;
  const userStr = localStorage.getItem("wholesale_user");
  return userStr ? JSON.parse(userStr).id : null;
};

// Shared "torn ticket" clip — reused on the price tag and the Buy Now
// button so the two actions read as one continuous shipping-label motif.
const TAG_CLIP = "polygon(0 0, 100% 0, 100% 100%, 10px 100%, 0 calc(100% - 10px))";

export default function ProductCard({
  product,
  onWishlistRemove,
}: {
  product: any;
  onWishlistRemove?: (productId: string) => void;
}) {
  const router = useRouter();
  const [activeIdx, setActiveIdx] = useState(0);
  const [showMoqModal, setShowMoqModal] = useState(false);
  const [modalMode, setModalMode] = useState<"cart" | "buy">("cart");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  // Track client mount so we only touch `document.body` after hydration
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const variants = product.product_variants || [];
  const currentVariant = variants[activeIdx] || {};
  const displayImage = product.product_images?.[0]?.image_url;

  const wholesale = currentVariant.wholesale_price || 0;
  const mrp = currentVariant.mrp || 0;
  const stock = currentVariant.stock || 0;
  const minQty = currentVariant.min_quantity || 1;
  const maxQty = currentVariant.max_quantity || stock || 9999;

  const hasAnyStock = variants.some((v: any) => (v.stock || 0) > 0);
  const isOutOfStock = stock <= 0;

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

  // Lock background scroll while the modal is open
  useEffect(() => {
    if (showMoqModal) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [showMoqModal]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasAnyStock) {
      toast.error("Product is out of stock");
      return;
    }
    const userId = await getUserId();
    if (!userId) { toast.error("Please login first"); return; }
    if (isInWishlist) {
      const { error } = await supabase.from("wishlist").delete().eq("user_id", userId).eq("product_id", product.id);
      if (!error) {
        setIsInWishlist(false);
        toast.success("Removed");
        onWishlistRemove?.(product.id);
      }
    } else {
      const { error } = await supabase.from("wishlist").insert([{ user_id: userId, product_id: product.id }]);
      if (!error) { setIsInWishlist(true); toast.success("Saved!"); }
    }
  };

  const handleActionClick = async (e: React.MouseEvent, mode: "cart" | "buy") => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) { toast.error("This variant is out of stock"); return; }
    const userId = await getUserId();
    if (!userId) { toast.error("Login to source", { icon: '🔒' }); return; }

    if (isInCart && mode === "cart") {
      router.push("/Wholesale/cart");
      return;
    }

    setModalMode(mode);
    setQuantity(minQty);
    setShowMoqModal(true);
  };

  const handleVariantClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if ((variants[index]?.stock || 0) <= 0) {
      toast.error("This variant is out of stock");
    }
    setActiveIdx(index);
  };

  const confirmAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    const userId = await getUserId();
    try {
      const { error } = await supabase.from("cart").insert([{ user_id: userId, variant_id: currentVariant.id, quantity }]);
      if (error) {
        if (error.code === '23505') { toast.error("Item already in cart."); }
        else throw error;
      }
      setIsInCart(true);
      setShowMoqModal(false);
      if (modalMode === "buy") {
        router.push("/Wholesale/cart");
      } else {
        toast.success("Added to cart!");
      }
    } catch (err) { toast.error("Error updating cart"); }
    finally { setLoading(false); }
  };

  const moqModal = (
    <div
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMoqModal(false); }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 md:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-[2rem] md:rounded-[2rem] w-full max-w-sm p-6 md:p-8 shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-300"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="h-px w-4 bg-red-600" />
              <span className="text-[8px] font-mono font-bold text-red-600 uppercase tracking-widest">
                {modalMode === "buy" ? "Express checkout" : "Bulk sourcing"}
              </span>
            </div>
            <h4 className="text-lg md:text-xl font-black text-slate-900 uppercase leading-tight">{product.name}</h4>
            <div className="flex gap-2 mt-2">
              <span className="text-[8px] font-mono font-bold text-slate-400 uppercase border border-slate-200 px-2 py-0.5 rounded-md">Min {minQty}</span>
              <span className="text-[8px] font-mono font-bold text-red-500 uppercase border border-red-100 px-2 py-0.5 rounded-md bg-red-50">Max {maxQty}</span>
            </div>
          </div>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMoqModal(false); }} className="p-2 bg-slate-50 rounded-full shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="bg-slate-50 rounded-2xl md:rounded-3xl p-4 md:p-6 flex items-center justify-between mb-6">
          <button
            disabled={quantity <= minQty}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuantity(q => q - 1); }}
            className="h-10 w-10 md:h-12 md:w-12 bg-white rounded-xl flex items-center justify-center disabled:opacity-30 shadow-sm transition-all active:scale-95"
          >
            <Minus size={18} />
          </button>
          <div className="text-center">
            <span className="text-2xl md:text-3xl font-mono font-bold text-slate-900 tabular-nums">{quantity}</span>
            <p className="text-[7px] md:text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest">Units</p>
          </div>
          <button
            disabled={quantity >= maxQty}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuantity(q => q + 1); }}
            className="h-10 w-10 md:h-12 md:w-12 bg-slate-900 text-white rounded-xl flex items-center justify-center disabled:bg-slate-300 transition-all active:scale-95"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between mb-4 px-2">
          <div>
            <p className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest">Price per unit</p>
            <p className="text-sm font-mono font-bold text-slate-900 tabular-nums">₹{currentPrice.toLocaleString()}</p>
          </div>
          {currentPrice < wholesale && (
            <span className="flex items-center gap-1 text-[8px] font-mono font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full">
              <Tag size={10} /> Tier applied
            </span>
          )}
        </div>

        <button
          onClick={confirmAddToCart}
          disabled={loading || isOutOfStock}
          className={`w-full py-4 rounded-xl md:rounded-2xl font-mono font-bold uppercase tracking-widest text-xs md:text-sm shadow-xl transition-all ${
            isOutOfStock
              ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
              : "bg-red-600 text-white shadow-red-100 hover:bg-slate-900"
          }`}
        >
          {loading
            ? "Processing..."
            : isOutOfStock
            ? "Out of stock"
            : modalMode === "buy"
            ? `Buy now · ₹${(currentPrice * quantity).toLocaleString()}`
            : `Add to cart · ₹${(currentPrice * quantity).toLocaleString()}`}
        </button>
      </div>
    </div>
  );

  return (
    <Link
      href={`/Wholesale/products/${product.id}`}
      className="group bg-white rounded-xl md:rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-xl border border-slate-100 flex flex-col h-full relative cursor-pointer"
    >
      <Toaster position="bottom-right" />

      {/* 1. IMAGE ZONE */}
      <div className="relative aspect-square overflow-hidden bg-[#F4F5F7] group/img">

        {/* Rubber-stamp stock & best seller indicators */}
        <div className="absolute top-1.5 left-1.5 md:top-2.5 md:left-2.5 z-20 flex flex-col gap-1 items-start">
          <div
            className={`px-1.5 py-0.2 md:px-2 md:py-0.5 rounded-full border border-dashed flex items-center gap-1 bg-white/90 backdrop-blur-sm -rotate-6 ${
              hasAnyStock && !isOutOfStock
                ? "border-green-600 text-green-700"
                : "border-red-500 text-red-600"
            }`}
          >
            <span className="text-[6px] md:text-[8px] font-mono font-bold uppercase tracking-wider">
              {hasAnyStock && !isOutOfStock ? `Stock · ${stock}` : "OOS"}
            </span>
          </div>

          {/* Best Seller Badge */}
          {product.is_best_selling && (
            <div className="px-1.5 py-0.2 md:px-2 md:py-0.5 rounded-full border border-amber-500 flex items-center gap-0.5 md:gap-1 bg-amber-50/90 backdrop-blur-sm text-amber-800 rotate-3 shadow-sm">
              <Flame size={8} className="text-amber-600 fill-amber-500 md:w-[10px] md:h-[10px]" />
              <span className="text-[6px] md:text-[8px] font-mono font-black uppercase tracking-wider">
                Best
              </span>
            </div>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={toggleWishlist}
          disabled={!hasAnyStock}
          title={!hasAnyStock ? "Out of stock" : isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute top-1.5 right-1.5 md:top-2.5 md:right-2.5 z-20 h-6 w-6 md:h-9 md:w-9 rounded-full flex items-center justify-center transition-all ${
            !hasAnyStock
              ? "bg-white/60 text-slate-300 cursor-not-allowed"
              : isInWishlist
              ? "bg-red-50 text-red-600"
              : "bg-white/80 text-slate-400 hover:text-slate-900"
          }`}
        >
          <Heart size={12} className="md:w-[14px] md:h-[14px]" fill={isInWishlist && hasAnyStock ? "currentColor" : "none"} />
        </button>

        {displayImage ? (
          <Image
            src={displayImage}
            alt={product.name}
            fill
            className="object-contain p-3 md:p-9 transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-200">
            <ImageOff size={20} className="md:w-[30px] md:h-[30px]" />
          </div>
        )}
      </div>

      {/* 2. INFO ZONE */}
      <div className="px-2.5 md:px-4 pt-2 md:pt-3 flex flex-col flex-grow">
        <div className="flex items-center gap-1 mb-0.5 md:mb-1">
          <span className="h-px w-2 md:w-3 bg-red-600" />
          <span className="text-[6px] md:text-[8px] font-mono font-bold text-red-600 uppercase tracking-widest truncate">
            {product.brand || "JumboStar"}
          </span>
        </div>

        <h3 className="text-[10px] md:text-sm font-black text-slate-900 mb-1.5 md:mb-2 line-clamp-2 leading-tight uppercase tracking-tight">
          {product.name}
        </h3>

        {hasAnyStock && isOutOfStock && (
          <div className="mb-1.5 md:mb-2">
            <span className="inline-flex items-center gap-1 text-[7px] md:text-[9px] font-black uppercase tracking-widest text-orange-500 bg-orange-50 border border-orange-100 px-1.5 py-0.2 md:px-2 md:py-0.5 rounded-md">
              <span className="h-1 w-1 rounded-full bg-orange-400 inline-block" />
              Unavailable
            </span>
          </div>
        )}

        {/* Variant selector + ledger price tag, side by side */}
        <div className="flex items-start justify-between gap-1 md:gap-2 mb-2 md:mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-[6px] md:text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1">
              Batch
            </p>
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
              {variants.map((v: any, i: number) => {
                const variantOOS = (v.stock || 0) <= 0;
                return (
                  <button
                    key={v.id}
                    onClick={(e) => handleVariantClick(e, i)}
                    title={variantOOS ? "Out of stock" : ""}
                    className={`whitespace-nowrap px-1.5 py-0.5 md:px-2 md:py-1 rounded text-[7px] md:text-[9px] font-mono font-bold uppercase tracking-wide transition-all shrink-0 relative ${
                      activeIdx === i
                        ? variantOOS
                          ? "bg-slate-200 text-slate-400"
                          : "bg-slate-900 text-white"
                        : variantOOS
                        ? "bg-slate-50 text-slate-300 line-through"
                        : "bg-slate-50 text-slate-500"
                    }`}
                  >
                    {v.variant}{v.unit}
                    {variantOOS && (
                      <span className="absolute -top-0.5 -right-0.5 h-1 w-1 md:h-1.5 md:w-1.5 bg-red-400 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="shrink-0 bg-slate-900 text-white px-2 pt-1 pb-1.5 md:px-3 md:pt-2 md:pb-2.5"
            style={{ clipPath: TAG_CLIP }}
          >
            <p className="text-[10px] md:text-base font-mono font-bold leading-none tabular-nums">₹{wholesale}</p>
            <p className="text-[6px] md:text-[8px] font-mono text-slate-400 line-through leading-none mt-0.5 md:mt-1 tabular-nums">₹{mrp}</p>
          </div>
        </div>

        {/* Perforated tear line — the card's signature detail */}
        <div className="relative border-t border-dashed border-slate-200">
          <span className="absolute -left-[18px] md:-left-[22px] top-1/2 -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 rounded-full bg-[#F8FAFC]" />
          <span className="absolute -right-[18px] md:-right-[22px] top-1/2 -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 rounded-full bg-[#F8FAFC]" />
        </div>

        {/* 3. ACTION ZONE */}
        <div className="grid grid-cols-2 gap-1 py-2 md:py-3 mt-auto">
          <button
            onClick={(e) => handleActionClick(e, "cart")}
            disabled={isOutOfStock}
            title={isOutOfStock ? "Out of stock" : "Add to cart"}
            className={`h-7 md:h-10 rounded-md md:rounded-lg flex items-center justify-center gap-0.5 md:gap-1 text-[7px] md:text-[9px] font-mono font-bold uppercase tracking-widest transition-all border ${
              isOutOfStock
                ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                : isInCart
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-900 border-slate-200 hover:border-slate-900"
            }`}
          >
            <ShoppingCart size={10} className="md:w-[12px] md:h-[12px]" /> {isInCart ? "In cart" : "Cart"}
          </button>
          <button
            onClick={(e) => handleActionClick(e, "buy")}
            disabled={isOutOfStock}
            title={isOutOfStock ? "Out of stock" : "Buy now"}
            style={!isOutOfStock ? { clipPath: TAG_CLIP } : undefined}
            className={`h-7 md:h-10 flex items-center justify-center gap-0.5 md:gap-1 text-[7px] md:text-[9px] font-mono font-bold uppercase tracking-widest transition-all ${
              isOutOfStock
                ? "bg-slate-100 text-slate-300 rounded-md md:rounded-lg cursor-not-allowed"
                : "bg-red-600 text-white group-hover:bg-slate-900"
            }`}
          >
            <Zap size={10} className="md:w-[12px] md:h-[12px]" fill="currentColor" /> Buy
          </button>
        </div>
      </div>

      {/* --- MOQ & MAX MODAL: portalled to document.body --- */}
      {showMoqModal && mounted && createPortal(moqModal, document.body)}
    </Link>
  );
}