"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
    User,
    MapPin,
    Globe,
    Phone,
    Mail,
    ShieldCheck,
    Loader2,
    Save,
    Lock,
    Truck,
    Package,
    AlertTriangle,
    Calendar,
    Hash,
    Coins
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const STATUS_STYLES: Record<string, string> = {
    approved: "bg-emerald-500",
    pending: "bg-amber-500",
    rejected: "bg-red-600",
};

export default function WholesaleProfile() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const userStr = localStorage.getItem("wholesale_user");
            if (!userStr) return router.push("/");
            const user = JSON.parse(userStr);

            const { data, error } = await supabase
                .from("wholesale_users")
                .select("*")
                .eq("id", user.id)
                .single();

            if (error) throw error;
            setProfile(data);
        } catch (error: any) {
            toast.error("Failed to load profile");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Only fields the wholesaler is allowed to edit get sent to Supabase.
    // email, phone, company_name, gst_number, business_id, status,
    // transport_charge, handling_fees and coins are account-level and
    // controlled by admin / automated triggers.
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const { error } = await supabase
                .from("wholesale_users")
                .update({
                    owner_name: profile.owner_name,
                    owner_dob: profile.owner_dob,
                    shop_address: profile.shop_address,
                    google_maps_link: profile.google_maps_link,
                })
                .eq("id", profile.id);

            if (error) throw error;
            toast.success("Profile updated successfully!");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setUpdating(false);
        }
    };

    if (loading || !profile) return (
        <div className="h-screen flex items-center justify-center bg-[#F9FAFB]">
            <Loader2 className="animate-spin text-[#FF4F18]" size={40} />
        </div>
    );

    const statusColor = STATUS_STYLES[profile.status] || "bg-slate-500";
    const memberSince = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : "—";

    return (
        <div className="min-h-screen bg-[#F9FAFB] pb-20">
            <Toaster />
            <div className="max-w-5xl mx-auto px-4 pt-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`${statusColor} text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest`}>
                                {profile.status}
                            </span>
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                                ID: {profile.business_id || "—"}
                            </span>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Business Profile</h1>
                    </div>
                    <div className="flex gap-3 text-black">
                        <button onClick={() => router.push("/Wholesale/orders")} className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase hover:bg-slate-50 transition-all">
                            Orders
                        </button>
                    </div>
                </div>

                {/* Rejection notice */}
                {profile.status === "rejected" && profile.rejection_reason && (
                    <div className="mb-8 flex items-start gap-4 bg-red-50 border border-red-200 rounded-[1.5rem] p-6">
                        <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={22} />
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-red-600 mb-1">Application Rejected</p>
                            <p className="text-sm text-red-700 font-medium">{profile.rejection_reason}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Account (locked) info */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-slate-900 text-white rounded-[2rem] p-8 shadow-xl">
                            <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                <ShieldCheck className="text-[#FF4F18]" size={18} /> Verification
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Company Name</label>
                                    <p className="font-bold text-lg leading-snug">{profile.company_name}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">GST Number</label>
                                    <p className="font-mono text-orange-400 font-bold">{profile.gst_number || "Not provided"}</p>
                                </div>
                                <div className="pt-4 border-t border-white/10">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Registered Email</label>
                                    <p className="text-sm text-slate-300 break-all">{profile.email}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Registered Phone</label>
                                    <p className="text-sm text-slate-300">{profile.phone}</p>
                                </div>
                                <div className="pt-4 border-t border-white/10 flex items-center gap-2 text-slate-400">
                                    <Hash size={12} />
                                    <p className="text-[11px] font-bold uppercase tracking-wide">Member since {memberSince}</p>
                                </div>
                            </div>
                            <p className="mt-8 text-[9px] leading-relaxed text-slate-500 uppercase font-bold">
                                * To change your GST, company name, email or phone, please contact our wholesale support desk.
                            </p>
                        </div>

                        {/* Rewards — read only, earned automatically on delivery */}
                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                            <h3 className="text-xs text-slate-400 font-black uppercase tracking-widest mb-4">Rewards</h3>
                            <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                                    <Coins size={18} className="text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-slate-900 leading-none">{profile.coins ?? 0}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Loyalty Coins</p>
                                </div>
                            </div>
                            <p className="mt-4 text-[9px] leading-relaxed text-slate-400 uppercase font-bold">
                                * You earn 1 coin per ₹1,000 spent, credited automatically once an order is delivered.
                            </p>
                        </div>

                        {/* Account terms - admin controlled, read only */}
                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 space-y-4">
                            <h3 className="text-xs text-slate-400 font-black uppercase tracking-widest mb-2">Account Terms</h3>
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-xl border border-slate-200">
                                        <Truck size={16} className="text-[#FF4F18]" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-600">Transport Charge</span>
                                </div>
                                <span className="font-black text-slate-900">₹{Number(profile.transport_charge ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-xl border border-slate-200">
                                        <Package size={16} className="text-[#FF4F18]" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-600">Handling Fees</span>
                                </div>
                                <span className="font-black text-slate-900">₹{Number(profile.handling_fees ?? 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Editable Info */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Contact Info */}
                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                            <h3 className="text-lg text-[#FF4F18] font-black uppercase tracking-tighter mb-8 flex items-center gap-2">
                                <User className="text-[#FF4F18]" size={20} /> Contact Information
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Email - locked */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase px-1 flex items-center gap-1">
                                        Email <Lock size={10} />
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="email"
                                            value={profile.email}
                                            disabled
                                            className="w-full p-4 pl-12 bg-slate-100 rounded-2xl border border-slate-200 outline-none font-bold text-slate-500 cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                {/* Phone - locked */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase px-1 flex items-center gap-1">
                                        Phone Number <Lock size={10} />
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            value={profile.phone}
                                            disabled
                                            className="w-full p-4 pl-12 bg-slate-100 rounded-2xl border border-slate-200 outline-none font-bold text-slate-500 cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                {/* Owner Name - editable */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Owner Name</label>
                                    <input
                                        type="text"
                                        value={profile.owner_name || ""}
                                        onChange={(e) => setProfile({ ...profile, owner_name: e.target.value })}
                                        placeholder="Enter owner's full name"
                                        className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-[#FF4F18] font-bold text-slate-900"
                                    />
                                </div>

                                {/* Owner DOB - editable */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Owner Date of Birth</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="date"
                                            value={profile.owner_dob || ""}
                                            onChange={(e) => setProfile({ ...profile, owner_dob: e.target.value })}
                                            className="w-full p-4 pl-12 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-[#FF4F18] font-bold text-slate-900"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Addresses */}
                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 space-y-6">
                            <h3 className="text-lg text-[#FF4F18] font-black uppercase tracking-tighter mb-8 flex items-center gap-2">
                                <MapPin className="text-[#FF4F18]" size={20} /> Addresses
                            </h3>

                            {/* Shop/Warehouse Address */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Shop / Warehouse Address</label>
                                <textarea
                                    rows={3}
                                    value={profile.shop_address}
                                    onChange={(e) => setProfile({ ...profile, shop_address: e.target.value })}
                                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-[#FF4F18] font-bold text-slate-900"
                                />
                            </div>

                            {/* Google Maps Link */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Google Maps Link</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="url"
                                        value={profile.google_maps_link}
                                        onChange={(e) => setProfile({ ...profile, google_maps_link: e.target.value })}
                                        className="w-full p-4 pl-12 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-[#FF4F18] font-bold text-slate-900"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            type="submit"
                            disabled={updating}
                            className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-[#FF4F18] hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 disabled:opacity-60 disabled:hover:scale-100"
                        >
                            {updating ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Save Changes</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}