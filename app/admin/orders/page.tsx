"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    Search, Package, Building2, MapPin, Calendar,
    RefreshCcw, ChevronRight, Filter, History, ShoppingBag,
    FileText, X, Phone, IndianRupee
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [groupedClients, setGroupedClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [updating, setUpdating] = useState(false);
    const [returns, setReturns] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("orders");
    const [showAllWholesalers, setShowAllWholesalers] = useState(false);

    useEffect(() => { fetchOrders(); }, []);

    useEffect(() => {
        if (selectedClient) {
            fetchReturns(selectedClient.business_id);
        }
    }, [selectedClient]);

    const fetchReturns = async (businessId: string) => {
        const { data, error } = await supabase
            .from("returns")
            .select("*")
            .eq("business_id", businessId)
            .order("created_at", { ascending: false });

        if (!error) {
            setReturns(data || []);
        }
    };

    const fetchOrders = async () => {
        try {
            setLoading(true);

            // Fetch Orders
            const { data: ordersData, error } = await supabase
                .from("orders")
                .select(`
        *,
        wholesale_users:user_id (*),
        addresses:address_id (*),

        delivery_person:delivery_person_id (
    id,
    name,
    phone_number,
    vehicle_number
),

        payments (
            id,
            payment_amount,
            payment_status,
            payment_method,
            rejection_reason,
            created_at
        )
    `)
                .order("created_at", { ascending: false });

            if (error) throw error;

            // Fetch Returns
            const { data: returnsData } = await supabase
                .from("returns")
                .select("business_id, quantity");

            // Create return count map
            const returnMap: any = {};

            returnsData?.forEach((r: any) => {
                if (!returnMap[r.business_id]) {
                    returnMap[r.business_id] = 0;
                }
                returnMap[r.business_id] += 1;
            });

            setOrders(ordersData);

            const groups = ordersData.reduce((acc: any, order) => {

                const bId = order.wholesale_users?.business_id || "Unknown";

                if (!acc[bId]) {
                    acc[bId] = {
                        business_id: bId,
                        company_name: order.wholesale_users?.company_name || "Unknown Business",
                        client_info: order.wholesale_users,
                        all_orders: [],
                        total_spent: 0,
                        return_count: returnMap[bId] || 0
                    };
                }

                acc[bId].all_orders.push(order);
                acc[bId].total_spent += (order.total_payable_amount || 0);

                return acc;

            }, {});

            setGroupedClients(Object.values(groups));

        } catch (error: any) {
            console.error("Supabase Error:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId: string, updates: any) => {
        if (updates.order_status === "delivered") {
            const orderToUpdate = orders.find(o => o.id === orderId);
            if (orderToUpdate && orderToUpdate.payment_status !== "paid") {
                toast.error("ERROR: Complete payment before marking as Delivered");
                return;
            }
        }
        try {
            setUpdating(true);
            const { data, error } = await supabase
                .from("orders")
                .update(updates)
                .eq("id", orderId)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                toast.error("Update failed: Record not found");
                return;
            }

            // Update local state for the main list
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));

            // Sync the slide-over view if open
            if (selectedClient) {
                setSelectedClient((prev: any) => ({
                    ...prev,
                    all_orders: prev.all_orders.map((o: any) =>
                        o.id === orderId ? { ...o, ...updates } : o
                    )
                }));
            }

            toast.success("Database Updated Successfully");
        } catch (err: any) {
            toast.error(`Update Failed: ${err.message}`);
        } finally {
            setUpdating(false);
        }
    };

    const generateCombinedPDF = () => {
        if (!selectedClient) return;

        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("COMBINED ACTIVE ORDERS STATEMENT", 14, 20);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Business: ${selectedClient.company_name}`, 14, 30);
        doc.text(`Business ID: ${selectedClient.business_id}`, 14, 36);
        doc.text(`Contact: ${selectedClient.client_info?.phone || 'N/A'}`, 14, 42);

        const activeOrders = selectedClient.all_orders.filter(
            (o: any) => o.order_status !== 'delivered' && o.order_status !== 'cancelled'
        );

        let totalRemaining = 0;
        const rows: any[] = [];

        activeOrders.forEach((order: any) => {
            totalRemaining += Number(order.remaining_balance || 0);
            order.items?.forEach((item: any) => {
                rows.push([
                    order.order_id_custom,
                    new Date(order.created_at).toLocaleDateString(),
                    item.product_name,
                    item.quantity,
                    Number(item.price_at_purchase).toFixed(2),
                    Number(order.total_payable_amount).toFixed(2),
                    Number(order.amount_paid_now).toFixed(2),
                    Number(order.remaining_balance).toFixed(2)
                ]);
            });
        });

        autoTable(doc, {
            startY: 50,
            head: [["Order ID", "Date", "Product", "Qty", "Price", "Total", "Paid", "Balance"]],
            body: rows,
            theme: "grid",
            headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255] },
            styles: { fontSize: 8 }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setTextColor(220, 38, 38);
        doc.text(`TOTAL OUTSTANDING BALANCE: RS. ${totalRemaining.toLocaleString()}`, 14, finalY);

        doc.save(`Statement_${selectedClient.business_id}.pdf`);
    };

    const getStatusStyle = (status: string) => {
        const s = status?.toLowerCase();
        if (['paid', 'delivered'].includes(s)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (['processing', 'shipped', 'pending'].includes(s)) return 'bg-amber-50 text-amber-700 border-amber-200';
        if (s === 'cancelled') return 'bg-red-50 text-red-700 border-red-200';
        return 'bg-slate-50 text-slate-700 border-slate-200';
    };

    const filteredClients = groupedClients.filter(client => {
        const matchesSearch = client.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              client.business_id.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;

        // Active orders include processing, pending, and shipped (anything not delivered/cancelled)
        const activeCount = client.all_orders.filter((o: any) => 
            o.order_status !== "delivered" && o.order_status !== "cancelled"
        ).length;
        
        // If not showing all, only show clients with at least 1 active order
        if (!showAllWholesalers && activeCount === 0) {
            return false;
        }

        return true;
    });

    return (
        <div className=" bg-[#FDF8F8] p-6 md:p-12">
            <Toaster position="top-right" />

            {/* Header Section */}
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
                <div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">Order Registry</h1>
                    <p className="text-red-500 font-bold tracking-widest uppercase text-xs mt-1">Management Console </p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button
                            onClick={() => setShowAllWholesalers(true)}
                            className="w-full md:w-auto px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all bg-red-600 text-white shadow-xl hover:bg-red-700"
                        >
                            View All Wholesalers
                        </button>
                        
                        {/* Clear View All Button */}
                        {showAllWholesalers && (
                            <button
                                onClick={() => setShowAllWholesalers(false)}
                                className="p-4 bg-white text-slate-400 rounded-2xl shadow-sm border border-slate-200 hover:bg-slate-50 hover:text-red-600 transition-all flex items-center justify-center"
                                title="Close View All"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                    
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="SEARCH BUSINESS ENTITY..."
                            className="w-full pl-12 pr-4 py-4 text-black bg-white border-0 shadow-xl shadow-red-500/5 rounded-2xl focus:ring-2 ring-red-500 transition-all outline-none text-xs font-black uppercase"
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Business Table */}
            <div className="max-w-[95%] mx-auto bg-white rounded-[2.5rem] shadow-2xl shadow-red-900/5 border border-red-50 overflow-hidden overflow-x-auto">
                {loading ? (
                    <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest animate-pulse">Loading Registry...</div>
                ) : (
                    <table className="w-full text-left min-w-max">
                        <thead className="bg-red-50/50 border-b border-red-100">
                            <tr>
                                <th className="px-6 py-6 text-[10px] font-black uppercase text-red-500 tracking-widest">Business Entity</th>
                                <th className="px-4 py-6 text-[10px] font-black uppercase text-red-500 tracking-widest">Orders</th>
                                
                                {/* Only show Product details if NOT in "View All" mode */}
                                {!showAllWholesalers && (
                                    <>
                                        <th className="px-4 py-6 text-[10px] font-black uppercase text-red-500 tracking-widest">Product</th>
                                        <th className="px-4 py-6 text-[10px] font-black uppercase text-red-500 tracking-widest">Qty</th>
                                        <th className="px-4 py-6 text-[10px] font-black uppercase text-red-500 tracking-widest">Pricing</th>
                                    </>
                                )}
                                
                                <th className="px-4 py-6 text-[10px] font-black uppercase text-red-500 tracking-widest">Returns</th>
                                <th className="px-6 py-6 text-[10px] font-black uppercase text-red-500 tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-red-50">
                            {filteredClients.map(client => {
                                const activeCount = client.all_orders.filter((o: any) => o.order_status !== "delivered" && o.order_status !== "cancelled").length;
                                const displayOrdersCount = showAllWholesalers ? client.all_orders.length : activeCount;
                                
                                const displayOrdersList = showAllWholesalers 
                                    ? client.all_orders 
                                    : client.all_orders.filter((o: any) => o.order_status !== "delivered" && o.order_status !== "cancelled");
                                
                                const allItems = displayOrdersList.flatMap((o: any) => o.items || []);

                                return (
                                    <tr key={client.business_id} className="hover:bg-red-50/30 transition-all cursor-pointer group" onClick={() => setSelectedClient(client)}>
                                        <td className="px-6 py-6 align-top">
                                            <div className="text-lg font-black text-slate-900 tracking-tighter uppercase">{client.company_name}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{client.business_id}</div>
                                        </td>
                                        
                                        <td className="px-4 py-6 align-top">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black inline-block mt-1 ${showAllWholesalers ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-600'}`}>
                                                {displayOrdersCount} {showAllWholesalers ? "TOTAL" : "ACTIVE"}
                                            </span>
                                        </td>

                                        {/* Dynamic Columns specifically for Active View */}
                                        {!showAllWholesalers && (
                                            <>
                                                {/* Product Column - Image Top, Name Bottom */}
                                                <td className="px-4 py-6 align-top">
                                                    <div className="space-y-4">
                                                        {allItems.length > 0 ? allItems.map((item: any, idx: number) => (
                                                            <div key={`p-${idx}`} className="flex flex-col min-h-[7rem]" title={item.product_name}>
                                                                {item.image_url || item.image ? (
                                                                    <img 
                                                                        src={item.image_url || item.image} 
                                                                        alt={item.product_name} 
                                                                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm"
                                                                    />
                                                                ) : (
                                                                    <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                                                                        <Package size={24} className="text-slate-400" />
                                                                    </div>
                                                                )}
                                                                <span className="text-sm font-black text-slate-800 mt-2 break-words w-40 leading-tight">
    {item.product_name}
</span>
                                                            </div>
                                                        )) : <div className="h-28 flex items-center"><span className="text-xs text-slate-400">-</span></div>}
                                                    </div>
                                                </td>

                                                {/* Qty Column */}
                                                <td className="px-4 py-6 align-top">
                                                    <div className="space-y-4">
                                                        {allItems.length > 0 ? allItems.map((item: any, idx: number) => (
                                                            <div key={`q-${idx}`} className="text-sm font-bold text-slate-600 h-28 flex items-center">
                                                                {item.quantity} {item.unit || ''}
                                                            </div>
                                                        )) : <div className="h-28 flex items-center"><span className="text-xs text-slate-400">-</span></div>}
                                                    </div>
                                                </td>

                                                {/* Pricing Column - Price Top, Subtotal Bottom */}
                                                <td className="px-4 py-6 align-top">
                                                    <div className="space-y-4">
                                                        {allItems.length > 0 ? allItems.map((item: any, idx: number) => (
                                                            <div key={`pr-${idx}`} className="h-28 flex flex-col justify-center">
                                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                                                    Price: ₹{Number(item.price_at_purchase).toLocaleString()}
                                                                </span>
                                                                <span className="text-sm font-black text-slate-900 mt-1">
                                                                    Sub: ₹{(Number(item.quantity) * Number(item.price_at_purchase)).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        )) : <div className="h-28 flex items-center"><span className="text-xs text-slate-400">-</span></div>}
                                                    </div>
                                                </td>
                                            </>
                                        )}

                                        <td className="px-4 py-6 align-top">
                                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black inline-block mt-1">
                                                {client.return_count || 0} ITEMS
                                            </span>
                                        </td>

                                        <td className="px-6 py-6 text-right align-top">
                                            <button className="p-3 bg-slate-900 text-white rounded-xl hover:bg-red-600 transition-all group-hover:scale-110 mt-1">
                                                <ChevronRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredClients.length === 0 && (
                                <tr>
                                    <td colSpan={showAllWholesalers ? 4 : 7} className="p-12 text-center font-bold text-slate-400 uppercase text-xs">
                                        No Records Found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Slide-over Detail View */}
            {selectedClient && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex justify-end">
                    <div className="w-full max-w-9xl bg-[#FDF8F8] h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-500">
                        <div className="p-8 md:p-12">
                            <button
                                onClick={() => setSelectedClient(null)}
                                className="mb-8 flex items-center gap-2 px-6 py-3 bg-white rounded-2xl text-[10px] font-black uppercase text-slate-900 shadow-sm hover:bg-red-600 hover:text-white transition-all"
                            >
                                <X size={14} /> Close Business Profile
                            </button>

                            <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b-4 border-red-600 pb-8 gap-6">
                                <div>
                                    <h2 className="text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">{selectedClient.company_name}</h2>
                                    
                                    {/* Revenue & Balance Next to Phone Number */}
                                    <div className="flex flex-wrap gap-4 mt-4 items-center">
                                        <span className="flex items-center gap-1 text-xs font-black text-red-500 uppercase"><Building2 size={14} /> {selectedClient.business_id}</span>
                                        <span className="flex items-center gap-1 text-xs font-black text-slate-500 uppercase"><Phone size={14} /> {selectedClient.client_info?.phone}</span>
                                        
                                        <div className="hidden sm:block w-px h-4 bg-slate-300"></div>
                                        
                                        <span className="flex items-center gap-1 text-xs font-black text-emerald-600 uppercase tracking-widest">
                                            <IndianRupee size={12} /> Revenue: ₹{selectedClient.total_spent?.toLocaleString()}
                                        </span>
                                        <span className="flex items-center gap-1 text-xs font-black text-red-600 uppercase tracking-widest">
                                            <IndianRupee size={12} /> Balance: ₹{selectedClient.all_orders.reduce((acc: number, o: any) => acc + (Number(o.remaining_balance) || 0), 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={generateCombinedPDF} className="flex items-center gap-2 px-8 py-4 bg-red-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-red-600/20 hover:bg-slate-900 transition-all">
                                    <FileText size={16} /> Download Active Statement
                                </button>
                            </div>

                            <div className="flex gap-4 mb-10 border-b pb-4 overflow-x-auto">
                                <button
                                    onClick={() => setActiveTab("orders")}
                                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap ${activeTab === "orders"
                                        ? "bg-red-600 text-white"
                                        : "bg-white text-slate-700"
                                        }`}
                                >
                                    Orders
                                </button>

                                <button
                                    onClick={() => setActiveTab("past")}
                                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap ${activeTab === "past"
                                        ? "bg-red-600 text-white"
                                        : "bg-white text-slate-700"
                                        }`}
                                >
                                    Past Orders
                                </button>

                                <button
                                    onClick={() => setActiveTab("returns")}
                                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap ${activeTab === "returns"
                                        ? "bg-red-600 text-white"
                                        : "bg-white text-slate-700"
                                        }`}
                                >
                                    Returns
                                </button>
                            </div>

                            {activeTab === "orders" && (
                                <>
                                    <div className="mb-16">
                                        <h3 className="text-xs font-black text-slate-400 uppercase mb-6 flex items-center gap-2 tracking-[0.2em]">
                                            <RefreshCcw size={16} className="text-amber-500" /> Active Orders
                                        </h3>

                                        <div className="space-y-6">
                                            {selectedClient.all_orders
                                                .filter((o: any) => o.order_status !== "delivered" && o.order_status !== "cancelled")
                                                .map((order: any) => (
                                                    <OrderCard
                                                        key={order.id}
                                                        order={order}
                                                        updateStatus={updateStatus}
                                                        getStatusStyle={getStatusStyle}
                                                        updating={updating}
                                                    />
                                                ))}

                                            {selectedClient.all_orders.filter((o: any) => o.order_status !== "delivered" && o.order_status !== "cancelled").length === 0 && (
                                                <div className="text-center text-slate-400 font-bold uppercase text-xs">
                                                    No Active Orders
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === "past" && (
                                <div className="space-y-6">

                                    <h3 className="text-xs font-black text-slate-400 uppercase mb-6 flex items-center gap-2 tracking-[0.2em]">
                                        <History size={16} className="text-emerald-500" /> Delivered Orders
                                    </h3>

                                    {selectedClient.all_orders
                                        .filter((o: any) => o.order_status === "delivered")
                                        .map((order: any) => (
                                            <OrderCard
                                                key={order.id}
                                                order={order}
                                                updateStatus={updateStatus}
                                                getStatusStyle={getStatusStyle}
                                                updating={updating}
                                            />
                                        ))}

                                    {selectedClient.all_orders.filter((o: any) => o.order_status === "delivered").length === 0 && (
                                        <div className="text-center text-slate-400 font-bold uppercase text-xs">
                                            No Past Orders
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === "returns" && (
                                <div className="space-y-4">

                                    {returns.length === 0 && (
                                        <div className="text-center text-slate-400 font-bold uppercase text-xs">
                                            No Returns Found
                                        </div>
                                    )}

                                    {returns.map((r: any) => (

                                        <div
                                            key={r.id}
                                            className="bg-white p-6 rounded-2xl border border-red-50 shadow-sm"
                                        >

                                            <div className="flex justify-between items-center">

                                                <div>
                                                    <p className="text-lg font-black text-slate-900">
                                                        {r.product_name}
                                                    </p>

                                                    <p className="text-xs text-slate-500 font-bold uppercase">
                                                        Reason: {r.reason}
                                                    </p>

                                                </div>

                                                <div className="text-right">

                                                    <p className="text-xs font-black text-red-600">
                                                        Qty: {r.quantity}
                                                    </p>

                                                    <p className="text-[10px] text-slate-400 font-bold">
                                                        {new Date(r.created_at).toLocaleDateString()}
                                                    </p>

                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function OrderCard({ order, updateStatus, getStatusStyle, updating }: any) {
    const generateInvoicePDF = (order: any) => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("INVOICE", 14, 25);

        doc.setFontSize(10);
        doc.text(`ID: ${order.order_id_custom}`, 14, 35);
        doc.text(`DATE: ${new Date(order.created_at).toLocaleDateString()}`, 14, 40);

        doc.setFontSize(12);
        doc.text("BILL TO:", 14, 55);
        doc.setFont("helvetica", "normal");
        doc.text(`${order.wholesale_users?.company_name}`, 14, 62);
        doc.text(`GST: ${order.wholesale_users?.gst_number || 'N/A'}`, 14, 68);

        const items = order.items?.map((i: any) => [
            i.product_name,
            i.quantity,
            `RS. ${Number(i.price_at_purchase).toFixed(2)}`,
            `RS. ${(i.quantity * i.price_at_purchase).toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: 80,
            head: [["Product", "Qty", "Price", "Subtotal"]],
            body: items,
            theme: "striped",
            headStyles: { fillColor: [0, 0, 0] }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFont("helvetica", "bold");
        doc.text(`TOTAL PAYABLE: RS. ${Number(order.total_payable_amount).toFixed(2)}`, 14, finalY);
        doc.setTextColor(220, 38, 38);
        doc.text(`BALANCE DUE: RS. ${Number(order.remaining_balance).toFixed(2)}`, 14, finalY + 8);

        doc.save(`Invoice_${order.order_id_custom}.pdf`);
    };

    return (
        <div className="bg-white border-2 border-red-50 rounded-[2rem] p-8 shadow-sm hover:shadow-xl transition-all">
            <div className="flex flex-col lg:flex-row justify-between gap-8">
               <div className="flex flex-col lg:flex-row gap-8 items-start w-full bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
    {/* Left Side: Order Details & Pricing */}
    <div className="flex-1 w-full">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
            <div className="flex flex-col">
                <span className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                    {order.order_id_custom}
                </span>
                <span className="text-xs font-semibold text-slate-500 uppercase mt-1.5 flex items-center gap-1.5">
                    Delivery Person:
                    <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 font-bold text-[11px]">
                        {order.delivery_person?.name || "Not Assigned"}
                    </span>
                </span>
            </div>

            <div>
                <span className="inline-block px-4 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-bold tracking-wide">
                    {new Date(order.created_at).toDateString()}
                </span>
            </div>
        </div>

        {/* Content Layout: Items & Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Itemized List */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
        Itemized List
    </p>

    {/* Table Header */}
    <div className="grid grid-cols-12 gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider">
        <div className="col-span-5">Product</div>
        <div className="col-span-2 text-center">Qty</div>
        <div className="col-span-2 text-right">Price</div>
        <div className="col-span-3 text-right">Subtotal</div>
    </div>

    {/* Table Body */}
    <div className="mt-2 space-y-2">
        {order.items?.map((item: any, idx: number) => (
            <div
                key={idx}
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center bg-white border border-slate-200/60 rounded-xl hover:shadow-sm transition-all"
            >
                {/* Product Info - col-span-5 */}
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <img
                        src={item.image_url || item.image}
                        alt={item.product_name}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-100"
                    />
                    <div className="overflow-hidden">
                        <p className="text-[11px] font-black text-slate-800 truncate leading-tight">
                            {item.product_name}
                        </p>
                        {item.variant_name && (
                            <p className="text-[9px] text-slate-400 font-bold uppercase truncate mt-0.5">
                                {item.variant_name}
                            </p>
                        )}
                    </div>
                </div>

                {/* Quantity - col-span-2 */}
                <div className="col-span-2 text-center">
                    <span className="inline-block px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-[10px] font-black whitespace-nowrap">
                        {item.quantity} {item.unit || ""}
                    </span>
                </div>

                {/* Price - col-span-2 */}
                <div className="col-span-2 text-right">
                    <p className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                        ₹{Number(item.price_at_purchase).toLocaleString()}
                    </p>
                </div>

                {/* Subtotal - col-span-3 */}
                <div className="col-span-3 text-right">
                    <p className="text-[11px] font-black text-slate-900 whitespace-nowrap">
                        ₹{(Number(item.quantity) * Number(item.price_at_purchase)).toLocaleString()}
                    </p>
                </div>
            </div>
        ))}
    </div>
</div>

            {/* Financial Summary & Breakdown */}
            <div className="flex flex-col justify-between bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Payment Summary
                    </p>
                    
                    <div className="flex flex-col items-end text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Payable</p>
                        <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                            ₹{Number(order.total_payable_amount).toLocaleString()}
                        </div>
                        
                        <div className="mt-2 text-[11px] font-bold text-emerald-600 uppercase flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-100">
                            <span>Paid: ₹{Number(order.amount_paid_now).toLocaleString()}</span>
                            {order.payments?.some((p: any) => p.payment_status === "pending") && (
                                <span className="text-amber-600 font-extrabold animate-pulse">(Verification Pending)</span>
                            )}
                        </div>
                    </div>

                    {/* Verification Records Block */}
                    {order.payments && order.payments.length > 0 && (
                        <div className="mt-5 pt-4 border-t border-slate-200/60">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 text-right">
                                Transaction History
                            </p>
                            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                {order.payments.map((p: any) => (
                                    <div
                                        key={p.id}
                                        className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-slate-200/60 text-xs font-semibold text-slate-700"
                                    >
                                        <span className="font-bold text-slate-900">
                                            ₹{Number(p.payment_amount).toLocaleString()}
                                        </span>

                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] uppercase text-slate-400 font-bold bg-slate-50 px-1.5 py-0.5 rounded">
                                                {p.payment_method}
                                            </span>
                                            {p.payment_status === "pending" && (
                                                <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold uppercase">Under Review</span>
                                            )}
                                            {p.payment_status === "approved" && (
                                                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase">Verified</span>
                                            )}
                                            {p.payment_status === "rejected" && (
                                                <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded font-bold uppercase">Rejected</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Remaining Due Tag */}
                <div className="mt-4 flex justify-between items-center bg-red-50/60 border border-red-100 px-4 py-2.5 rounded-xl">
                    <span className="text-[11px] font-black text-red-700 uppercase tracking-wider">Remaining Balance</span>
                    <span className="text-sm font-black text-red-600">
                        ₹{Number(order.remaining_balance).toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    </div>

    {/* Right Side: Quick Actions & Logistics Controls */}
    <div className="flex flex-col gap-3 w-full lg:w-64 bg-slate-50 p-4 rounded-2xl border border-slate-100 lg:sticky lg:top-4">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Update Logistics
        </p>

        {/* Order Status Select */}
        <div className="relative">
            <select
                className={`w-full p-3.5 rounded-xl border-2 text-xs font-bold uppercase cursor-pointer outline-none transition-all shadow-sm ${getStatusStyle(order.order_status)}`}
                value={order.order_status}
                onChange={(e) => updateStatus(order.id, { order_status: e.target.value })}
                disabled={updating || order.order_status === "delivered"}
            >
                <option value="processing">Confirmed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered" disabled={order.payment_status !== "paid"}>
                    Delivered {order.payment_status !== "paid" ? " 🔒" : ""}
                </option>
                <option value="cancelled">Cancelled</option>
            </select>
        </div>

        {/* Payment Status Select */}
        <div className="relative">
            <select
                className={`w-full p-3.5 rounded-xl border-2 text-xs font-bold uppercase cursor-pointer outline-none transition-all shadow-sm ${getStatusStyle(order.payment_status)}`}
                value={order.payment_status}
                onChange={(e) => updateStatus(order.id, { payment_status: e.target.value })}
                disabled={updating || order.payment_status === "paid"}
            >
                <option value="pending">Pending Payment</option>
                <option value="paid">Mark as Fully Paid</option>
            </select>
        </div>

        {/* Download Invoice Button */}
        <button
            onClick={() => generateInvoicePDF(order)}
            className="mt-2 w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase hover:bg-slate-800 active:scale-[0.98] transition-all shadow-md shadow-slate-900/10"
        >
            <FileText size={14} /> 
            <span>Download Invoice</span>
        </button>
    </div>
</div>
            </div>
        </div>
    );
}