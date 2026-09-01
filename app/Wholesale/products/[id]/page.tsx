"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Toaster } from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import {
    Star, ArrowLeft, ArrowRight,
    ShoppingCart, Heart, Plus, Minus, ChevronLeft, ChevronRight, CheckCircle2, X, Zap
} from "lucide-react";
import Link from "next/link";
import ProductCard from "@/Components/ProductCard";
import toast from "react-hot-toast";

const getUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;

    // Check local storage as a fallback for guest/existing users
    const userStr = typeof window !== "undefined" ? localStorage.getItem("wholesale_user") : null;
    return userStr ? JSON.parse(userStr).id : null;
};

export default function ProductPage() {
    const { id } = useParams();
    const router = useRouter();
    const [product, setProduct] = useState<any>(null);
    const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
    const [activeImg, setActiveImg] = useState(0);
    const [activeVariantIdx, setActiveVariantIdx] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [isInCart, setIsInCart] = useState(false);
    const [showMoqModal, setShowMoqModal] = useState(false);
    const [modalMode, setModalMode] = useState<"cart" | "buy">("cart");

    useEffect(() => {
        async function fetchFullData() {
            setLoading(true);
            // Reset selection state so a stale index left over from a
            // previously viewed product can't point past the end of this
            // product's (possibly shorter) variants/images arrays.
            setActiveImg(0);
            setActiveVariantIdx(0);

            const { data: mainProduct, error: productError } = await supabase
                .from("products")
                .select(`
                    *, 
                    product_images (*), 
                    product_variants (*, variant_tiers (*))
                `)
                .eq("id", id)
                .single();

            if (productError) {
                console.error("Product fetch error:", productError.message);
            }

            if (mainProduct) {
                // Normalize potentially-null arrays from Supabase so downstream
                // code can safely assume they're always arrays
                mainProduct.product_variants = mainProduct.product_variants || [];
                mainProduct.product_images = mainProduct.product_images || [];

                // Ensure tiers are sorted by min_qty so our logic finds the correct one
                mainProduct.product_variants.forEach((v: any) => {
                    v.variant_tiers = (v.variant_tiers || []).sort((a: any, b: any) => a.min_qty - b.min_qty);
                });

                setProduct(mainProduct);
                const firstVariant = mainProduct.product_variants?.[0];
                setQuantity(firstVariant?.min_quantity || 1);

                const userId = await getUserId();
                if (userId) {
                    const { data: wish } = await supabase.from("wishlist").select("id").eq("user_id", userId).eq("product_id", id).maybeSingle();
                    setIsInWishlist(!!wish);

                    const variantIds = mainProduct.product_variants.map((v: any) => v.id);
                    if (variantIds.length > 0) {
                        const { data: cart } = await supabase.from("cart").select("id").eq("user_id", userId).in("variant_id", variantIds).maybeSingle();
                        setIsInCart(!!cart);
                    } else {
                        setIsInCart(false);
                    }
                } else {
                    setIsInWishlist(false);
                    setIsInCart(false);
                }

                // ALL PRODUCTS (except the current one), newest first — no category
                // filter and no limit, so the whole catalog shows in the Vault strip.
                const { data: related, error: relatedError } = await supabase
                    .from("products")
                    .select(`*, product_images (*), product_variants (*)`)
                    .neq("id", id)
                    .order("created_at", { ascending: false });

                if (relatedError) {
                    console.error("Related products fetch error:", relatedError.message);
                }
                setRelatedProducts(related || []);
            } else {
                setProduct(null);
            }
            setLoading(false);
        }
        fetchFullData();
    }, [id]);

    const toggleWishlist = async () => {
        const userId = await getUserId();

        if (!userId) {
            toast.error("Please login to save favorites", {
                icon: '🔒',
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                },
            });
            return;
        }

        if (isInWishlist) {
            const { error } = await supabase
                .from("wishlist")
                .delete()
                .eq("user_id", userId)
                .eq("product_id", id);

            if (!error) {
                setIsInWishlist(false);
                toast("Removed from wishlist", {
                    icon: '🗑️',
                    style: {
                        borderRadius: '10px',
                        background: '#f1f5f9',
                        color: '#475569',
                        fontSize: '12px',
                        fontWeight: 'bold'
                    },
                });
            }
        } else {
            const { error } = await supabase
                .from("wishlist")
                .insert([{ user_id: userId, product_id: id }]);

            if (!error) {
                setIsInWishlist(true);
                toast.success("Saved to favorites!", {
                    icon: '❤️',
                    style: {
                        borderRadius: '10px',
                        background: '#333',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 'bold'
                    },
                });
            } else {
                toast.error("Could not update wishlist");
            }
        }
    };

    const handleActionClick = async (mode: "cart" | "buy") => {
        if (!currentVariant) {
            toast.error("This product has no variants available yet");
            return;
        }

        const userId = await getUserId();

        // If no user is found, show the toast and STOP
        if (!userId) {
            toast.error("Please login to source products", {
                icon: '🔒',
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                },
                duration: 3000
            });

            // Optional: Redirect them to login after a short delay
            // setTimeout(() => router.push("/login"), 2000);
            return;
        }

        // Existing logic for logged-in users
        if (isInCart && mode === "cart") {
            router.push("/Wholesale/cart");
            return;
        }

        setModalMode(mode);
        setQuantity(currentVariant.min_quantity);
        setShowMoqModal(true);
    };

    const confirmAction = async () => {
        if (!currentVariant) return;
        setActionLoading(true);
        const userId = await getUserId();
        try {
            const { error } = await supabase.from("cart").insert([
                { user_id: userId, variant_id: currentVariant.id, quantity: quantity }
            ]);
            if (error) {
                if (error.code === '23505') { toast.error("Item already in cart."); }
                else throw error;
            };
            setIsInCart(true);
            setShowMoqModal(false);
            if (modalMode === "buy") { router.push("/Wholesale/cart"); }
            else { toast.success(`Added ${quantity} units to cart!`); }
        } catch (err: any) {
            toast.error("Could not update cart");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="h-10 w-10 border-4 border-slate-100 border-t-red-600 rounded-full animate-spin" />
        </div>
    );

    if (!product) return <div className="p-20 text-center font-black">PRODUCT_NOT_FOUND</div>;

    const currentVariant = product.product_variants[activeVariantIdx];
    const images = product.product_images;

    // A product can exist in the DB without any variants saved yet (e.g. still
    // being set up in the admin panel). Show a clear message instead of
    // crashing on currentVariant.min_quantity etc.
    if (!currentVariant) {
        return (
            <div className="min-h-screen bg-[#F8FAFC]">
                <Toaster position="top-center" reverseOrder={false} />
                <nav className="bg-white/80 sticky top-0 z-40 border-b border-slate-100 backdrop-blur-md">
                    <div className="max-w-[1400px] mx-auto px-4 py-4 flex items-center">
                        <Link href="/Wholesale/productgallery" className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all">
                            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back
                        </Link>
                    </div>
                </nav>
                <div className="p-20 text-center space-y-2">
                    <p className="font-black text-slate-900">{product.name}</p>
                    <p className="text-sm text-slate-400 font-medium">This product doesn't have any purchasable variants set up yet.</p>
                </div>
            </div>
        );
    }

    const minQty = currentVariant.min_quantity;
    const maxQty = currentVariant.max_quantity || 9999;
    const wholesaleBase = currentVariant.wholesale_price;

    // FIND APPLICABLE TIER PRICE
    const getTieredPrice = (qty: number) => {
        const tiers = currentVariant.variant_tiers || [];
        // Loop backwards through sorted tiers to find the highest min_qty met
        const applicableTier = [...tiers].reverse().find(t => qty >= t.min_qty);
        return applicableTier ? parseFloat(applicableTier.price) : wholesaleBase;
    };

    const currentUnitPrice = getTieredPrice(quantity);

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Toaster position="top-center" reverseOrder={false} />
            <style jsx global>{`
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(calc(-274px * var(--item-count, 1))); }
                }
                .auto-scroll-container {
                    display: flex;
                    width: max-content;
                    animation-name: scroll;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                }
                .auto-scroll-container:hover { animation-play-state: paused; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <nav className="bg-white/80 sticky top-0 z-40 border-b border-slate-100 backdrop-blur-md">
                <div className="max-w-[1400px] mx-auto px-4 py-4 flex items-center">
                    <Link href="/Wholesale/productgallery" className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all">
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back
                    </Link>
                </div>
            </nav>

            <main className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6 md:pt-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start mb-1 md:mb-2">
                    <div className="lg:col-span-6 w-full">
                        <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm relative">
                            <div className="absolute top-4 left-4 z-10">
                                <span className="bg-slate-900 text-white text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">{product.brand}</span>
                            </div>
                            <div className="relative aspect-square w-full">
                                {images[activeImg]?.image_url && (
                                    <Image src={images[activeImg].image_url} alt={product.name} fill className="object-contain p-8 md:p-20" priority />
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4 overflow-x-auto scrollbar-hide">
                            {images.map((img: any, i: number) => (
                                <button key={img.id} onClick={() => setActiveImg(i)} className={`relative flex-shrink-0 w-16 h-16 rounded-xl border-2 transition-all ${activeImg === i ? 'border-red-600' : 'border-transparent opacity-60'}`}>
                                    <Image src={img.image_url} alt="thumb" fill className="object-cover p-1" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-6 space-y-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="h-[1px] w-6 bg-red-600"></div>
                                <span className="text-[9px] font-black text-red-600 uppercase tracking-[0.2em]">Commercial Grade</span>
                            </div>
                            <div className="flex justify-between items-start gap-4">
                                <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">{product.name}</h1>
                                <button onClick={toggleWishlist} className="p-2 bg-white rounded-full border border-slate-100 shadow-sm">
                                    <Heart size={20} fill={isInWishlist ? "#ef4444" : "none"} className={isInWishlist ? "text-red-500" : "text-slate-300"} />
                                </button>
                            </div>
                            <p className="text-slate-500 text-xs md:text-sm leading-relaxed">{product.description}</p>
                        </div>

                        <div className="bg-white rounded-[1.5rem] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
                            {/* STOCK STATUS — where the big price block used to be */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-green-500 font-bold text-xs">
                                    <CheckCircle2 size={14} /> In Stock
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">{currentVariant.stock} units ready</p>
                            </div>

                            {/* CART / BUY NOW — now in place of the old price block */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button onClick={() => handleActionClick("cart")} className="h-12 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] border-2 border-slate-200 text-slate-600 flex items-center justify-center gap-2 hover:border-slate-900 hover:text-slate-900 transition-all">
                                    <ShoppingCart size={16} /> {isInCart ? "In Bulk Cart" : "Add To Cart"}
                                </button>
                                <button onClick={() => handleActionClick("buy")} className="h-12 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] bg-red-600 text-white flex items-center justify-center gap-2 shadow-lg shadow-red-200 hover:bg-slate-900 transition-all">
                                    <Zap size={16} fill="white" /> Buy Now
                                </button>
                            </div>

                            {/* SELECT VARIANT + PRICE — price now sits next to the variant selector */}
                            <div className="space-y-3 border-t border-slate-50 pt-6">
                                <div className="flex items-center justify-between gap-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Variant</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter">₹{wholesaleBase}</span>
                                        <span className="text-[10px] md:text-xs text-slate-300 line-through font-bold">₹{currentVariant.mrp}</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {product.product_variants.map((v: any, i: number) => (
                                        <button
                                            key={v.id}
                                            onClick={() => { setActiveVariantIdx(i); setQuantity(v.min_quantity); }}
                                            className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all border ${activeVariantIdx === i ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500 border-transparent"}`}
                                        >
                                            {v.variant} {v.unit}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* LIVE TIERS FROM DATABASE */}
                        <div className="space-y-3 pt-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                Bulk Discount Tiers
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
                                    <p className="text-[8px] font-black text-slate-400 uppercase">Standard</p>
                                    <p className="text-xs font-black text-slate-900">{minQty}+ Units</p>
                                    <p className="text-[10px] font-bold text-green-600 mt-1">₹{wholesaleBase}</p>
                                </div>

                                {currentVariant.variant_tiers?.map((tier: any, idx: number) => (
                                    <div key={tier.id} className={`${idx === 0 ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'} border p-3 rounded-xl text-center relative overflow-hidden`}>
                                        <p className={`text-[8px] font-black ${idx === 0 ? 'text-green-600' : 'text-red-600'} uppercase`}>{idx === 0 ? 'Pro' : 'Elite'}</p>
                                        <p className="text-xs font-black text-slate-900">{tier.min_qty}+ Units</p>
                                        <p className={`text-[10px] font-bold ${idx === 0 ? 'text-green-600' : 'text-red-600'} mt-1`}>₹{tier.price}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {relatedProducts.length > 0 && (
                    <section className="py-12 border-t border-slate-100 overflow-hidden">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-8 px-4 uppercase">Recommended from Vault</h2>
                        <div className="relative w-full overflow-hidden">
                            <div
                                className="auto-scroll-container flex gap-6 scrollbar-hide"
                                style={{
                                    ["--item-count" as any]: relatedProducts.length,
                                    animationDuration: `${relatedProducts.length * 5}s`,
                                }}
                            >
                                {[...relatedProducts, ...relatedProducts].map((p, idx) => (
                                    <div key={`${p.id}-${idx}`} className="w-[250px] flex-shrink-0"><ProductCard product={p} /></div>
                                ))}
                            </div>
                            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#F8FAFC] to-transparent z-10 pointer-events-none" />
                            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#F8FAFC] to-transparent z-10 pointer-events-none" />
                        </div>
                    </section>
                )}
            </main>

            {/* MOQ MODAL */}
            {showMoqModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
                    <div className="bg-white rounded-t-[2rem] sm:rounded-[2.5rem] w-full max-w-sm p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h4 className="text-lg font-black text-slate-900">{modalMode === "buy" ? "Express Checkout" : "Bulk Sourcing"}</h4>
                                <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest">Range: {minQty} - {maxQty}</p>
                            </div>
                            <button onClick={() => setShowMoqModal(false)} className="p-2 text-slate-400"><X size={20} /></button>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between mb-8">
                            <button disabled={quantity <= minQty} onClick={() => setQuantity(q => q - 1)} className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-slate-900 disabled:opacity-30 border border-slate-200">
                                <Minus size={18} />
                            </button>
                            <div className="text-center">
                                <span className="text-2xl font-black text-slate-900">{quantity}</span>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Units</p>
                            </div>
                            <button disabled={quantity >= maxQty} onClick={() => setQuantity(q => q + 1)} className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center disabled:bg-slate-300">
                                <Plus size={18} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-end text-sm font-bold px-2">
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase tracking-tighter">Total Amount:</span>
                                    <span className="text-slate-900 text-lg">₹{(currentUnitPrice * quantity).toLocaleString()}</span>
                                </div>
                                {currentUnitPrice !== wholesaleBase && (
                                    <div className="text-right">
                                        <p className="text-[9px] text-green-600 font-black animate-pulse uppercase">Tier Pricing Applied</p>
                                    </div>
                                )}
                            </div>
                            <button onClick={confirmAction} disabled={actionLoading} className="w-full bg-red-600 text-white py-4 rounded-xl font-black uppercase tracking-widest transition-all hover:bg-red-700 shadow-xl shadow-red-100">
                                {actionLoading ? "Processing..." : modalMode === "buy" ? "Confirm & Checkout" : "Add to Bulk Cart"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}