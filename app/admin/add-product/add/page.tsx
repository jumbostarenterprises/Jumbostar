"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  Trash2, Plus, Upload, X, Package, Tag, Layers, ChevronDown,
  IndianRupee, RotateCcw, ArrowLeft, ListOrdered, LayoutGrid, Image as ImageIcon
} from "lucide-react";

const UNITS = ["kg", "g", "L", "ml", "pieces", "pack", "box"];

interface Tier { min_qty: string; price: string; }
interface Variant {
  id?: string; variant: string; mrp: string; stock: string; unit: string;
  wholesale_price: string; discount: string; min_quantity: string; max_quantity: string;
  tiers: Tier[];
}

export default function AddProductPage() {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- FORM STATE ---
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [innerCategories, setInnerCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSub, setSelectedSub] = useState("");
  const [selectedInner, setSelectedInner] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  
  // --- FIXED IMAGE STATES ---
  const [existingImages, setExistingImages] = useState<any[]>([]); // Images from database
  const [newImages, setNewImages] = useState<{ file: File; preview: string }[]>([]); // Newly uploaded images
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]); // Track deleted DB image IDs

  const initialVariant: Variant = {
    variant: "", mrp: "", stock: "", unit: "kg",
    wholesale_price: "", discount: "", min_quantity: "1", max_quantity: "9999",
    tiers: []
  };

  const [variants, setVariants] = useState<Variant[]>([initialVariant]);

  // --- FETCH LOGIC ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id");
    fetchCategories();
    if (productId) {
      setEditingId(productId);
      fetchCompleteProductData(productId);
    }
  }, []);

  useEffect(() => {
    if (selectedCategory) fetchSubcategories();
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedSub) fetchInnerCategories();
  }, [selectedSub]);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*");
    if (data) setCategories(data);
  };

  const fetchSubcategories = async () => {
    const { data } = await supabase.from("subcategories").select("*").eq("category_id", selectedCategory);
    if (data) setSubcategories(data);
  };

  const fetchInnerCategories = async () => {
    const { data } = await supabase.from("inner_categories").select("*").eq("subcategory_id", selectedSub);
    if (data) setInnerCategories(data);
  };

  const fetchCompleteProductData = async (id: string) => {
    setIsFetching(true);
    try {
      const { data: product } = await supabase.from("products").select("*").eq("id", id).single();
      if (product) {
        setName(product.name || ""); 
        setBrand(product.brand || ""); 
        setDescription(product.description || "");
        setSelectedCategory(product.category_id || ""); 
        setSelectedSub(product.subcategory_id || "");
        setSelectedInner(product.inner_category_id || "");
      }
      const { data: varData } = await supabase.from("product_variants").select("*").eq("product_id", id);
      if (varData) {
        const variantsWithTiers = await Promise.all(varData.map(async (v) => {
          const { data: tiers } = await supabase.from("variant_tiers").select("*").eq("variant_id", v.id).order("min_qty", { ascending: true });
          return { ...v, tiers: tiers || [] };
        }));
        setVariants(variantsWithTiers);
      }
      const { data: imgData } = await supabase.from("product_images").select("*").eq("product_id", id);
      if (imgData) setExistingImages(imgData); // Set existing images here
    } finally { setIsFetching(false); }
  };

  // --- HELPERS ---
  const handleVariantChange = (index: number, field: keyof Variant, value: any) => {
    const updated = [...variants];
    (updated[index] as any)[field] = value;
    if (field === "mrp" || field === "discount") {
      const mrp = Number(updated[index].mrp);
      const discount = Number(updated[index].discount);
      updated[index].wholesale_price = (mrp - (mrp * discount) / 100).toFixed(2);
    }
    setVariants(updated);
  };

  const handleTierChange = (vIdx: number, tIdx: number, field: keyof Tier, value: string) => {
    const updated = [...variants];
    updated[vIdx].tiers[tIdx][field] = value;
    setVariants(updated);
  };

  const addTier = (vIdx: number) => {
    const updated = [...variants];
    updated[vIdx].tiers.push({ min_qty: "", price: "" });
    setVariants(updated);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newUploads = files.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      setNewImages(prev => [...prev, ...newUploads]);
    }
  };

