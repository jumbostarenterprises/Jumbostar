"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";
import {
  Plus,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  Search,
  Star,
  TrendingUp,
  X
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  brand: string;
  category_id: string;
  subcategory_id: string;
  is_featured: boolean; // Home Page preference
  is_best_selling: boolean; // Best Selling preference
  product_images: { image_url: string }[];
  product_variants: { variant: string; unit: string }[];
}

export default function ProductGalleryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedSub, setSelectedSub] = useState("");
  const [filterFeatured, setFilterFeatured] = useState(false); // Home Page filter
  const [filterBestSelling, setFilterBestSelling] = useState(false); // Best Selling filter

  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState<Record<string, number>>({});
  const router = useRouter();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: catData } = await supabase.from("categories").select("*").order("name");
    setCategories(catData || []);
    const { data: subData } = await supabase.from("subcategories").select("*").order("title");
    setSubcategories(subData || []);
    await fetchProducts();
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        brand,
        category_id,
        subcategory_id,
        is_featured,
        is_best_selling,
        product_images(image_url),
        product_variants(variant, unit)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase Error:", error.message);
    } else {
      setProducts(data || []);
      const indices: Record<string, number> = {};
      data?.forEach(p => indices[p.id] = 0);
      setCurrentImageIndex(indices);
    }
  };

  // --- Toggle Featured (Home Page) Status ---
  const toggleFeatured = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;

    // Optimistic UI Update
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_featured: newStatus } : p));

    const { error } = await supabase
      .from("products")
      .update({ is_featured: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Update failed");
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_featured: currentStatus } : p));
    } else {
      toast.success(newStatus ? "Added to Home Page" : "Removed from Home Page");
    }
  };

  // --- Toggle Best Selling Status ---
  const toggleBestSelling = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;

    // Optimistic UI Update
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_best_selling: newStatus } : p));

    const { error } = await supabase
      .from("products")
      .update({ is_best_selling: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Update failed");
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_best_selling: currentStatus } : p));
    } else {
      toast.success(newStatus ? "Marked as Best Selling" : "Removed from Best Selling");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) toast.error(error.message);
      else fetchProducts();
    }
  };

  const nextImg = (e: React.MouseEvent, id: string, max: number) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => ({ ...prev, [id]: (prev[id] + 1) % max }));
  };

  const prevImg = (e: React.MouseEvent, id: string, max: number) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => ({ ...prev, [id]: (prev[id] - 1 + max) % max }));
  };

  const activeSubcategories = subcategories.filter(sub => sub.category_id === selectedCat);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCat === "" || p.category_id === selectedCat;
    const matchesSub = selectedSub === "" || p.subcategory_id === selectedSub;
    const matchesFeatured = !filterFeatured || p.is_featured;
    const matchesBestSelling = !filterBestSelling || p.is_best_selling;
    return matchesSearch && matchesCat && matchesSub && matchesFeatured && matchesBestSelling;
  });

  const hasActiveFilters = selectedCat || selectedSub || searchTerm || filterFeatured || filterBestSelling;

  const clearFilters = () => {
    setSelectedCat("");
    setSelectedSub("");
    setSearchTerm("");
    setFilterFeatured(false);
    setFilterBestSelling(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-6">
      <Toaster position="bottom-center" />

      <div className="max-w-10xl mx-auto space-y-8">
        {/* --- HEADER --- */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Inventory</h1>
            <p className="text-slate-500 font-medium">Toggle Home Page and Best Selling visibility, manage stock.</p>
          </div>

          <button
            onClick={() => router.push("/admin/add-product/add")}
            className="flex items-center gap-2 bg-red-600 text-white px-8 py-4 rounded-2xl hover:bg-red-700 shadow-xl shadow-red-100 transition-all font-bold"
          >
            <Plus size={20} /> Add New Product
          </button>
        </div>

        {/* --- FILTER BAR --- */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Search Keywords</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-bold text-slate-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="w-full md:w-64 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Category</label>
            <select
              className="w-full p-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-bold text-slate-700 appearance-none"
              value={selectedCat}
              onChange={(e) => { setSelectedCat(e.target.value); setSelectedSub(""); }}
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* --- STATUS FILTER CHIPS --- */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Status</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFilterBestSelling(prev => !prev)}
                aria-pressed={filterBestSelling}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 border ${
                  filterBestSelling
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100"
                    : "bg-slate-50 text-slate-500 border-transparent hover:bg-emerald-50 hover:text-emerald-600"
                }`}
              >
                <TrendingUp size={16} /> Best Selling
              </button>
              <button
                type="button"
                onClick={() => setFilterFeatured(prev => !prev)}
                aria-pressed={filterFeatured}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 border ${
                  filterFeatured
                    ? "bg-amber-400 text-white border-amber-400 shadow-lg shadow-amber-100"
                    : "bg-slate-50 text-slate-500 border-transparent hover:bg-amber-50 hover:text-amber-600"
                }`}
              >
                <Star size={16} fill={filterFeatured ? "currentColor" : "none"} /> Home Page
              </button>
            </div>
          </div>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        {/* --- GRID --- */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-slate-200">
            <Package size={60} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-400">No products found</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const currentIdx = currentImageIndex[product.id] || 0;
              const imagesList = product.product_images || [];
              const hasImages = imagesList.length > 0;

              return (
                <div
                  key={product.id}
                  className="group bg-white rounded-3xl border border-slate-200/70 hover:border-slate-300 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden"
                >
                  {/* Image area */}
                  <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden">
                    {/* --- TOP TOOLBAR: status badges (left) + toggle buttons (right) --- */}
                    <div className="absolute top-0 inset-x-0 z-20 flex items-start justify-between p-3 bg-gradient-to-b from-black/45 via-black/5 to-transparent pointer-events-none">
                      <div className="flex flex-col gap-1.5 pointer-events-auto">
                        {product.is_best_selling && (
                          <span className="px-2.5 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider rounded-full shadow-md w-fit">
                            Best Seller
                          </span>
                        )}
                        {product.is_featured && (
                          <span className="px-2.5 py-1 bg-amber-400 text-white text-[9px] font-black uppercase tracking-wider rounded-full shadow-md w-fit">
                            Home Page
                          </span>
                        )}
                      </div>

                      <div className="flex gap-1.5 pointer-events-auto">
                        <button
                          onClick={() => toggleBestSelling(product.id, product.is_best_selling)}
                          title={product.is_best_selling ? "Remove from Best Selling" : "Mark as Best Selling"}
                          className={`p-2 rounded-full transition-all duration-200 ${
                            product.is_best_selling
                              ? "bg-emerald-500 text-white shadow-md"
                              : "bg-white/90 text-slate-500 backdrop-blur-md hover:text-emerald-500 hover:bg-white"
                          }`}
                        >
                          <TrendingUp size={15} />
                        </button>
                        <button
                          onClick={() => toggleFeatured(product.id, product.is_featured)}
                          title={product.is_featured ? "Remove from Home Page" : "Add to Home Page"}
                          className={`p-2 rounded-full transition-all duration-200 ${
                            product.is_featured
                              ? "bg-amber-400 text-white shadow-md"
                              : "bg-white/90 text-slate-500 backdrop-blur-md hover:text-amber-500 hover:bg-white"
                          }`}
                        >
                          <Star size={15} fill={product.is_featured ? "currentColor" : "none"} />
                        </button>
                      </div>
                    </div>

                    {hasImages ? (
                      <>
                        <Image
                          src={imagesList[currentIdx].image_url}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        {imagesList.length > 1 && (
                          <>
                            <div className="absolute inset-0 flex items-center justify-between px-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button onClick={(e) => prevImg(e, product.id, imagesList.length)} className="p-2 rounded-full bg-white/90 shadow-lg hover:bg-red-600 hover:text-white transition-all">
                                <ChevronLeft size={16} />
                              </button>
                              <button onClick={(e) => nextImg(e, product.id, imagesList.length)} className="p-2 rounded-full bg-white/90 shadow-lg hover:bg-red-600 hover:text-white transition-all">
                                <ChevronRight size={16} />
                              </button>
                            </div>
                            <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1 z-10">
                              {imagesList.map((_, i) => (
                                <span
                                  key={i}
                                  className={`h-1.5 rounded-full transition-all ${
                                    i === currentIdx ? "w-4 bg-white" : "w-1.5 bg-white/60"
                                  }`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-300">
                        <Package size={40} />
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-1">{product.brand || "Generic"}</p>
                    <h2 className="font-bold text-slate-800 text-base leading-snug mb-3 group-hover:text-red-600 transition-colors line-clamp-2 min-h-[2.5rem]">
                      {product.name}
                    </h2>

                    {product.product_variants?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {product.product_variants.map((v, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200">
                            {v.variant} {v.unit}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto pt-4 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => router.push(`/admin/add-product/add?id=${product.id}`)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all"
                      >
                        <Edit3 size={14} /> EDIT
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}