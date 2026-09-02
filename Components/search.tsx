"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Search, X, Package } from "lucide-react";

interface ProductResult {
  id: string;
  name: string;
  brand: string;
  is_featured: boolean | null;
  is_best_selling: boolean | null;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("id, name, brand, is_featured, is_best_selling")
      .or(`name.ilike.%${term}%,brand.ilike.%${term}%`)
      .order("name", { ascending: true })
      .limit(30);

    if (error) {
      console.error("Search error:", error.message);
      setResults([]);
    } else {
      setResults(data || []);
    }
    setLoading(false);
  }, []);

  // debounce
  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  // reset + autofocus whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // lock background scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (id: string) => {
    onClose();
    router.push(`/Wholesale/products/${id}`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-start pt-[10vh] sm:pt-[14vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Centered Card */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-200 max-h-[70vh] flex flex-col overflow-hidden">
        {/* Search bar row */}
        <div className="border-b border-slate-200/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products or brands..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-100 rounded-full text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-all"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="shrink-0 p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              aria-label="Close search"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 px-4">
          <div className="py-2">
            {loading && (
              <p className="text-sm text-slate-400 text-center py-8">Searching...</p>
            )}

            {!loading && query && results.length === 0 && (
              <div className="text-center py-16">
                <Package size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-500">
                  No products found for "{query}"
                </p>
              </div>
            )}

            {!loading && !query && (
              <p className="text-sm text-slate-400 text-center py-8">
                Start typing to search products
              </p>
            )}

            <div className="flex flex-col divide-y divide-slate-100">
              {results.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelect(product.id)}
                  className="flex items-center justify-between gap-3 py-4 group text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate group-hover:text-red-600 transition-colors">
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-400 font-medium">{product.brand}</p>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    {product.is_best_selling && (
                      <span className="text-[9px] font-bold uppercase tracking-wide bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
                        Best Seller
                      </span>
                    )}
                    {product.is_featured && (
                      <span className="text-[9px] font-bold uppercase tracking-wide bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
                        Featured
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}