const handleSubmit = async () => {
  if (!name.trim() || !selectedCategory) return toast.error("Name and Category required");
  
  setLoading(true);
  try {
    let currentProductId = editingId;
    const payload = { 
      name, brand, description, 
      category_id: selectedCategory, 
      subcategory_id: selectedSub || null, 
      inner_category_id: selectedInner || null 
    };

    // 1. SAVE/UPDATE MAIN PRODUCT
    if (editingId) {
      const { error: updateError } = await supabase.from("products").update(payload).eq("id", editingId);
      if (updateError) throw updateError;
    } else {
      const { data, error: insertError } = await supabase.from("products").insert(payload).select().single();
      if (insertError) throw insertError;
      currentProductId = data.id;
    }

    // 2. HANDLE VARIANTS
    if (editingId) {
      await supabase.from("product_variants").delete().eq("product_id", currentProductId);
    }

    for (const v of variants) {
      if (!v.variant) continue;
      const { data: sV, error: vError } = await supabase.from("product_variants").insert({
        product_id: currentProductId, 
        variant: v.variant, 
        mrp: Number(v.mrp), 
        stock: Number(v.stock),
        unit: v.unit, 
        wholesale_price: Number(v.wholesale_price), 
        discount: Number(v.discount),
        min_quantity: Number(v.min_quantity), 
        max_quantity: Number(v.max_quantity)
      }).select().single();

      if (vError) throw vError;

      if (v.tiers && v.tiers.length > 0) {
        const tPayload = v.tiers.map(t => ({ 
          variant_id: sV.id, 
          min_qty: Number(t.min_qty), 
          price: Number(t.price) 
        }));
        await supabase.from("variant_tiers").insert(tPayload);
      }
    }

    // 3. IMAGE UPLOAD & DELETION LOGIC
    // Delete removed images from database
    if (imagesToDelete.length > 0) {
      const { error: deleteError } = await supabase.from("product_images").delete().in("id", imagesToDelete);
      if (deleteError) console.error("DB Image Delete Error:", deleteError.message);
    }

    // Upload new images
    if (newImages.length > 0) {
      await Promise.all(newImages.map(async ({ file }) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const path = `products/${fileName}`;

        // Upload to Storage
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, file);
        
        if (uploadError) {
          console.error("Upload error:", uploadError.message);
          return;
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);

        // Insert into Database
        const { error: dbImgError } = await supabase.from("product_images").insert({
          product_id: currentProductId,
          image_url: publicUrl
        });

        if (dbImgError) console.error("DB Image Error:", dbImgError.message);
      }));
    }

    toast.success(editingId ? "Product updated successfully!" : "Product added successfully!");
    router.push("/admin/add-product"); 
    
  } catch (err: any) { 
    console.error("Submit Error:", err);
    toast.error(err.message || "Submission failed"); 
  } finally { 
    setLoading(false); 
  }
};

  return (
    <div className="min-h-screen bg-[#F4F7FE] p-4 md:p-8 font-sans text-slate-900">
      <Toaster position="top-right" />

      {/* STICKY TOP NAVIGATION */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white shadow-xl shadow-blue-900/5 sticky top-4 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight">{editingId ? "Edit Product" : "New Inventory Item"}</h1>
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Store Management</p>
          </div>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all flex items-center gap-2">
            <RotateCcw size={14} /> RESET
          </button>
          <button onClick={handleSubmit} disabled={loading} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-lg shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
            {loading ? "PROCESSING..." : "SAVE CHANGES"}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: PRIMARY DATA */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* PRODUCT INFO CARD */}
          <section className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
            <header className="flex items-center gap-2 mb-6 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
              <LayoutGrid size={14} /> Basic Information
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 ml-1">Product Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Organic Basmati Rice" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none font-semibold text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 ml-1">Brand Identity</label>
                <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Brand Name" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none font-semibold text-sm" />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 ml-1">Product Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Describe features, benefits, and specifications..." className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white transition-all outline-none font-medium text-sm resize-none" />
              </div>
            </div>
          </section>

          {/* VARIANTS SECTION */}
          <section className="space-y-4">
            <div className="flex justify-between items-end px-2">
              <header className="text-slate-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Package size={14} /> Variants & Pricing
              </header>
              <button onClick={() => setVariants([...variants, initialVariant])} className="text-[10px] font-black bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                + ADD VARIANT
              </button>
            </div>

            {variants.map((v, i) => (
              <div key={i} className="group bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden transition-all hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5">
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-full">VARIANT #{i + 1}</span>
                    <button onClick={() => setVariants(variants.filter((_, idx) => idx !== i))} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* QUICK SPECS GRID */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    <div className="col-span-2 lg:col-span-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Size</label>
                      <input value={v.variant} onChange={e => handleVariantChange(i, "variant", e.target.value)} placeholder="1kg" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">MRP</label>
                      <input type="number" value={v.mrp} onChange={e => handleVariantChange(i, "mrp", e.target.value)} placeholder="0" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Stock</label>
                      <input type="number" value={v.stock} onChange={e => handleVariantChange(i, "stock", e.target.value)} placeholder="0" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Unit</label>
                      <select value={v.unit} onChange={e => handleVariantChange(i, "unit", e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none">
                        {UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Disc %</label>
                      <input type="number" value={v.discount} onChange={e => handleVariantChange(i, "discount", e.target.value)} className="w-full p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl font-black text-sm outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase text-red-600">Max Qty</label>
                      <input type="number" value={v.max_quantity} onChange={e => handleVariantChange(i, "max_quantity", e.target.value)} className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl font-bold text-sm outline-none" />
                    </div>
                    <div className="col-span-2 lg:col-span-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Wholesale</label>
                      <div className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl font-black text-slate-600 text-sm flex items-center gap-1">
                        <IndianRupee size={12} /> {v.wholesale_price || "0.00"}
                      </div>
                    </div>
                  </div>

                  {/* TIERED DISCOUNTS */}
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-black text-slate-400 flex items-center gap-2"><ListOrdered size={14} /> BULK PRICING TIERS</h4>
                      <button onClick={() => addTier(i)} className="text-[9px] font-black text-red-600 px-3 py-1 bg-white border border-blue-100 rounded-lg hover:bg-red-600 hover:text-white transition-all">+ NEW TIER</button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {v.tiers?.map((tier, tIdx) => (
                        <div key={tIdx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm group/tier">
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-400">Qty {">"}=</span>
                            <input type="number" value={tier.min_qty} onChange={e => handleTierChange(i, tIdx, "min_qty", e.target.value)} className="w-full p-1.5 border-b border-slate-100 focus:border-blue-500 outline-none text-xs font-bold" />
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-400">Price:</span>
                            <input type="number" value={tier.price} onChange={e => handleTierChange(i, tIdx, "price", e.target.value)} className="w-full p-1.5 border-b border-slate-100 focus:border-red-500 outline-none text-xs font-black text-red-600" />
                          </div>
                          <button onClick={() => {
                            const updated = [...variants];
                            updated[i].tiers = updated[i].tiers.filter((_, idx) => idx !== tIdx);
                            setVariants(updated);
                          }} className="p-1.5 text-slate-200 hover:text-red-500"><X size={14}/></button>
                        </div>
                      ))}
                      {v.tiers.length === 0 && <p className="text-[10px] text-slate-400 italic py-2 col-span-2 text-center">No active bulk tiers for this variant.</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* RIGHT COLUMN: SIDEBAR CONTROLS */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* CATEGORY SELECTOR */}
          <section className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-5">
            <header className="text-slate-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
              <Layers size={14} /> Inventory Placement
            </header>
            <div className="space-y-4">
              <div className="relative">
                <select value={selectedCategory || ""} onChange={e => setSelectedCategory(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="">Select Main Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
              <div className="relative">
                <select value={selectedSub || ""} disabled={!selectedCategory} onChange={e => setSelectedSub(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-sm appearance-none outline-none disabled:opacity-50">
                  <option value="">Sub-Category</option>
                  {subcategories.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>
          </section>

          {/* MEDIA UPLOAD */}
          <section className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-5">
            <header className="text-slate-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
              <ImageIcon size={14} /> Media Assets
            </header>
            <div className="grid grid-cols-2 gap-3">
              
              {/* Existing Images from DB */}
              {existingImages.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-100">
                  <img src={img.image_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  <button onClick={() => {
                    setImagesToDelete(prev => [...prev, img.id]);
                    setExistingImages(prev => prev.filter(e => e.id !== img.id));
                  }} className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-lg shadow-sm text-red-500 hover:bg-red-500 hover:text-white transition-all">
                    <X size={12} />
                  </button>
                </div>
              ))}

              {/* Newly Uploaded Images */}
              {newImages.map((img, idx) => (
                <div key={`new-${idx}`} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-100">
                  <img src={img.preview} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  <button onClick={() => {
                    setNewImages(prev => prev.filter((_, i) => i !== idx));
                  }} className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-lg shadow-sm text-red-500 hover:bg-red-500 hover:text-white transition-all">
                    <X size={12} />
                  </button>
                </div>
              ))}

              <label className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all text-slate-400 hover:text-red-600">
                <Upload size={24} />
                <span className="text-[10px] font-black uppercase">Upload</span>
                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}