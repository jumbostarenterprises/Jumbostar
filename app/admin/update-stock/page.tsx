"use client";

import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { Search, Save, RotateCcw, Tag, Loader2, AlertCircle } from "lucide-react";

type ProductVariant = {
    id: string;
    product_id: string;
    variant: string;
    mrp: number;
    stock: number;
    unit: string;
    wholesale_price: number;
    discount: number;
    min_quantity: number;
    created_at?: string;
    products?: {
        name: string;
    };
};

export default function UpdatePriceStockPage() {
    const [variants, setVariants] = useState<ProductVariant[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [editedRows, setEditedRows] = useState<Set<string>>(new Set());

    // 1. Fetch Data
    useEffect(() => {
        async function fetchVariants() {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from("product_variants")
                    .select(`
                        *,
                        products ( name )
                    `)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setVariants(data || []);
            } catch (error: any) {
                toast.error("Error loading variants: " + error.message);
            } finally {
                setLoading(false);
            }
        }
        fetchVariants();
    }, []);

    // 2. Filter logic
    const filteredVariants = useMemo(() => {
        return variants.filter((v) =>
            v.products?.name.toLowerCase().includes(search.toLowerCase()) ||
            v.variant.toLowerCase().includes(search.toLowerCase())
        );
    }, [search, variants]);

    // 3. Change Handler
    const handleChange = (id: string, field: keyof ProductVariant, value: string) => {
        const updated = variants.map((v) => {
            if (v.id === id) {
                let updatedVariant = { ...v };

                if (["mrp", "discount", "stock", "min_quantity"].includes(field)) {
                    let numValue = value === "" ? 0 : Number(value);
                    if (field === "discount") numValue = Math.min(99, Math.max(0, numValue));
                    (updatedVariant as any)[field] = numValue;
                } else {
                    (updatedVariant as any)[field] = value;
                }

                if (field === "mrp" || field === "discount") {
                    const mrp = field === "mrp" ? Number(value) : updatedVariant.mrp;
                    const discount = field === "discount" ? Number(value) : updatedVariant.discount;
                    updatedVariant.wholesale_price = Math.round(mrp - (mrp * (discount || 0)) / 100);
                }

                return updatedVariant;
            }
            return v;
        });

        setVariants(updated);
        setEditedRows((prev) => new Set(prev).add(id));
    };

    // 4. Save Changes
    const handleSave = async () => {
        if (editedRows.size === 0) return;

        const itemsToUpdate = variants.filter((v) => editedRows.has(v.id));
        const payload = itemsToUpdate.map(({ products, ...rest }) => rest);

        const loadingToast = toast.loading(`Saving ${itemsToUpdate.length} updates...`);

        try {
            const { error } = await supabase
                .from("product_variants")
                .upsert(payload, { onConflict: 'id' });

            if (error) throw error;

            toast.success("Inventory updated!", { id: loadingToast });
            setEditedRows(new Set());
        } catch (error: any) {
            toast.error("Failed to save: " + error.message, { id: loadingToast });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
                <Loader2 className="animate-spin text-red-600 mb-4" size={40} />
                <p className="text-slate-500 animate-pulse font-medium">Syncing with database...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] p-3 sm:p-6 md:p-8 pb-24">
            <div className="max-w-7xl mx-auto">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-widest">
                            <div className="h-1 w-6 bg-red-600 rounded-full" />
                            Admin Portal
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Price & Stock</h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">Manage variants and wholesale pricing.</p>
                    </div>

                    <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                        {editedRows.size > 0 && (
                            <button
                                onClick={() => window.location.reload()}
                                className="px-3 py-2 text-slate-500 hover:text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
                            >
                                <RotateCcw size={14} /> Discard
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={editedRows.size === 0}
                            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all
                            ${editedRows.size > 0
                                ? "bg-slate-900 text-white hover:bg-red-600 shadow-lg shadow-red-200"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                        >
                            <Save size={15} /> Update DB {editedRows.size > 0 && `(${editedRows.size})`}
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="group relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search product name or size..."
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-transparent bg-white shadow-md shadow-slate-200/50 focus:border-red-500/20 outline-none transition-all text-xs sm:text-sm text-slate-700 font-bold placeholder:text-slate-300"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* MOBILE VIEW: Card Stack Layout (< 768px) */}
                <div className="block md:hidden space-y-4">
                    {filteredVariants.map((v) => {
                        const isEdited = editedRows.has(v.id);
                        return (
                            <div 
                                key={v.id} 
                                className={`bg-white rounded-2xl p-4 shadow-md border transition-all ${
                                    isEdited ? "border-red-300 bg-red-50/20 shadow-red-100" : "border-slate-200"
                                }`}
                            >
                                {/* Product Title & Badges */}
                                <div className="flex justify-between items-start gap-2 mb-3 pb-3 border-b border-slate-100">
                                    <div>
                                        <h3 className="font-black text-slate-900 text-sm leading-tight">
                                            {v.products?.name || "Untitled"}
                                        </h3>
                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-bold text-slate-600 mt-1.5 uppercase">
                                            <Tag size={10} />
                                            <span>{v.variant}</span>
                                            <span>•</span>
                                            <span>{v.unit}</span>
                                        </div>
                                    </div>
                                    {isEdited && (
                                        <span className="px-2 py-0.5 bg-red-100 text-red-600 font-black text-[10px] rounded-full animate-pulse">
                                            Modified
                                        </span>
                                    )}
                                </div>

                                {/* Form Grid for Inputs */}
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">MRP (₹)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                                            <input
                                                type="number"
                                                className="w-full pl-7 pr-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs text-slate-800 outline-none focus:border-red-500"
                                                value={v.mrp}
                                                onChange={(e) => handleChange(v.id, "mrp", e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Discount (%)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs text-slate-800 outline-none focus:border-red-500 text-center"
                                                value={v.discount}
                                                onChange={(e) => handleChange(v.id, "discount", e.target.value)}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">%</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Stock</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs text-slate-800 outline-none focus:border-red-500"
                                            value={v.stock}
                                            onChange={(e) => handleChange(v.id, "stock", e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Unit</label>
                                        <select
                                            className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs text-slate-800 outline-none focus:border-red-500"
                                            value={v.unit}
                                            onChange={(e) => handleChange(v.id, "unit", e.target.value)}
                                        >
                                            <option value="L">L</option>
                                            <option value="kg">kg</option>
                                            <option value="pcs">pcs</option>
                                            <option value="gm">gm</option>
                                            <option value="ml">ml</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Min Qty</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-xs text-slate-800 outline-none focus:border-red-500"
                                            value={v.min_quantity}
                                            onChange={(e) => handleChange(v.id, "min_quantity", e.target.value)}
                                        />
                                    </div>

                                    {/* Calculated Result Box */}
                                    <div className="bg-slate-900 text-white rounded-xl p-2 flex flex-col justify-center">
                                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Wholesale Total</span>
                                        <span className="text-sm font-black text-red-400">₹{v.wholesale_price}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* DESKTOP VIEW: Table Layout (>= 768px) */}
                <div className="hidden md:block bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Product Info</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">MRP (₹)</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Stock</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Unit</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Min Qty</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Discount</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-100/30">Wholesale Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredVariants.map((v) => {
                                    const isEdited = editedRows.has(v.id);
                                    return (
                                        <tr key={v.id} className={`group transition-all ${isEdited ? "bg-red-50/30" : "hover:bg-slate-50/80"}`}>
                                            <td className="p-5">
                                                <div className="font-black text-slate-800 text-sm leading-tight">{v.products?.name || "Untitled"}</div>
                                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-bold text-slate-500 mt-2 uppercase">
                                                    <Tag size={10} />
                                                    <span>{v.variant}</span>
                                                    <span className="opacity-50">•</span>
                                                    <span>{v.unit}</span>
                                                </div>
                                            </td>

                                            <td className="p-5">
                                                <div className="relative w-28">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                                    <input
                                                        type="number"
                                                        className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-sm text-slate-700 focus:bg-white focus:border-red-500/30 outline-none transition-all"
                                                        value={v.mrp}
                                                        onChange={(e) => handleChange(v.id, "mrp", e.target.value)}
                                                    />
                                                </div>
                                            </td>

                                            <td className="p-5">
                                                <input
                                                    type="number"
                                                    className="w-24 px-3 py-2.5 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-sm text-slate-700 focus:bg-white focus:border-red-500/30 outline-none transition-all"
                                                    value={v.stock}
                                                    onChange={(e) => handleChange(v.id, "stock", e.target.value)}
                                                />
                                            </td>

                                            <td className="p-5">
                                                <select
                                                    className="w-24 px-3 py-2.5 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-sm text-slate-700 focus:bg-white focus:border-red-500/30 outline-none transition-all cursor-pointer"
                                                    value={v.unit}
                                                    onChange={(e) => handleChange(v.id, "unit", e.target.value)}
                                                >
                                                    <option value="L">L</option>
                                                    <option value="kg">kg</option>
                                                    <option value="pcs">pcs</option>
                                                    <option value="gm">gm</option>
                                                    <option value="ml">ml</option>
                                                </select>
                                            </td>

                                            <td className="p-5">
                                                <input
                                                    type="number"
                                                    className="w-20 px-3 py-2.5 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-sm text-slate-700 focus:bg-white focus:border-red-500/30 outline-none transition-all"
                                                    value={v.min_quantity}
                                                    onChange={(e) => handleChange(v.id, "min_quantity", e.target.value)}
                                                />
                                            </td>

                                            <td className="p-5">
                                                <div className="flex items-center justify-center gap-2">
                                                    <input
                                                        type="number"
                                                        className="w-20 px-3 py-2.5 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-sm text-slate-700 text-center focus:bg-white focus:border-red-500/30 outline-none transition-all"
                                                        value={v.discount}
                                                        onChange={(e) => handleChange(v.id, "discount", e.target.value)}
                                                    />
                                                    <span className="text-slate-400 font-bold text-sm">%</span>
                                                </div>
                                            </td>

                                            <td className="p-5 bg-slate-50/50">
                                                <div className="flex flex-col">
                                                    <div className="text-lg font-black text-slate-900 flex items-center gap-2">
                                                        ₹{v.wholesale_price}
                                                        {isEdited && <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />}
                                                    </div>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Calculated Price</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {filteredVariants.length === 0 && (
                    <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 mt-4">
                        <div className="inline-flex p-5 rounded-full bg-slate-50 text-slate-300 mb-4">
                            <AlertCircle size={36} />
                        </div>
                        <p className="text-slate-400 font-bold text-sm">No variants found matching your search</p>
                    </div>
                )}
            </div>
        </div>
    );
}