"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Loader2, PackageCheck, LockKeyhole, Tag, AlertCircle, Sparkles } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import AuthModal from "@/Components/AuthModal";

interface Tier {
  min_qty: number;
  price: string;
}

interface ProductVariant {
  id: string;
  variant: string;
  unit: string;
  wholesale_price: number;
  mrp: number;
  min_quantity: number;
  stock: number;
  variant_tiers: Tier[];
  products: {
    name: string;
    brand: string;
    product_images: { image_url: string }[];
  };
}

interface CartItem {
  id: string;
  quantity: number;
  product_variants: ProductVariant | null;
}

// Flat discount applied to a wholesaler's very first order
const NEW_ORDER_DISCOUNT = 50;

// Formats a rupee amount, only showing decimals when the amount actually has them,
// so whole-number charges stay clean (₹0) while precise totals stay accurate (₹3,450.24)
const formatCurrency = (amount: number): string => {
  const hasDecimals = Math.abs(amount % 1) > 0.004; // guard against float noise like 3450.0000001
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
};

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [transportCharge, setTransportCharge] = useState<number>(0);
  const [platformCharge] = useState<number>(80);
  const [handlingFees, setHandlingFees] = useState<number>(0);
  const [isFirstOrder, setIsFirstOrder] = useState(false);
  const MIN_ORDER_VALUE = 1500;

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userStr = localStorage.getItem("wholesale_user");

    if (session?.user || userStr) {
      setIsLoggedIn(true);
      const userId = session?.user?.id || JSON.parse(userStr!).id;
      fetchCart(userId);
      fetchCharges(userId);
      checkFirstOrder(userId);
    } else {
      setIsLoggedIn(false);
      setLoading(false);
    }
  };

  const fetchCart = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("cart")
        .select(`
          id,
          quantity,
          product_variants (
            id,
            variant,
            unit,
            wholesale_price,
            mrp,
            min_quantity,
            stock,
            variant_tiers (*),
            products (name, brand, product_images (image_url))
          )
        `)
        .eq("user_id", userId);

      if (error) throw error;

      // Filter out rows whose joined variant is missing/null (deleted product,
      // broken relation, RLS block, etc.) so a bad row can't crash the page
      // or silently disable the checkout button.
      const cleanData = ((data as unknown as CartItem[]) || []).filter(
        (item) => item.product_variants
      );

      setCartItems(cleanData);
    } catch (err) {
      toast.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  const fetchCharges = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("wholesale_users")
        .select("transport_charge, handling_fees")
        .eq("id", userId)
        .single();
      if (data) {
        setTransportCharge(data.transport_charge || 0);
        setHandlingFees(data.handling_fees || 0);
      }
    } catch (err) {
      console.log("Charges fetch error");
    }
  };

  // Looks for any previously placed order for this wholesaler. No rows = first order,
  // which qualifies for the flat ₹50 new-order discount.
  // NOTE: adjust the table/column names below ("orders" / "user_id") if yours differ.
  const checkFirstOrder = async (userId: string) => {
    try {
      const { data, error, count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (error) throw error;
      setIsFirstOrder((count ?? 0) === 0);
    } catch (err) {
      // If the orders table/columns aren't set up yet, fail safe with no discount
      // rather than breaking the cart page.
      console.log("First order check failed", err);
      setIsFirstOrder(false);
    }
  };

  const calculateItemPrice = (item: CartItem): number => {
    const variant = item.product_variants;
    if (!variant) return 0;
    const qty = item.quantity;
    const tiers = variant.variant_tiers || [];
    const applicableTier = [...tiers]
      .sort((a, b) => b.min_qty - a.min_qty)
      .find(t => qty >= t.min_qty);
    return applicableTier ? parseFloat(applicableTier.price) : variant.wholesale_price;
  };

  // Discount % vs the base wholesale price, used for the "Bulk Price" badge
  const calculateDiscountPercent = (item: CartItem): number => {
    const variant = item.product_variants;
    if (!variant || !variant.wholesale_price) return 0;
    const currentPrice = calculateItemPrice(item);
    if (currentPrice >= variant.wholesale_price) return 0;
    return Math.round(((variant.wholesale_price - currentPrice) / variant.wholesale_price) * 100);
  };

  const updateQuantity = async (id: string, newQty: number, minQty: number, maxStock: number) => {
    if (newQty < minQty) {
      toast.error(`Minimum order for this item is ${minQty}`);
      return;
    }
    // Block going above available stock
    if (newQty > maxStock) {
      toast.error(`Only ${maxStock} units available in stock`);
      return;
    }
    const { error } = await supabase.from("cart").update({ quantity: newQty }).eq("id", id);
    if (!error) {
      setCartItems(items =>
        items.map(item => item.id === id ? { ...item, quantity: newQty } : item)
      );
    }
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("cart").delete().eq("id", id);
    if (!error) {
      setCartItems(items => items.filter(item => item.id !== id));
      toast.success("Removed from cart");
    }
  };

  const subtotal = cartItems.reduce((acc, item) => {
    // Only count in-stock items toward subtotal
    if ((item.product_variants?.stock || 0) <= 0) return acc;
    const pricePerUnit = calculateItemPrice(item);
    return acc + (pricePerUnit * item.quantity);
  }, 0);

  const isBelowMinimum = subtotal < MIN_ORDER_VALUE && cartItems.length > 0;

  // Check if any cart item is out of stock
  const hasOutOfStockItems = cartItems.some(item => (item.product_variants?.stock || 0) <= 0);

  // Discount only applies once there's actually something to order
  const newOrderDiscount = isFirstOrder && cartItems.length > 0 ? NEW_ORDER_DISCOUNT : 0;

  // Kept as exact decimal math all the way through — no intermediate rounding —
  // so this always equals the sum of the line items shown above it.
  const grandTotal = Math.max(0, subtotal + transportCharge + handlingFees - newOrderDiscount);

  const isCheckoutDisabled = isBelowMinimum || cartItems.length === 0 || hasOutOfStockItems;

  const handleProceedToCheckout = () => {
    if (isCheckoutDisabled) {
      if (hasOutOfStockItems) {
        toast.error("Remove out-of-stock items to continue");
      } else if (isBelowMinimum) {
        toast.error(`Minimum order value is ₹${MIN_ORDER_VALUE.toLocaleString()}`);
      } else {
        toast.error("Your cart is empty");
      }
      return;
    }
    router.push("/Wholesale/checkout");
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="animate-spin text-red-600 mb-4" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verifying Inventory...</p>
    </div>
  );

  if (!isLoggedIn) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-[2.5rem] p-10 text-center border border-slate-100 shadow-xl max-w-lg w-full">
        <LockKeyhole className="text-red-600 mx-auto mb-6" size={40} />
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Vault Locked</h2>
        <button onClick={() => setShowAuthModal(true)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg">
          Login to Access
        </button>
        <AuthModal isOpen={showAuthModal} onClose={() => { setShowAuthModal(false); checkUser(); }} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <Toaster position="bottom-center" />

      {/* Header */}
      <div className="bg-white border-b border-slate-100 py-8 px-4 mb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full">Wholesale Portal</span>
            <span className="text-slate-300 text-xs font-bold uppercase">{cartItems.length} SKUs</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter">Your Cart</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Items List */}
        <div className="lg:col-span-8 space-y-4">
          {/* New order discount banner */}
          {isFirstOrder && cartItems.length > 0 && (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
              <Sparkles className="text-green-600 shrink-0" size={18} />
              <p className="text-[11px] font-black text-green-700 uppercase tracking-wide">
                Welcome! ₹{NEW_ORDER_DISCOUNT} discount applied on your first order.
              </p>
            </div>
          )}

          {cartItems.length > 0 ? cartItems.map((item) => {
            const variant = item.product_variants;
            if (!variant) return null;
            const product = variant.products;
            const currentUnitPrice = calculateItemPrice(item);
            const isTiered = currentUnitPrice !== variant.wholesale_price;
            const discountPercent = calculateDiscountPercent(item);
            const itemStock = variant.stock || 0;
            const isItemOOS = itemStock <= 0;
            // Quantity exceeds current stock (stock dropped after adding to cart)
            const isOverStock = item.quantity > itemStock && itemStock > 0;

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-[2rem] p-4 md:p-6 flex flex-col sm:flex-row items-center gap-6 shadow-sm transition-all ${
                  isItemOOS
                    ? "border-red-200 bg-red-50/30"
                    : isOverStock
                    ? "border-orange-200 bg-orange-50/20"
                    : "border-slate-100"
                }`}
              >
                {/* Product Image */}
                <div className="relative h-20 w-20 bg-slate-50 rounded-2xl flex-shrink-0">
                  <Image
                    src={product.product_images?.[0]?.image_url || "/placeholder.png"}
                    alt={product.name}
                    fill
                    className="object-contain p-2"
                  />
                  {/* OOS badge on image */}
                  {isItemOOS && (
                    <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center">
                      <span className="text-[7px] font-black text-red-500 uppercase tracking-widest text-center leading-tight px-1">Out of Stock</span>
                    </div>
                  )}
                </div>

                <div className="flex-grow text-center sm:text-left">
                  <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1">{product.brand}</p>
                  <h3 className="font-black text-slate-900 uppercase text-xs md:text-sm mb-1">{product.name}</h3>
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{variant.variant} {variant.unit}</p>
                    {isTiered && !isItemOOS && (
                      <span className="bg-green-50 text-green-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-1">
                        <Tag size={8} /> Bulk Price{discountPercent > 0 ? ` -${discountPercent}%` : ""}
                      </span>
                    )}
                    {/* Out of stock tag */}
                    {isItemOOS && (
                      <span className="bg-red-50 text-red-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-1 border border-red-100">
                        <AlertCircle size={8} /> Out of Stock
                      </span>
                    )}
                    {/* Over stock warning */}
                    {isOverStock && (
                      <span className="bg-orange-50 text-orange-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-1 border border-orange-100">
                        <AlertCircle size={8} /> Only {itemStock} left
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between w-full sm:w-auto gap-8 border-t sm:border-0 pt-4 sm:pt-0">
                  {/* Quantity Controls — disabled if OOS */}
                  <div className={`flex items-center gap-3 p-1.5 rounded-xl ${isItemOOS ? "bg-slate-100 opacity-50" : "bg-slate-50"}`}>
                    <button
                      disabled={isItemOOS || item.quantity <= variant.min_quantity}
                      onClick={() => updateQuantity(item.id, item.quantity - 1, variant.min_quantity, itemStock)}
                      className="h-7 w-7 bg-white rounded-lg flex items-center justify-center shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-xs font-black text-slate-900 w-6 text-center">{item.quantity}</span>
                    <button
                      disabled={isItemOOS || item.quantity >= itemStock}
                      onClick={() => updateQuantity(item.id, item.quantity + 1, variant.min_quantity, itemStock)}
                      className="h-7 w-7 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Price — greyed if OOS */}
                  <div className="text-right min-w-[100px]">
                    {isItemOOS ? (
                      <p className="text-sm font-black text-slate-300 uppercase tracking-tight">Unavailable</p>
                    ) : (
                      <>
                        <p className="text-lg font-black text-slate-900 tracking-tighter">₹{formatCurrency(currentUnitPrice * item.quantity)}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">₹{currentUnitPrice}/unit</p>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-slate-300 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
              <ShoppingBag className="mx-auto text-slate-200 mb-6" size={48} />
              <h2 className="text-xl font-black text-slate-900 uppercase">Cart is Empty</h2>
              <Link href="/Wholesale/productgallery" className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs">
                Browse Inventory <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-4">
          <div className="bg-white border-2 border-slate-900 rounded-[2.5rem] p-8 sticky top-24 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-2">
              Invoice Summary <PackageCheck className="text-red-600" size={20} />
            </h3>

            <div className="space-y-3 mb-8">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Total Items (Ex. Tax)</span>
                <span className="text-slate-900">₹{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Transport / Logistics</span>
                <span className="text-slate-900">₹{formatCurrency(transportCharge)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Service & Handling</span>
                <span className="text-slate-900">₹{formatCurrency(handlingFees)}</span>
              </div>
              {newOrderDiscount > 0 && (
                <div className="flex justify-between text-[10px] font-bold text-green-600 uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Sparkles size={11} /> New Order Discount</span>
                  <span>- ₹{formatCurrency(newOrderDiscount)}</span>
                </div>
              )}
              <div className="h-px bg-slate-100 my-4" />
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-slate-400">Total Payable</span>
                <span className="text-3xl font-black text-slate-900 tracking-tighter">₹{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Out of stock warning in summary */}
            {hasOutOfStockItems && (
              <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={16} />
                <p className="text-[10px] font-black text-red-600 uppercase leading-relaxed tracking-tight">
                  Some items are out of stock and excluded from your total. Please remove them to proceed.
                </p>
              </div>
            )}

            {/* Below minimum warning */}
            {isBelowMinimum && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-red-600 shrink-0" size={18} />
                <p className="text-[10px] font-black text-red-600 uppercase leading-relaxed tracking-tight">
                  Minimum Order Value is ₹{MIN_ORDER_VALUE.toLocaleString()}.
                  Please add items worth ₹{formatCurrency(MIN_ORDER_VALUE - subtotal)} more to proceed.
                </p>
              </div>
            )}

            <button
              disabled={isCheckoutDisabled}
              onClick={handleProceedToCheckout}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg transition-all flex items-center justify-center gap-2 
                ${isCheckoutDisabled
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-red-600 text-white hover:bg-slate-900 shadow-red-100"}`}
            >
              {hasOutOfStockItems
                ? "Remove Out of Stock Items"
                : isBelowMinimum
                ? "Below Minimum Value"
                : "Proceed to Checkout"
              } <ArrowRight size={16} />
            </button>

            <p className="text-[8px] text-center text-slate-400 mt-6 font-bold uppercase leading-relaxed">
              * Official business invoice will be generated <br /> after payment confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}