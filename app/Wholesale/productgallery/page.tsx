"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProductCard from "@/Components/ProductCard";
import ProductFilter from "@/Components/ProductFilter";
import { Search, PackageSearch } from "lucide-react";
import { Toaster } from "react-hot-toast";
function GalleryContent() {
    const searchParams = useSearchParams();
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const [filters, setFilters] = useState({
        category: searchParams.get("category") || null,
        subcategory: searchParams.get("subcategory") || null,
        innerCategory: searchParams.get("innerCategory") || null,
        sort: searchParams.get("sort") || "relevant",
        bestSelling: searchParams.get("bestSelling") === "true"
    });

    // 1. Sync URL params
    useEffect(() => {
        setFilters({
            category: searchParams.get("category"),
            subcategory: searchParams.get("subcategory"),
            innerCategory: searchParams.get("innerCategory"),
            sort: searchParams.get("sort") || "relevant",
            bestSelling: searchParams.get("bestSelling") === "true"
        });
    }, [searchParams]);

    // 2. Fetch Categories
    useEffect(() => {
        async function fetchSidebarData() {
            const { data } = await supabase
                .from("categories")
                .select(`id, name, subcategories (id, title, inner_categories (id, title))`);
            setCategories(data || []);
        }
        fetchSidebarData();
    }, []);

    // 3. Fetch Products (FIXED LOGIC)
    useEffect(() => {
        async function fetchFilteredProducts() {
            setLoading(true);

            // 1. Fetch products with their variants and images
            let query = supabase
                .from("products")
                .select("*, product_images(image_url), product_variants(*)");

            // Category Filtering
            if (filters.innerCategory) {
                query = query.eq("inner_category_id", filters.innerCategory);
            } else if (filters.subcategory) {
                query = query.eq("subcategory_id", filters.subcategory);
            } else if (filters.category) {
                query = query.eq("category_id", filters.category);
            }

            // Best Selling toggle — when active, only fetch products flagged as best sellers
            if (filters.bestSelling) {
                query = query.eq("is_best_selling", true);
            }

            // Search Logic
            if (searchQuery) {
                query = query.ilike("name", `%${searchQuery}%`);
            }

            try {
                const { data, error } = await query;
                if (error) throw error;

                let processedData = data || [];

                // Helper: does this product have ANY variant with stock left?
                const hasStock = (p: any) =>
                    (p.product_variants || []).some((v: any) => (v.stock || 0) > 0);

                // 2. SORT — priority order, highest first:
                //    a) Best sellers always float to the top, regardless of the
                //       chosen sort or any other active filter.
                //    b) In-stock products before out-of-stock ones.
                //    c) Within each of those groups, the user's chosen sort
                //       (price low/high, newest) is applied as the final tie-breaker.
                processedData.sort((a: any, b: any) => {
                    const aBestRank = a.is_best_selling ? 0 : 1;
                    const bBestRank = b.is_best_selling ? 0 : 1;
                    if (aBestRank !== bBestRank) return aBestRank - bBestRank;

                    const aRank = hasStock(a) ? 0 : 1;
                    const bRank = hasStock(b) ? 0 : 1;
                    if (aRank !== bRank) return aRank - bRank;

                    if (filters.sort === "low") {
                        const priceA = a.product_variants?.[0]?.wholesale_price || 0;
                        const priceB = b.product_variants?.[0]?.wholesale_price || 0;
                        return priceA - priceB;
                    } else if (filters.sort === "high") {
                        const priceA = a.product_variants?.[0]?.wholesale_price || 0;
                        const priceB = b.product_variants?.[0]?.wholesale_price || 0;
                        return priceB - priceA; // Higher price first
                    } else if (filters.sort === "newest") {
                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    }
                    return 0;
                });

                setProducts(processedData);
            } catch (err: any) {
                console.error("Fetch Error:", err.message);
                setProducts([]);
            } finally {
                setLoading(false);
            }
        }

        const timer = setTimeout(() => fetchFilteredProducts(), 300);
        return () => clearTimeout(timer);
    }, [filters, searchQuery]);
    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Toaster position="bottom-right" />

            {/* STICKY SEARCH HEADER */}
            <div className="sticky top-0 z-[40] bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-4">
                <div className="max-w-[1400px] mx-auto relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search Library..."
                        className="w-full text-black bg-slate-100 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500/10 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="max-w-[1500px] mx-auto px-4">
                <header className="relative pt-1 pb-1 px-4 overflow-hidden mb-8">
                    <div className="absolute -top-12 left-0 text-[180px] font-black text-slate-50 select-none -z-10 tracking-tighter leading-none opacity-60">
                        VAULT
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 max-w-[1440px] mx-auto">
                        <div className="relative z-10 flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <span className="h-[1px] w-8 bg-red-600"></span>
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-900">
                                    Global <span className="text-red-600">Sourcing</span> Portal
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 tracking-[-0.05em] flex items-center gap-x-4 flex-wrap">
                                Product <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-400  font-serif font-light">Library</span>
                            </h1>
                        </div>

                        <div className="relative flex items-center gap-6 bg-white border border-slate-100 rounded-[2rem] p-4 pr-8 shadow-sm group hover:shadow-md transition-all duration-500">
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-slate-900 tracking-tighter">
                                        {products.length.toString().padStart(2, '0')}
                                    </span>
                                    <span className="text-red-600 text-sm font-bold uppercase tracking-widest">Units</span>
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Verified Batches</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* FILTER COMPONENT - Rendered only once */}
                    <aside className="w-full lg:w-[300px] shrink-0">
                        <div className="sticky top-28 z-30 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm">
                            <ProductFilter
                                categories={categories}
                                activeFilters={filters}
                                onFilterChange={(newFilters: any) => setFilters(newFilters)}
                            />
                        </div>
                    </aside>

                    {/* PRODUCT GRID */}
                    <main className="flex-1 pb-40">
                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="aspect-[3/4] bg-slate-200 animate-pulse rounded-3xl" />
                                ))}
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                                    {products.map((p) => (
                                        <ProductCard key={p.id} product={p} />
                                    ))}
                                </div>

                                {products.length === 0 && (
                                    <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
                                        <PackageSearch className="mx-auto text-slate-300 mb-4" size={48} />
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No Items Found</p>
                                    </div>
                                )}
                            </>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

export default function WholesaleGallery() {
    return (
        <Suspense fallback={<div className="p-20 text-center font-black">LOADING...</div>}>
            <GalleryContent />
        </Suspense>
    );
}