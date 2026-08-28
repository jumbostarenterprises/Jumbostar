"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
    MapPin, Loader2, ShieldCheck, Store,
    Wallet, CheckCircle2, ArrowLeft, ChevronRight,
    Camera, CreditCard, QrCode, AlertCircle,
    Truck, PiggyBank, Coins
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface Tier {
    min_qty: number;
    price: string;
}

// Formats a rupee amount, only showing decimals when the amount actually has them,
// so whole-number charges stay clean (₹0) while precise totals stay accurate (₹3,450.24)
const formatCurrency = (amount: number): string => {
    const hasDecimals = Math.abs(amount % 1) > 0.004;
    return amount.toLocaleString("en-IN", {
        minimumFractionDigits: hasDecimals ? 2 : 0,
        maximumFractionDigits: 2,
    });
};

export default function CheckoutPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [payLoading, setPayLoading] = useState(false);
    const [transportCharge, setTransportCharge] = useState(0);
    const [handlingCharge, setHandlingCharge] = useState(0);

    // Data States
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [shopAddress, setShopAddress] = useState<string>("");
    const [bankDetails, setBankDetails] = useState<any>(null);

    const [paymentType, setPaymentType] = useState<'full' | 'cod'>('full');

    // Payment Logic
    const [total, setTotal] = useState(0);
    const [subtotal, setSubtotal] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'bank' | 'upi' | 'cod'>('cod');

    // Loyalty coins wallet balance (1 coin = ₹1). Applied automatically — no manual entry.
    const [availableCoins, setAvailableCoins] = useState<number>(0);
    const [coinsApplied, setCoinsApplied] = useState<number>(0);

    // ── SUCCESS CONFIRMATION STATE (shown after order is placed) ──
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successData, setSuccessData] = useState<{
        orderId: string;
        savedAmount: number;
        savedPercentage: number;
        coinsRedeemed: number;
        deliveryLabel: string;
        deliveryDateStr: string;
        isSameDay: boolean;
    } | null>(null);

    useEffect(() => {
        if (paymentMethod === "cod") {
            setPaymentType("cod");
        } else {
            setPaymentType("full");
        }
    }, [paymentMethod]);

    const [transactionDetails, setTransactionDetails] = useState({
        transactionId: "",
        utrNumber: "",
        photo: null as File | null
    });
    const payableNow = paymentType === "full" ? total : 0;
    const remainingBalance = paymentType === "cod" ? total : 0;
    const isAmountTooLow = total < 500;

    // ── Is everything needed to place the order filled in? Drives the button's disabled state ──
    const referenceNumber = paymentMethod === 'bank' ? transactionDetails.transactionId : transactionDetails.utrNumber;
    const isFormValid =
        !!shopAddress &&
        (paymentMethod === 'cod' || (!!referenceNumber.trim() && !!transactionDetails.photo));

    useEffect(() => {
        loadData();
    }, []);

    const calculateItemPrice = (item: any): number => {
        const variant = item.product_variants;
        const qty = item.quantity;
        const tiers: Tier[] = variant.variant_tiers || [];
        const applicableTier = [...tiers]
            .sort((a, b) => b.min_qty - a.min_qty)
            .find(t => qty >= t.min_qty);
        return applicableTier ? parseFloat(applicableTier.price) : variant.wholesale_price;
    };

    const calculateItemDiscountPercent = (item: any): number => {
        const variant = item.product_variants;
        if (!variant?.wholesale_price) return 0;
        const actualPrice = calculateItemPrice(item);
        if (actualPrice >= variant.wholesale_price) return 0;
        return Math.round(((variant.wholesale_price - actualPrice) / variant.wholesale_price) * 100);
    };

    // ── Computes total bulk-tier savings across the whole cart ──
    const calculateTotalSavings = (): number => {
        return cartItems.reduce((acc, item) => {
            const variant = item.product_variants;
            const basePrice = variant.wholesale_price;
            const actualPrice = calculateItemPrice(item);
            const savingPerUnit = basePrice - actualPrice;
            return acc + (savingPerUnit > 0 ? savingPerUnit * item.quantity : 0);
        }, 0);
    };

    const calculateSavingsPercentage = (): number => {
        const savings = calculateTotalSavings();
        const originalTotal = subtotal + savings;
        if (originalTotal <= 0) return 0;
        return (savings / originalTotal) * 100;
    };

    // ── 3 PM cutoff delivery rule ──
    const getDeliveryEstimate = () => {
        const now = new Date();
        const CUTOFF_HOUR = 15; // 3 PM
        const isSameDay = now.getHours() < CUTOFF_HOUR;

        const deliveryDate = new Date(now);
        if (!isSameDay) deliveryDate.setDate(deliveryDate.getDate() + 1);

        const dateStr = deliveryDate.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
        });

        return {
            isSameDay,
            deliveryLabel: isSameDay ? "Today" : "Tomorrow",
            deliveryDateStr: dateStr,
        };
    };

    const loadData = async () => {
        try {
            const userStr = localStorage.getItem("wholesale_user");
            if (!userStr) return router.push("/");

            const user = JSON.parse(userStr);

            const { data: bankData } = await supabase
                .from("bank_details")
                .select("*")
                .single();
            setBankDetails(bankData);

            const { data: profile, error: profileError } = await supabase
                .from("wholesale_users")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();

            if (profileError) console.error("Profile fetch error:", profileError);
            if (!profile) {
                toast.error("Couldn't load your account details. Please contact support.");
            } else {
                setUserProfile(profile);
            }

            const transport = profile?.transport_charge || 0;
            const handling = profile?.handling_fees || 0;
            const coins = Math.max(0, Math.floor(profile?.coins || 0));

            setTransportCharge(transport);
            setHandlingCharge(handling);
            setAvailableCoins(coins);

            if (profile) {
                setShopAddress(profile.shop_address);
            }

            const { data: cart } = await supabase
                .from("cart")
                .select(`
                    id,
                    quantity,
                    product_variants(
                        id,
                        variant,
                        unit,
                        wholesale_price,
                        variant_tiers (*),
                        products(
                            name,
                            brand,
                            product_images(image_url)
                        )
                    )
                `)
                .eq("user_id", user.id);

            const cleanCart = (cart || []).filter((item: any) => item.product_variants);

            if (!cleanCart || cleanCart.length === 0) {
                router.push("/Wholesale/cart");
                return;
            }

            setCartItems(cleanCart);

            const calcSubtotal = cleanCart.reduce(
                (acc: number, item: any) =>
                    acc + item.quantity * calculateItemPrice(item),
                0
            );

            const preDiscount = calcSubtotal + transport + handling;

            // Coins are applied automatically — as many as the wallet has, capped
            // so the total never goes negative. 1 coin = ₹1.
            const appliedCoins = Math.max(0, Math.min(coins, Math.floor(preDiscount)));

            setSubtotal(calcSubtotal);
            setCoinsApplied(appliedCoins);
            setTotal(Math.max(0, preDiscount - appliedCoins));

        } catch (error) {
            console.error("Checkout load error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (cartItems.length === 0) return;
        const preDiscount = subtotal + transportCharge + handlingCharge;
        const appliedCoins = Math.max(0, Math.min(availableCoins, Math.floor(preDiscount)));
        setCoinsApplied(appliedCoins);
        setTotal(Math.max(0, preDiscount - appliedCoins));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subtotal, transportCharge, handlingCharge, availableCoins]);

    const handlePlaceOrder = async () => {
        if (!shopAddress) {
            toast.error("Delivery address not found on your profile");
            return;
        }

        if (paymentMethod !== "cod" && !referenceNumber.trim()) {
            toast.error("Please enter your transaction reference number");
            return;
        }

        if (paymentMethod !== "cod" && !transactionDetails.photo) {
            toast.error("Please upload your payment receipt");
            return;
        }

        try {
            setPayLoading(true);

            const userStr = localStorage.getItem("wholesale_user");
            const user = JSON.parse(userStr || "{}");

            const now = new Date();
            const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;

            const { count } = await supabase
                .from("orders")
                .select("*", { count: "exact", head: true });

            const customId = `JS-${dateStr}${String((count || 0) + 1).padStart(4, "0")}`;

            const orderItemsSnapshot = cartItems.map((item: any) => {
                const unitPrice = calculateItemPrice(item);
                return {
                    product_name: item.product_variants.products.name,
                    variant_name: item.product_variants.variant,
                    unit: item.product_variants.unit,
                    quantity: item.quantity,
                    price_at_purchase: unitPrice,
                    subtotal: item.quantity * unitPrice,
                    discount_percent: calculateItemDiscountPercent(item),
                    image:
                        item.product_variants.products.product_images?.[0]?.image_url || null
                };
            });

            const { isSameDay, deliveryLabel, deliveryDateStr } = getDeliveryEstimate();
            const savedAmount = calculateTotalSavings();
            const savedPercentage = calculateSavingsPercentage();

            // Re-clamp one last time right before submitting, in case anything shifted
            const coinsToRedeem = Math.max(0, Math.min(coinsApplied, availableCoins, Math.floor(subtotal + transportCharge + handlingCharge)));

            const orderData = {
                order_id_custom: customId,
                user_id: user.id,
                address_id: null,
                address_snapshot: shopAddress,
                total_amount: parseFloat(total.toFixed(2)),
                total_payable_amount: parseFloat(total.toFixed(2)),
                amount_paid_now: parseFloat(payableNow.toFixed(2)),
                remaining_balance: parseFloat(remainingBalance.toFixed(2)),
                payment_type: paymentType,
                payment_status: paymentType === "cod" ? "cod_pending" : "paid",
                order_status: "processing",
                items: orderItemsSnapshot,
                coins_redeemed: coinsToRedeem,
                discount_from_coins: parseFloat(coinsToRedeem.toFixed(2)),
                balance_due_date: new Date(
                    Date.now() + 10 * 24 * 60 * 60 * 1000
                )
                    .toISOString()
                    .split("T")[0]
            };

            const { data: order, error: insertError } = await supabase
                .from("orders")
                .insert([orderData])
                .select()
                .single();

            if (insertError) throw insertError;

            const stockPayload = cartItems.map((item: any) => ({
                variant_id: item.product_variants.id,
                quantity: item.quantity
            }));

            const { error: stockError } = await supabase.rpc(
                "decrement_stock_for_order",
                { p_items: stockPayload }
            );

            if (stockError) {
                await supabase.from("orders").delete().eq("id", order.id);
                throw new Error(
                    stockError.message?.includes("Insufficient stock")
                        ? "Sorry, one or more items just went out of stock. Please update your cart."
                        : "Could not reserve stock for this order. Please try again."
                );
            }

            // Deduct the applied coins from the wallet now that the order is confirmed
            if (coinsToRedeem > 0) {
                const { error: coinsError } = await supabase
                    .from("wholesale_users")
                    .update({ coins: Math.max(0, availableCoins - coinsToRedeem) })
                    .eq("id", user.id);

                if (coinsError) {
                    console.error("Failed to deduct redeemed coins:", coinsError);
                }
            }

            let screenshotUrl: string | null = null;

            if (transactionDetails.photo) {
                const fileExt = transactionDetails.photo.name.split(".").pop();
                const fileName = `payment-proof-${order.id}-${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from("payment-proofs")
                    .upload(fileName, transactionDetails.photo, {
                        cacheControl: "3600",
                        upsert: false
                    });

                if (uploadError) {
                    console.error("Upload failed:", uploadError);
                } else {
                    const { data } = supabase.storage
                        .from("payment-proofs")
                        .getPublicUrl(fileName);
                    screenshotUrl = data.publicUrl;
                }
            }

            if (paymentMethod !== "cod") {
                const { error: paymentError } = await supabase
                    .from("payments")
                    .insert([
                        {
                            order_id: order.id,
                            user_id: user.id,
                            payment_method: paymentMethod,
                            payment_amount: payableNow,
                            bank_ref_number:
                                paymentMethod === "bank"
                                    ? transactionDetails.transactionId
                                    : null,
                            utr_number:
                                paymentMethod === "upi"
                                    ? transactionDetails.utrNumber
                                    : null,
                            payment_screenshot: screenshotUrl,
                            payment_status: "pending"
                        }
                    ]);

                if (paymentError) {
                    console.error("Payment insert failed:", paymentError);
                }
            }

            await supabase
                .from("cart")
                .delete()
                .eq("user_id", user.id);

            window.dispatchEvent(new Event("cartUpdated"));

            try {
                await fetch('/api/notify-admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: customId,
                        total: total,
                        paymentMethod: paymentMethod,
                        customerName: userProfile?.company_name || userProfile?.owner_name || 'Valued Customer',
                        customerPhone: userProfile?.phone || 'N/A',
                        address: shopAddress,
                        items: orderItemsSnapshot,
                        deliveryEstimate: `${deliveryLabel} (${deliveryDateStr})`
                    })
                });
            } catch (emailError) {
                console.error("Admin email notification failed to send:", emailError);
            }

            setSuccessData({
                orderId: customId,
                savedAmount,
                savedPercentage,
                coinsRedeemed: coinsToRedeem,
                deliveryLabel,
                deliveryDateStr,
                isSameDay,
            });
            setShowSuccessModal(true);

        } catch (err: any) {
            toast.error(err.message || "An unexpected error occurred");
        } finally {
            setPayLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setTransactionDetails(prev => ({ ...prev, photo: file }));
            toast.success("Payment proof uploaded!");
        } else {
            toast.error("Please upload a valid image file");
        }
    };

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-red-600 mb-4" size={40} />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preparing Secure Checkout...</p>
        </div>
    );

    const totalSavings = calculateTotalSavings();
    const savingsPercent = calculateSavingsPercentage();

    // Single Pay Now / Place Order button, used only inside the Payment
    // Method card. Kept as one source of truth (styling, disabled state,
    // spinner) even though it now renders in just one place.
    const PlaceOrderButton = () => (
        <button
            onClick={handlePlaceOrder}
            disabled={payLoading || !isFormValid}
            className={`w-full py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 shadow-xl ${payLoading || !isFormValid
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    : isAmountTooLow
                        ? "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200"
                        : "bg-red-600 hover:bg-slate-900 text-white shadow-red-200 hover:scale-[1.02]"
                }`}
        >
            {payLoading ? (
                <Loader2 className="animate-spin" size={18} />
            ) : (
                <>
                    <Wallet size={18} /> Pay Now / Place Order
                </>
            )}
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
            <Toaster position="top-right" />

            {/* Editorial Header */}
            <div className="bg-white border-b border-slate-100 py-12 px-4 mb-10">
                <div className="max-w-7xl mx-auto">
                    <Link href="/Wholesale/cart" className="group flex items-center gap-2 text-slate-400 hover:text-red-600 transition-colors mb-6 text-[10px] font-black uppercase tracking-widest">
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Cart
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full">Secure Sourcing</span>
                                <span className="text-slate-300 text-sm font-bold">Step 2 of 2</span>
                            </div>
                            <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Checkout</h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* LEFT SIDE: DETAILS */}
                <div className="lg:col-span-7 space-y-8">

                    {/* DELIVERY ADDRESS — single address, shown as read-only */}
                    {/* DELIVERY ADDRESS — clicking it takes you to the profile page to edit it */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black uppercase tracking-tighter text-slate-900 flex items-center gap-2">
                                <MapPin size={18} className="text-red-600" /> Delivery Destination
                            </h3>
                            <span className="text-[9px] font-black uppercase text-slate-300 tracking-widest">
                                Click to change
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => router.push("/Wholesale/profile")}
                            className="w-full text-left p-6 rounded-[2rem] border-2 border-red-600 bg-red-50/20 hover:bg-red-50 hover:border-slate-900 transition-all flex items-start gap-4 group"
                        >
                            <div className="h-11 w-11 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0">
                                <Store size={18} />
                            </div>
                            <div className="flex-1">
                                <span className="text-[9px] font-black uppercase text-red-600">Shop / Warehouse</span>
                                <p className="text-[13px] font-bold text-slate-700 leading-relaxed mt-1">
                                    {shopAddress || "No address on file — click here to add one."}
                                </p>
                            </div>
                            <ChevronRight
                                size={18}
                                className="text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all shrink-0 mt-1"
                            />
                        </button>
                    </div>

                    {/* PAYMENT METHOD SECTION — inline on the page, no popup, all 3 methods */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
                        <h3 className="text-sm font-black uppercase tracking-tighter text-slate-900 flex items-center gap-2 mb-6">
                            <Wallet size={18} className="text-red-600" /> Payment Method
                        </h3>

                        {bankDetails ? (
                            <>
                                {/* Tabs */}
                                <div className="flex bg-slate-50 p-1.5 rounded-3xl border border-slate-100 mb-8">
                                    <button
                                        onClick={() => setPaymentMethod('cod')}
                                        className={`flex-1 py-3 rounded-2xl font-black text-[11px] transition-all ${paymentMethod === 'cod' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                                    >
                                        COD
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('upi')}
                                        className={`flex-1 py-3 rounded-2xl font-black text-[11px] transition-all ${paymentMethod === 'upi' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                                    >
                                        UPI
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('bank')}
                                        className={`flex-1 py-3 rounded-2xl font-black text-[11px] transition-all ${paymentMethod === 'bank' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                                    >
                                        Bank Transfer
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

                                    {/* Left: method details */}
                                    <div className="space-y-4">
                                        {paymentMethod === 'bank' ? (
                                            <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
                                                <div className="space-y-6">
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Account Name</p>
                                                        <p className="text-lg font-bold">{bankDetails.account_name}</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 uppercase font-bold">Account Number</p>
                                                            <p className="text-lg font-mono font-bold text-red-500">
                                                                {bankDetails.account_number}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 uppercase font-bold">IFSC</p>
                                                            <p className="text-lg font-mono font-bold">{bankDetails.ifsc_code}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : paymentMethod === 'upi' ? (
                                            <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-8 flex flex-col items-center">
                                                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 mb-4">
                                                    {bankDetails.qr_image ? (
                                                        <Image
                                                            src={bankDetails.qr_image}
                                                            alt="QR"
                                                            width={160}
                                                            height={160}
                                                            className="rounded-xl"
                                                        />
                                                    ) : (
                                                        <QrCode size={120} className="text-slate-200" />
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
                                                    Scan or Pay to UPI ID
                                                </p>
                                                <p className="text-2xl font-black text-slate-900">
                                                    {bankDetails.upi_id}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-2xl text-center h-full flex flex-col items-center justify-center">
                                                <p className="text-xs font-black text-yellow-700 uppercase">
                                                    Cash on Delivery Selected
                                                </p>
                                                <p className="text-[10px] text-yellow-600 mt-2">
                                                    No advance payment required. You will pay when your order is delivered.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: transaction verification (skipped for COD) */}
                                    <div className="space-y-4">
                                        {paymentMethod !== 'cod' ? (
                                            <>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                                                        {paymentMethod === 'bank' ? 'Bank Ref Number' : 'UPI UTR Number'}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Enter Transaction ID..."
                                                        value={referenceNumber}
                                                        onChange={(e) => setTransactionDetails(prev => ({
                                                            ...prev,
                                                            [paymentMethod === 'bank' ? 'transactionId' : 'utrNumber']: e.target.value
                                                        }))}
                                                        className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-slate-900 placeholder:text-slate-300 focus:border-slate-900 focus:bg-white outline-none transition-all text-xs"
                                                    />
                                                </div>

                                                <label className="relative group cursor-pointer block">
                                                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                                                    <div className={`w-full py-8 border-2 border-dashed rounded-[2rem] transition-all flex flex-col items-center justify-center gap-2 ${transactionDetails.photo ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200 group-hover:bg-slate-100'}`}>
                                                        {transactionDetails.photo ? (
                                                            <>
                                                                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                                                                    <CheckCircle2 size={20} />
                                                                </div>
                                                                <p className="font-black text-green-600 uppercase text-[10px]">Receipt Uploaded</p>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Camera size={28} className="text-slate-300 group-hover:scale-110 transition-transform" />
                                                                <p className="font-black text-slate-400 uppercase text-[10px]">Upload payment proof</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </label>
                                            </>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-center px-4">
                                                <p className="text-[10px] font-bold text-slate-300 uppercase leading-relaxed">
                                                    No verification needed for Cash on Delivery.<br />Just place your order.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Pay Now / Place Order — the only submit button on the page now.
                                    Placed here in the Payment Method card, right after the payment
                                    details, so the flow reads naturally: choose method → verify → pay. */}
                                <div className="mt-8 pt-8 border-t border-slate-100 space-y-3">
                                    <PlaceOrderButton />
                                    {!isFormValid && !payLoading && (
                                        <p className="text-[9px] font-black text-orange-500 uppercase text-center tracking-widest">
                                            {!shopAddress
                                                ? "Delivery address missing"
                                                : "Enter transaction ID & upload receipt to continue"}
                                        </p>
                                    )}
                                    <p className="text-[9px] font-bold text-slate-300 uppercase text-center tracking-widest">
                                        By placing this order you agree to our wholesale terms
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="p-16 text-center">
                                <AlertCircle size={56} className="mx-auto text-slate-100 mb-4" />
                                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Gateway Configuration Required</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDE: SUMMARY (order totals only — no duplicate submit button here) */}
                <div className="lg:col-span-5">
                    <div className="bg-white rounded-[3rem] border border-slate-900 shadow-2xl overflow-hidden sticky top-28 transition-all">

                        <div className="bg-slate-900 p-8 text-white">
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ShieldCheck size={14} /> Verified Wholesale Order
                            </p>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Subtotal</div>
                                    <div className="text-sm font-black">₹{formatCurrency(subtotal)}</div>
                                </div>

                                {totalSavings > 0 && (
                                    <div className="flex justify-between items-end">
                                        <div className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                                            <PiggyBank size={12} /> Bulk Savings ({savingsPercent.toFixed(1)}%)
                                        </div>
                                        <div className="text-sm font-black text-emerald-400">-₹{formatCurrency(totalSavings)}</div>
                                    </div>
                                )}

                                <div className="flex justify-between items-end">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Transport Charge</div>
                                    <div className="text-sm font-black">₹{formatCurrency(transportCharge)}</div>
                                </div>
                                <div className="flex justify-between">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Handling Charge</div>
                                    <div className="text-sm font-black">₹{formatCurrency(handlingCharge)}</div>
                                </div>

                                {coinsApplied > 0 && (
                                    <div className="flex justify-between items-end">
                                        <div className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5">
                                            <Coins size={12} /> Coins Applied ({coinsApplied})
                                        </div>
                                        <div className="text-sm font-black text-amber-400">-₹{formatCurrency(coinsApplied)}</div>
                                    </div>
                                )}

                                <div className="h-px bg-slate-800 my-4" />
                                <div className="flex justify-between items-end">
                                    <div className="text-[10px] font-black text-white uppercase tracking-widest">Grand Total</div>
                                    <div className="text-3xl font-black tracking-tighter text-white">₹{formatCurrency(total)}</div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 space-y-5">
                            {/* Compact status of the selected payment method — kept as a
                                reference on the summary card, but the actual submit action
                                now lives only in the Payment Method card on the left. */}
                            <div className="flex items-center justify-between bg-slate-50 rounded-2xl px-5 py-4 border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paying via</span>
                                <span className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                                    <CreditCard size={14} className="text-red-600" />
                                    {paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'upi' ? 'UPI' : 'Bank Transfer'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* ── SUCCESS + SAVINGS + DELIVERY CONFIRMATION (shown after the order is placed) ── */}
            {showSuccessModal && successData && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

                        <div className="bg-slate-900 pt-10 pb-14 px-8 text-center relative">
                            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                                <CheckCircle2 className="text-white" size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Order Confirmed!</h2>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                                Order ID: {successData.orderId}
                            </p>
                        </div>

                        <div className="px-6 -mt-8 space-y-3 pb-8">

                            {successData.savedAmount > 0 && (
                                <div className="bg-white border-2 border-emerald-100 rounded-[1.75rem] p-5 shadow-lg flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0">
                                        <PiggyBank className="text-emerald-600" size={22} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">You Saved</p>
                                        <p className="text-2xl font-black text-emerald-600 tracking-tighter flex items-baseline gap-2">
                                            ₹{formatCurrency(successData.savedAmount)}
                                            <span className="text-xs font-black text-emerald-500">
                                                ({successData.savedPercentage.toFixed(1)}% off)
                                            </span>
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-400">with bulk pricing on this order</p>
                                    </div>
                                </div>
                            )}

                       {successData.coinsRedeemed > 0 && (
    <div className="bg-white border-2 border-amber-100 rounded-[1.75rem] p-5 shadow-lg flex items-center gap-4">
        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
            <Coins className="text-amber-500" size={22} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Coins Applied</p>
            <p className="text-2xl font-black text-amber-500 tracking-tighter truncate">
                -₹{formatCurrency(successData.coinsRedeemed)}
            </p>
            <p className="text-[9px] font-bold text-slate-400 truncate">deducted from your wallet</p>
        </div>
    </div>
)}

                            <div className="bg-white border-2 border-slate-100 rounded-[1.75rem] p-5 shadow-lg flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${successData.isSameDay ? "bg-red-50" : "bg-slate-50"}`}>
                                    <Truck className={successData.isSameDay ? "text-red-600" : "text-slate-600"} size={22} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expected Delivery</p>
                                    <p className="text-lg font-black text-slate-900 tracking-tight">
                                        {successData.deliveryLabel}
                                        <span className="text-slate-400 font-bold text-xs ml-2">({successData.deliveryDateStr})</span>
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400">
                                        {successData.isSameDay
                                            ? "Placed before 3 PM — dispatched today"
                                            : "Placed after 3 PM — dispatched next business day"}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    router.push("/Wholesale/orders");
                                }}
                                className="w-full py-4 mt-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                            >
                                View My Orders <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}