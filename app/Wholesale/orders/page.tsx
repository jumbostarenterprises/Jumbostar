"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { CheckCircle2, Loader2, Wallet, ArrowLeft, History, Package, X, IndianRupee, FileText, Download, Search } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import jsPDF from "jspdf";


export default function WholesaleOrders() {
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [returns, setReturns] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"orders" | "returns">("orders");
    const [showPaymentPopup, setShowPaymentPopup] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [bankDetails, setBankDetails] = useState<any>(null);

    const [transactionDetails, setTransactionDetails] = useState({
        utrNumber: "",
        bankRef: "",
        photo: null as File | null
    });

    const fetchBankDetails = async () => {
        const { data } = await supabase
            .from("bank_details")
            .select("*")
            .single();
        setBankDetails(data);
    };

    const [paymentMethod, setPaymentMethod] = useState<"bank" | "upi">("bank");

    useEffect(() => {
        fetchOrders();
        fetchReturns();
        fetchBankDetails();
    }, []);

    const downloadBankPDF = async () => {
        if (!bankDetails) {
            toast.error("Bank details not available");
            return;
        }
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text("Jumbo Star Wholesale", 20, 20);
        doc.setFontSize(12);
        doc.text("Bank Payment Details", 20, 30);
        doc.text(`Account Name: ${bankDetails.account_name}`, 20, 50);
        doc.text(`Bank Name: ${bankDetails.bank_name}`, 20, 60);
        doc.text(`Account Number: ${bankDetails.account_number}`, 20, 70);
        doc.text(`IFSC Code: ${bankDetails.ifsc_code}`, 20, 80);
        doc.text(`UPI ID: ${bankDetails.upi_id}`, 20, 90);
        if (bankDetails.qr_image) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = bankDetails.qr_image;
            img.onload = () => {
                doc.text("Scan & Pay", 20, 110);
                doc.addImage(img, "PNG", 20, 115, 60, 60);
                doc.save("jumbo-star-bank-details.pdf");
            };
        } else {
            doc.save("jumbo-star-bank-details.pdf");
        }
    };

    const fetchReturns = async () => {
        try {
            const userStr = localStorage.getItem("wholesale_user");
            if (!userStr) return;
            const user = JSON.parse(userStr);
            const { data: returnsData, error } = await supabase
                .from("returns")
                .select("*")
                .eq("business_id", user.business_id)
                .order("created_at", { ascending: false });
            if (error) { console.error(error); return; }
            const { data: products } = await supabase
                .from("products")
                .select(`id, name, product_images (image_url)`);
            const mapped = returnsData.map((ret) => {
                const product = products?.find(
                    (p) => p.name.toLowerCase() === ret.product_name.toLowerCase()
                );
                return { ...ret, image_url: product?.product_images?.[0]?.image_url || null };
            });
            setReturns(mapped);
        } catch (err) {
            console.error("Return fetch error", err);
        }
    };

    const fetchOrders = async () => {
        try {
            const userStr = localStorage.getItem("wholesale_user");
            if (!userStr) return router.push("/");
            const user = JSON.parse(userStr);
            const { data, error } = await supabase
                .from("orders")
                .select(`*, payments (id, payment_status, rejection_reason, payment_method, payment_amount, submitted_at)`)
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            setOrders(data || []);
        } catch (error: any) {
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    const handleBalancePayment = async (order: any) => {
        if (processingId) return;
        setProcessingId(order.id);
        try {
            const fullAmount = Number(order.total_payable_amount || order.total_amount);
            const balanceToPay = order.remaining_balance !== null
                ? Number(order.remaining_balance)
                : fullAmount;
            if (balanceToPay <= 0) {
                toast.error("Order is already settled.");
                setProcessingId(null);
                return;
            }
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: Math.round(balanceToPay * 100),
                currency: "INR",
                name: "Jumbo Star Wholesale",
                description: `Settling Order ${order.order_id_custom}`,
                handler: async function (response: any) {
                    const { error: dbError } = await supabase
                        .from("orders")
                        .update({
                            payment_status: 'paid',
                            amount_paid_now: fullAmount,
                            remaining_balance: 0,
                            payment_id: response.razorpay_payment_id,
                            payment_type: 'full',
                            balance_due_date: null
                        })
                        .eq('id', order.id);
                    if (dbError) {
                        toast.error("Update failed. Contact support.");
                    } else {
                        toast.success("Order Fully Settled!");
                        try {
                            const userStr = localStorage.getItem("wholesale_user");
                            const user = userStr ? JSON.parse(userStr) : null;
                            await fetch("/api/send-order-email", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    email: user?.email || order.user_email,
                                    orderId: order.order_id_custom,
                                    status: "Order Fully Paid",
                                    items: order.items,
                                    total: fullAmount,
                                    paid: fullAmount,
                                    remaining: 0,
                                    address: order.address_snapshot,
                                }),
                            });
                        } catch (emailErr) {
                            console.error("Settlement Email failed:", emailErr);
                        }
                        fetchOrders();
                    }
                    setProcessingId(null);
                },
                prefill: {
                    contact: JSON.parse(localStorage.getItem("wholesale_user") || "{}").phone || ""
                },
                theme: { color: "#E11D48" },
                modal: { ondismiss: () => setProcessingId(null) }
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (err) {
            console.error("Payment initialization error:", err);
            setProcessingId(null);
        }
    };

    const handleFileUpload = (e: any) => {
        const file = e.target.files?.[0];
        if (file) setTransactionDetails(prev => ({ ...prev, photo: file }));
    };

    const submitBalancePayment = async () => {
        if (!transactionDetails.photo) {
            toast.error("Upload payment screenshot");
            return;
        }
        try {
            const order = selectedOrder;
            let screenshotUrl = null;
            if (transactionDetails.photo) {
                const fileExt = transactionDetails.photo.name.split(".").pop();
                const fileName = `balance-${order.id}-${Date.now()}.${fileExt}`;
                await supabase.storage.from("payment-proofs").upload(fileName, transactionDetails.photo);
                const { data } = supabase.storage.from("payment-proofs").getPublicUrl(fileName);
                screenshotUrl = data.publicUrl;
            }
            await supabase.from("payments").insert([{
                order_id: order.id,
                order_id_custom: order.order_id_custom,
                user_id: order.user_id,
                payment_method: paymentMethod,
                payment_amount: order.remaining_balance,
                utr_number: paymentMethod === "upi" ? transactionDetails.utrNumber : null,
                bank_ref_number: paymentMethod === "bank" ? transactionDetails.bankRef : null,
                payment_screenshot: screenshotUrl,
                payment_status: "pending"
            }]);
            await supabase.from("orders").update({ payment_status: "pending_verification" }).eq("id", order.id);
            toast.success("Payment proof submitted");
            setShowPaymentPopup(false);
            fetchOrders();
        } catch (err) {
            toast.error("Payment submission failed");
        }
    };

    // ─── RESTOCK ON CANCEL ───────────────────────────────────────────────────────
  const cancelOrder = async (orderId: string) => {
    const confirmCancel = window.confirm("Are you sure you want to cancel this order?");
    if (!confirmCancel) return;

    try {
        const order = orders.find((o) => o.id === orderId);
        if (!order) throw new Error("Order not found");

        // 1. Mark order as cancelled
        const { error: cancelError } = await supabase
            .from("orders")
            .update({ order_status: "cancelled", updated_at: new Date().toISOString() })
            .eq("id", orderId);
        if (cancelError) throw cancelError;

        // 2. Restock each item
        const restockErrors: string[] = [];

        for (const item of order.items || []) {
            try {
                // If variant_id is stored directly — fastest path
                if (item.variant_id) {
                    const { data: v } = await supabase
                        .from("product_variants")
                        .select("stock")
                        .eq("id", item.variant_id)
                        .single();

                    if (v) {
                        await supabase
                            .from("product_variants")
                            .update({ stock: (v.stock || 0) + (item.quantity || 0) })
                            .eq("id", item.variant_id);
                        continue;
                    }
                }

                // Fallback: match by product name + variant_name (e.g. "10", "50")
                // Step A: find the product by name
                const { data: productRows } = await supabase
                    .from("products")
                    .select("id")
                    .ilike("name", item.product_name?.trim());

                if (!productRows || productRows.length === 0) {
                    restockErrors.push(item.product_name);
                    continue;
                }

                const productId = productRows[0].id;

                // Step B: find the variant by product_id + variant value
                const { data: variantRows } = await supabase
                    .from("product_variants")
                    .select("id, stock")
                    .eq("product_id", productId)
                    .eq("variant", item.variant_name?.toString() || item.variant?.toString() || "");

                if (!variantRows || variantRows.length === 0) {
                    restockErrors.push(item.product_name);
                    continue;
                }

                const variantRow = variantRows[0];
                const newStock = (variantRow.stock || 0) + (item.quantity || 0);

                const { error: updateErr } = await supabase
                    .from("product_variants")
                    .update({ stock: newStock })
                    .eq("id", variantRow.id);

                if (updateErr) restockErrors.push(item.product_name);

            } catch (itemErr) {
                console.error("Restock error for item:", item.product_name, itemErr);
                restockErrors.push(item.product_name);
            }
        }

        if (restockErrors.length > 0) {
            toast.success("Order cancelled");
            toast.error(
                `Stock could not be restored for: ${restockErrors.join(", ")}. Please update manually.`,
                { duration: 6000 }
            );
        } else {
            toast.success("Order cancelled successfully");
        }

        fetchOrders();

    } catch (err) {
        console.error(err);
        toast.error("Failed to cancel order");
    }
};
    // ─────────────────────────────────────────────────────────────────────────────

    const cancelReturn = async (returnId: string) => {
        const confirmCancel = window.confirm("Cancel this return request?");
        if (!confirmCancel) return;
        try {
            const { error } = await supabase.from("returns").update({ status: "cancelled" }).eq("id", returnId);
            if (error) throw error;
            toast.success("Return request cancelled");
            fetchReturns();
        } catch (err) {
            toast.error("Failed to cancel return");
        }
    };

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-white">
            <Loader2 className="animate-spin text-red-600 mb-4" size={32} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verifying Ledger...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            <Toaster position="bottom-center" />
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

            {/* Header */}
            <div className="bg-white border-b border-slate-100 pt-10 pb-8 px-4">
                <div className="max-w-5xl mx-auto">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
                        <ArrowLeft size={14} /> Back to sourcing
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter">Purchase Ledger</h1>
                            <div className="flex items-center gap-2 mt-2">
                                <History size={14} className="text-red-600" />
                                <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.1em]">Transaction Records</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 mt-6">
                <div className="flex justify-between items-center border-b pb-4">
                    <div className="flex gap-3">
                        <button onClick={() => setActiveTab("orders")} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase ${activeTab === "orders" ? "bg-red-600 text-white" : "bg-white border text-slate-600"}`}>
                            Orders
                        </button>
                        <button onClick={() => setActiveTab("returns")} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase ${activeTab === "returns" ? "bg-red-600 text-white" : "bg-white border text-slate-600"}`}>
                            Returns
                        </button>
                    </div>
                    <button onClick={downloadBankPDF} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-800">
                        <FileText size={14} /> Download Bank Details
                    </button>
                </div>
            </div>

            {/* Payment Popup */}
            {showPaymentPopup && bankDetails && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden font-sans">
                        <div className="px-10 py-8 flex justify-between items-start">
                            <div className="flex gap-4 items-center">
                                <div className="bg-red-50 p-3 rounded-2xl">
                                    <div className="w-6 h-6 border-2 border-red-600 rounded-md flex items-center justify-center">
                                        <div className="w-3 h-1 bg-red-600 rounded-full" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-[900] uppercase tracking-tighter text-slate-900 leading-none">Secure Checkout</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Transaction Protocol v2.0</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPaymentPopup(false)} className="text-slate-300 hover:text-slate-900 transition-colors">
                                <X size={28} />
                            </button>
                        </div>
                        <div className="px-10 pb-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                                <div className="bg-slate-50/50 rounded-3xl p-6 flex flex-col justify-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Amount</span>
                                    <div className="text-4xl font-[900] text-slate-900 flex items-center gap-1">
                                        <IndianRupee size={28} strokeWidth={4} />
                                        {selectedOrder?.remaining_balance?.toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-slate-50/50 rounded-3xl p-2 flex gap-2">
                                    <button onClick={() => setPaymentMethod("bank")} className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all ${paymentMethod === 'bank' ? 'bg-white shadow-xl text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <FileText size={18} /> Bank Transfer
                                    </button>
                                    <button onClick={() => setPaymentMethod("upi")} className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all ${paymentMethod === 'upi' ? 'bg-white shadow-xl text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <Search size={18} /> UPI / QR
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <h4 className="text-[11px] font-[900] text-slate-900 uppercase tracking-[0.2em]">Payment Details</h4>
                                    <div className="bg-[#0B1221] rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                                        <div className="relative z-10 space-y-8">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Account Name</p>
                                                <p className="text-xl font-black tracking-tight">{bankDetails.account_name}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Account Number</p>
                                                    <p className="text-lg font-black tracking-widest text-red-500">{bankDetails.account_number}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">IFSC</p>
                                                    <p className="text-lg font-black tracking-tight uppercase">{bankDetails.ifsc_code}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h4 className="text-[11px] font-[900] text-slate-900 uppercase tracking-[0.2em]">Verify Transaction</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-2">Bank Ref Number</label>
                                            <input
                                                type="text"
                                                placeholder="Enter Transaction ID..."
                                                className="w-full bg-slate-50 text-black border-none rounded-2xl px-6 py-5 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-red-500/10 outline-none transition-all"
                                                value={paymentMethod === "upi" ? transactionDetails.utrNumber : transactionDetails.bankRef}
                                                onChange={(e) => setTransactionDetails(prev => ({
                                                    ...prev,
                                                    [paymentMethod === "upi" ? 'utrNumber' : 'bankRef']: e.target.value
                                                }))}
                                            />
                                        </div>
                                        <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer group">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="bg-white p-4 rounded-2xl shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                                    <Download size={24} className="text-slate-300" />
                                                </div>
                                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Click to upload payment proof</p>
                                            </div>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                        </label>
                                        <button onClick={submitBalancePayment} className="w-full bg-slate-100 text-slate-400 py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 hover:bg-slate-900 hover:text-white">
                                            Confirm Payment
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Orders Tab */}
            {activeTab === "orders" && (
                <div className="max-w-5xl mx-auto px-4 mt-8 space-y-6">
                    {orders.length > 0 ? orders.map((order) => {
                        const displayTotal = Number(order.total_payable_amount || order.total_amount);
                        const displayPaid = Number(order.amount_paid_now || 0);
                        let displayBalance = order.remaining_balance !== null ? Number(order.remaining_balance) : (order.payment_status === 'paid' ? 0 : displayTotal);
                        const isPaid = displayBalance <= 0;
                        const isCancelled = order.order_status === "cancelled";

                        return (
                            <div key={order.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                                <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase">{order.order_id_custom}</span>
                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${
                                            order.order_status === "processing" ? "bg-amber-50 text-amber-600 border-amber-200"
                                            : order.order_status === "dispatched" ? "bg-blue-50 text-blue-600 border-blue-200"
                                            : order.order_status === "delivered" ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                            : order.order_status === "cancelled" ? "bg-red-50 text-red-600 border-red-200"
                                            : "bg-slate-50 text-slate-600 border-slate-200"
                                        }`}>
                                            {order.order_status}
                                        </span>
                                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border ${displayBalance > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                            {displayBalance > 0 ? 'Credit/Partial' : 'Paid in Full'}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(order.created_at).toLocaleDateString()}</span>
                                </div>

                                <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8">
                                    <div className="flex-1 space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {order.items?.map((item: any, idx: number) => {
                                                const normalizedItem = {
                                                    product_name: item.product_name || "Unknown Product",
                                                    image: item.image || "https://via.placeholder.com/100",
                                                    quantity: item.quantity || 0,
                                                    unit: item.unit || "",
                                                    price_at_purchase: Number(item.price_at_purchase || 0),
                                                    subtotal: Number(item.subtotal || 0)
                                                };
                                                return (
                                                    <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                                        <div className="h-12 w-12 bg-slate-50 rounded-xl flex-shrink-0 overflow-hidden border border-slate-100 p-1">
                                                            <img src={normalizedItem.image} alt={normalizedItem.product_name} className="w-full h-full object-contain" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[10px] font-black text-slate-800 truncate uppercase leading-tight">{normalizedItem.product_name}</p>
                                                            <p className="text-[9px] font-bold text-red-600 uppercase mt-0.5">{normalizedItem.quantity} {normalizedItem.unit}</p>
                                                            <div className="flex justify-between mt-1">
                                                                <span className="text-[9px] text-slate-400 font-bold">₹{normalizedItem.price_at_purchase.toLocaleString("en-IN")} / unit</span>
                                                                <span className="text-[9px] font-black text-slate-900">₹{normalizedItem.subtotal.toLocaleString("en-IN")}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="pt-4 border-t border-slate-50">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Delivery Destination</p>
                                            <p className="text-xs font-bold text-slate-600 leading-relaxed">{order.address_snapshot}</p>
                                        </div>

                                        {order.payments && order.payments.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-slate-100">
                                                <div className="flex items-center justify-between mb-2 px-1">
                                                    <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                        <span className="w-1 h-1 bg-slate-300 rounded-full" /> Payments
                                                    </h3>
                                                    <span className="text-[9px] text-slate-400 font-medium">{order.payments.length} {order.payments.length === 1 ? 'Item' : 'Items'}</span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {order.payments.map((p: any) => {
                                                        const amount = Number(p.payment_amount || 0);
                                                        const statusConfig = {
                                                            pending: { text: "text-amber-600", dot: "bg-amber-500", label: "Pending" },
                                                            approved: { text: "text-emerald-600", dot: "bg-emerald-500", label: "Verified" },
                                                            rejected: { text: "text-rose-600", dot: "bg-rose-500", label: "Declined" }
                                                        }[p.payment_status as "pending" | "approved" | "rejected"] || { text: "text-slate-600", dot: "bg-slate-400", label: p.payment_status };
                                                        return (
                                                            <div key={p.id} className="flex items-center justify-between p-2 px-3 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-white transition-colors">
                                                                <div className="flex items-baseline gap-2">
                                                                    <span className="text-sm font-bold text-slate-800">₹{amount.toLocaleString('en-IN')}</span>
                                                                </div>
                                                                <div className="flex flex-col items-end">
                                                                    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase ${statusConfig.text}`}>
                                                                        <span className={`w-1 h-1 rounded-full ${statusConfig.dot}`} />
                                                                        {statusConfig.label}
                                                                    </div>
                                                                    {p.payment_status === "rejected" && p.rejection_reason && (
                                                                        <span className="text-[9px] text-rose-400 truncate max-w-[120px]">{p.rejection_reason}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Financial Summary */}
                                    <div className="lg:w-72 bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-6 text-white shadow-xl">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center opacity-60">
                                                <span className="text-[9px] font-black uppercase tracking-widest">Total Invoice</span>
                                                <span className="text-xs font-bold">₹{displayTotal.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-emerald-400">
                                                <span className="text-[9px] font-black uppercase tracking-widest">Collected</span>
                                                <span className="text-xs font-bold">₹{displayPaid.toLocaleString()}</span>
                                            </div>
                                            <div className="h-px bg-white/10" />
                                            <div className="py-2">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-1 text-center">Outstanding Balance</p>
                                                <p className={`text-3xl font-black text-center tracking-tighter ${displayBalance > 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                                                    ₹{displayBalance.toLocaleString()}
                                                </p>
                                            </div>

                                            {!isPaid && !isCancelled ? (
                                                <>
                                                    <button
                                                        onClick={() => { setSelectedOrder(order); setShowPaymentPopup(true); }}
                                                        disabled={processingId === order.id}
                                                        className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
                                                    >
                                                        {processingId === order.id ? <Loader2 className="animate-spin" size={16} /> : <Wallet size={16} />}
                                                        Settle Now
                                                    </button>
                                                    {order.order_status !== "cancelled" && order.order_status !== "delivered" && (
                                                        <button
                                                            onClick={() => cancelOrder(order.id)}
                                                            className="w-full mt-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            Cancel Order
                                                        </button>
                                                    )}
                                                </>
                                            ) : isCancelled ? (
                                                <div className="flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20">
                                                    <X size={14} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Order Cancelled</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2 py-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                                                    <CheckCircle2 size={14} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">No Dues</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-center py-20">
                            <Package className="mx-auto text-slate-200 mb-4" size={48} />
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No order history found</p>
                        </div>
                    )}
                </div>
            )}

            {/* Returns Tab */}
            {activeTab === "returns" && (
                <div className="max-w-5xl mx-auto px-4 mt-8 space-y-6">
                    {returns.length > 0 ? returns.map((ret) => (
                        <div key={ret.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="bg-red-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase">Return</span>
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${
                                        ret.status === "pending" ? "bg-amber-50 text-amber-600 border-amber-200"
                                        : ret.status === "approved" ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                        : ret.status === "rejected" ? "bg-red-50 text-red-600 border-red-200"
                                        : ret.status === "cancelled" ? "bg-slate-100 text-slate-500 border-slate-200"
                                        : "bg-slate-50 text-slate-600 border-slate-200"
                                    }`}>
                                        {ret.status || "pending"}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(ret.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <img src={ret.image_url || "https://via.placeholder.com/100"} className="w-14 h-14 rounded-xl border object-contain" />
                                <div>
                                    <p className="text-[10px] font-black text-slate-800 uppercase">{ret.product_name}</p>
                                    <p className="text-[9px] font-bold text-red-600 uppercase">Qty : {ret.quantity}</p>
                                </div>
                            </div>
                            <div className="mt-4 border-t pt-3">
                                <p className="text-[9px] font-black text-slate-400 uppercase">Reason</p>
                                <p className="text-xs font-bold text-slate-600">{ret.reason}</p>
                                {ret.status !== "approved" && ret.status !== "cancelled" && (
                                    <button onClick={() => cancelReturn(ret.id)} className="mt-4 w-full border border-red-200 text-red-600 hover:bg-red-50 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                        Cancel Return
                                    </button>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-20">
                            <p className="text-slate-400 font-bold uppercase text-[10px]">No returned products</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}