"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    CheckCircle2, XCircle, Eye, Loader2,
    MapPin, Building2, Phone, Mail, Globe, Hash, User, Calendar,
    Users, Filter, ChevronRight, AlertCircle, Trash2
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { Truck } from "lucide-react";
import { Pencil } from "lucide-react";

type Status = 'all' | 'pending' | 'approved' | 'rejected';

// Fields that make up a wholesaler's editable profile.
// Kept as one object so the edit form and the save payload always match.
type ProfileForm = {
    company_name: string;
    owner_name: string;
    owner_dob: string; // yyyy-mm-dd, for <input type="date">
    email: string;
    phone: string;
    gst_number: string;
    business_id: string;
    registered_address: string;
    shop_address: string;
    google_maps_link: string;
};

const emptyProfileForm: ProfileForm = {
    company_name: "",
    owner_name: "",
    owner_dob: "",
    email: "",
    phone: "",
    gst_number: "",
    business_id: "",
    registered_address: "",
    shop_address: "",
    google_maps_link: "",
};

export default function WholesaleManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Status>('all');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [showApproveInput, setShowApproveInput] = useState(false);
    const [transportCharge, setTransportCharge] = useState<number>(0);
    const [editTransport, setEditTransport] = useState(false);
    const [handlingFees, setHandlingFees] = useState<number>(0);
    const [editCharges, setEditCharges] = useState(false);

    // Wholesaler profile edit states
    const [editProfile, setEditProfile] = useState(false);
    const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfileForm);
    const [savingProfile, setSavingProfile] = useState(false);

    // Deletion Modal States
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<any>(null);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("wholesale_users")
            .select("*")
            .order("created_at", { ascending: false });
        if (!error) setUsers(data);
        else toast.error("Failed to load records");
        setLoading(false);
    };

    const handleStatusUpdate = async (userId: string, newStatus: string) => {
        let updateData: any = {
            status: newStatus,
            updated_at: new Date()
        };

        if (newStatus === "approved") {
            updateData.transport_charge = transportCharge;
            updateData.handling_fees = handlingFees;
        }

        const { error } = await supabase
            .from("wholesale_users")
            .update(updateData)
            .eq("id", userId);

        if (error) toast.error("Update failed");
        else {
            toast.success(`User marked as ${newStatus}`);
            fetchUsers();
            setSelectedUser(null);
            setTransportCharge(0);
            setShowApproveInput(false);
        }
    };

    const updateTransportCharge = async (userId: string) => {
        const { error } = await supabase
            .from("wholesale_users")
            .update({
                transport_charge: transportCharge,
                updated_at: new Date()
            })
            .eq("id", userId);

        if (error) {
            toast.error("Failed to update transport charge");
        } else {
            toast.success("Transport charge updated");

            // update selected user locally
            setSelectedUser((prev: any) => ({
                ...prev,
                transport_charge: transportCharge
            }));

            fetchUsers();
            setEditTransport(false);
        }
    };

    // Opens the profile editor pre-filled with the selected wholesaler's current values
    const openProfileEditor = (user: any) => {
        setSelectedUser(user);
        setProfileForm({
            company_name: user.company_name ?? "",
            owner_name: user.owner_name ?? "",
            owner_dob: user.owner_dob ? new Date(user.owner_dob).toISOString().slice(0, 10) : "",
            email: user.email ?? "",
            phone: user.phone ?? "",
            gst_number: user.gst_number ?? "",
            business_id: user.business_id ?? "",
            registered_address: user.registered_address ?? "",
            shop_address: user.shop_address ?? "",
            google_maps_link: user.google_maps_link ?? "",
        });
        setEditProfile(true);
        setEditCharges(false);
    };
    // Add this helper near the top of the file, above the component
    const truncateText = (text: string, maxLength: number = 20) => {
        if (!text) return text;
        return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
    };
    const saveProfile = async () => {
        if (!selectedUser) return;

        if (!profileForm.company_name.trim()) {
            toast.error("Company name is required");
            return;
        }

        setSavingProfile(true);

        const { error } = await supabase
            .from("wholesale_users")
            .update({
                company_name: profileForm.company_name,
                owner_name: profileForm.owner_name,
                owner_dob: profileForm.owner_dob || null,
                email: profileForm.email,
                phone: profileForm.phone,
                gst_number: profileForm.gst_number,
                business_id: profileForm.business_id,
                registered_address: profileForm.registered_address,
                shop_address: profileForm.shop_address,
                google_maps_link: profileForm.google_maps_link,
                updated_at: new Date(),
            })
            .eq("id", selectedUser.id);

        setSavingProfile(false);

        if (error) {
            toast.error("Failed to update profile");
        } else {
            toast.success("Wholesaler profile updated");
            setSelectedUser((prev: any) => ({ ...prev, ...profileForm }));
            setEditProfile(false);
            fetchUsers();
        }
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        // Added .select() to force Supabase to return the deleted row
        const { data, error } = await supabase
            .from("wholesale_users")
            .delete()
            .eq("id", userToDelete.id)
            .select();

        if (error) {
            toast.error(error.message || "Failed to delete user");
        } else if (!data || data.length === 0) {
            // If data is empty, it means RLS blocked the deletion silently
            toast.error("Permission denied: Check Supabase RLS policies");
        } else {
            toast.success("User deleted successfully");
            fetchUsers();
            setDeleteModalOpen(false);
            setUserToDelete(null);
        }
    };

    const filteredUsers = filter === 'all' ? users : users.filter(u => u.status === filter);
    const count = (status: Status) => status === 'all' ? users.length : users.filter(u => u.status === status).length;

    const statusBadgeClasses = (status: string) =>
        status === "pending"
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : status === "approved"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-slate-100 text-slate-600 border-slate-200";

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-[#FFF8F8] min-h-screen font-sans text-slate-900">
            <Toaster position="top-right" />

            {/* Header Section */}
            <div className="max-w-7xl mx-auto mb-6 lg:mb-10 flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                        Wholesale <span className="text-red-600">Requests</span>
                    </h1>
                    <p className="text-slate-600 mt-2 text-sm sm:text-base lg:text-lg font-medium">
                        Verify and manage wholesale partner applications.
                    </p>
                </div>

                {/* Filter Tabs - horizontally scrollable on mobile */}
                <div className="bg-white p-1.5 sm:p-2 rounded-2xl shadow-md border border-red-50 flex gap-1 overflow-x-auto scrollbar-hide">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`shrink-0 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 sm:gap-3 ${filter === s
                                ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                                : 'text-slate-600 hover:bg-red-50 hover:text-red-600'
                                }`}
                        >
                            <span className="capitalize">{s}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] ${filter === s ? 'bg-white/20 text-white' : 'bg-red-50 text-red-600'
                                }`}>
                                {count(s)}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading / Empty states shared by both layouts */}
            {loading ? (
                <div className="max-w-7xl mx-auto py-24 text-center">
                    <Loader2 className="animate-spin mx-auto text-red-600" size={40} />
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="max-w-7xl mx-auto py-24 text-center text-slate-500 font-bold text-base sm:text-lg px-4">
                    No records found for "{filter}"
                </div>
            ) : (
                <div className="max-w-7xl mx-auto">

                    {/* MOBILE / TABLET CARD LIST (hidden on lg and up) */}
                    <div className="lg:hidden space-y-4">
                        {filteredUsers.map((user) => (
                            <div key={user.id} className="bg-white rounded-3xl border border-red-100 shadow-sm p-5">
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="min-w-0">
                                        <div className="font-black text-slate-900 uppercase text-base truncate">
                                            {user.company_name}
                                        </div>
                                        <div className="text-xs font-bold text-red-600 mt-1 flex items-center gap-1">
                                            <Hash size={12} />
                                            {user.gst_number || "NO GST"}
                                        </div>
                                    </div>
                                    <span className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusBadgeClasses(user.status)}`}>
                                        {user.status}
                                    </span>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                                        <User size={14} className="text-red-400 shrink-0" />
                                        <span className="truncate">{user.owner_name || "Not Provided"}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                                        <Mail size={14} className="text-red-400 shrink-0" />
                                        <span className="truncate">{user.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                                        <Phone size={14} className="text-red-400 shrink-0" />
                                        {user.phone}
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium">
                                        Joined {new Date(user.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => openProfileEditor(user)}
                                        className="flex-1 min-w-[44px] p-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2 text-xs font-black"
                                        title="Edit Profile"
                                    >
                                        <Pencil size={16} /> Edit
                                    </button>

                                    <button
                                        onClick={() => { setSelectedUser(user); setEditProfile(false); setEditCharges(false); }}
                                        className="flex-1 min-w-[44px] p-3 bg-white border border-red-100 rounded-2xl text-red-600 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2 text-xs font-black"
                                    >
                                        <Eye size={16} /> View
                                    </button>

                                    <button
                                        onClick={() => { setUserToDelete(user); setDeleteModalOpen(true); }}
                                        className="p-3 bg-white border border-red-100 rounded-2xl text-red-600 hover:bg-red-600 hover:text-white transition-all"
                                        title="Delete Record"
                                    >
                                        <Trash2 size={16} />
                                    </button>

                                    {user.status === "pending" && (
                                        <>
                                            <button
                                                onClick={() => { setSelectedUser(user); setShowApproveInput(true); }}
                                                className="p-3 bg-white border border-red-100 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all"
                                                title="Approve"
                                            >
                                                <CheckCircle2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleStatusUpdate(user.id, "rejected")}
                                                className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition-all"
                                                title="Reject"
                                            >
                                                <XCircle size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* DESKTOP TABLE (lg and up only) */}
                    <div className="hidden lg:block bg-white rounded-[2.5rem] border border-red-100 shadow-xl shadow-red-900/5 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full table-fixed text-left border-collapse">
                                <colgroup>
                                    <col className="w-[22%]" />
                                    <col className="w-[18%]" />
                                    <col className="w-[24%]" />
                                    <col className="w-[12%]" />
                                    <col className="w-[24%]" />
                                </colgroup>
                                <thead>
                                    <tr className="bg-red-50/50 border-b border-red-100">
                                        <th className="px-3 py-3 text-[9px] font-black uppercase tracking-wider text-slate-700">Company / Tax ID</th>
                                        <th className="px-3 py-3 text-[9px] font-black uppercase tracking-wider text-slate-700">Primary Contact</th>
                                        <th className="px-3 py-3 text-[9px] font-black uppercase tracking-wider text-slate-700">Communication</th>
                                        <th className="px-3 py-3 text-[9px] font-black uppercase tracking-wider text-slate-700">Status</th>
                                        <th className="px-3 py-3 text-[9px] font-black uppercase tracking-wider text-slate-700 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-red-50">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-red-50/30 transition-colors group">

                                            {/* Company */}
                                            {/* Company */}
                                            <td className="px-3 py-3 overflow-hidden">
                                                <div className="font-black text-slate-900 uppercase text-[12px] truncate" title={user.company_name}>
                                                    {truncateText(user.company_name, 20)}
                                                </div>
                                                <div className="text-[10px] font-bold text-red-600 mt-1 flex items-center gap-1 truncate">
                                                    <Hash size={10} className="shrink-0" />
                                                    <span className="truncate">{user.gst_number || "NO GST"}</span>
                                                </div>
                                            </td>

                                            {/* Owner */}
                                            {/* Owner */}
                                            <td className="px-3 py-3 overflow-hidden">
                                                <div className="font-bold text-slate-800 text-[12px] truncate" title={user.owner_name || "Not Provided"}>
                                                    {truncateText(user.owner_name || "Not Provided", 20)}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-medium truncate">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </div>
                                            </td>

                                            {/* Contact */}
                                            <td className="px-3 py-3 overflow-hidden">
                                                <div className="flex items-center gap-1 text-[11px] text-slate-700 font-bold mb-1">
                                                    <Mail size={11} className="text-red-400 shrink-0" />
                                                    <span className="truncate">{user.email}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[11px] text-slate-700 font-bold">
                                                    <Phone size={11} className="text-red-400 shrink-0" />
                                                    <span className="truncate">{user.phone}</span>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-3 py-3">
                                                <span className={`inline-block px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border whitespace-nowrap ${statusBadgeClasses(user.status)}`}>
                                                    {user.status}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-3 py-3 text-right">
                                                <div className="flex justify-end gap-1 flex-wrap">
                                                    <button
                                                        onClick={() => openProfileEditor(user)}
                                                        className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-all shadow-sm"
                                                        title="Edit Profile"
                                                    >
                                                        <Pencil size={13} />
                                                    </button>

                                                    <button
                                                        onClick={() => { setSelectedUser(user); setEditProfile(false); setEditCharges(false); }}
                                                        className="p-1.5 bg-white border border-red-100 rounded-lg text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                        title="View"
                                                    >
                                                        <Eye size={13} />
                                                    </button>

                                                    <button
                                                        onClick={() => { setUserToDelete(user); setDeleteModalOpen(true); }}
                                                        className="p-1.5 bg-white border border-red-100 rounded-lg text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>

                                                    {user.status === "pending" && (
                                                        <>
                                                            <button
                                                                onClick={() => { setSelectedUser(user); setShowApproveInput(true); }}
                                                                className="p-1.5 bg-white border border-red-100 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                                title="Approve"
                                                            >
                                                                <CheckCircle2 size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusUpdate(user.id, "rejected")}
                                                                className="p-1.5 bg-white border border-slate-200 text-slate-400 rounded-lg hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                                                title="Reject"
                                                            >
                                                                <XCircle size={13} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Slide-over Detail View */}
            {selectedUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 flex justify-end transition-all">
                    <div className="w-full sm:max-w-xl bg-white h-full shadow-2xl p-0 flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-5 sm:p-8 border-b border-red-50 bg-red-50/30 flex justify-between items-center shrink-0">
                            <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tighter">
                                {editProfile ? "Edit Wholesaler Profile" : "Application Details"}
                            </h2>
                            <button
                                onClick={() => {
                                    setSelectedUser(null);
                                    setEditProfile(false);
                                    setEditCharges(false);
                                }}
                                className="p-2 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                            >
                                <XCircle />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 sm:space-y-8">

                            {editProfile ? (
                                /* ---------------- PROFILE EDIT FORM ---------------- */
                                <div className="space-y-5">
                                    <p className="text-sm text-slate-500 font-medium -mt-2">
                                        Update {selectedUser.company_name}'s details. Changes save directly to their record.
                                    </p>

                                    <FormField label="Company Name" required>
                                        <input
                                            type="text"
                                            value={profileForm.company_name}
                                            onChange={(e) => setProfileForm(p => ({ ...p, company_name: e.target.value }))}
                                            className="w-full p-4 border border-red-100 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-red-200"
                                        />
                                    </FormField>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField label="GST Number">
                                            <input
                                                type="text"
                                                value={profileForm.gst_number}
                                                onChange={(e) => setProfileForm(p => ({ ...p, gst_number: e.target.value }))}
                                                className="w-full p-4 border border-red-100 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-red-200"
                                            />
                                        </FormField>
                                        <FormField label="Business ID">
                                            <input
                                                type="text"
                                                value={profileForm.business_id}
                                                onChange={(e) => setProfileForm(p => ({ ...p, business_id: e.target.value }))}
                                                className="w-full p-4 border border-red-100 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-red-200"
                                            />
                                        </FormField>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField label="Owner Name">
                                            <input
                                                type="text"
                                                value={profileForm.owner_name}
                                                onChange={(e) => setProfileForm(p => ({ ...p, owner_name: e.target.value }))}
                                                className="w-full p-4 border border-red-100 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-red-200"
                                            />
                                        </FormField>
                                        <FormField label="Date of Birth">
                                            <input
                                                type="date"
                                                value={profileForm.owner_dob}
                                                onChange={(e) => setProfileForm(p => ({ ...p, owner_dob: e.target.value }))}
                                                className="w-full p-4 border border-red-100 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-red-200"
                                            />
                                        </FormField>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField label="Email">
                                            <input
                                                type="email"
                                                value={profileForm.email}
                                                onChange={(e) => setProfileForm(p => ({ ...p, email: e.target.value }))}
                                                className="w-full p-4 border border-red-100 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-red-200"
                                            />
                                        </FormField>
                                        <FormField label="Phone">
                                            <input
                                                type="tel"
                                                value={profileForm.phone}
                                                onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                                                className="w-full p-4 border border-red-100 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-red-200"
                                            />
                                        </FormField>
                                    </div>


                                    <FormField label="Warehouse Address">
                                        <textarea
                                            value={profileForm.shop_address}
                                            onChange={(e) => setProfileForm(p => ({ ...p, shop_address: e.target.value }))}
                                            rows={2}
                                            className="w-full p-4 border border-red-100 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                                        />
                                    </FormField>

                                    <FormField label="Google Maps Link">
                                        <input
                                            type="url"
                                            value={profileForm.google_maps_link}
                                            onChange={(e) => setProfileForm(p => ({ ...p, google_maps_link: e.target.value }))}
                                            placeholder="https://maps.google.com/..."
                                            className="w-full p-4 border border-red-100 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-red-200"
                                        />
                                    </FormField>
                                </div>
                            ) : (
                                /* ---------------- READ-ONLY DETAIL VIEW ---------------- */
                                <>
                                    {/* BUSINESS CARD */}
                                    <div className="p-6 sm:p-8 bg-red-500 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                                        <Building2 className="absolute right-[-10px] bottom-[-10px] text-white/10" size={120} />

                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">
                                            Verified Business
                                        </p>

                                        <h3 className="text-2xl sm:text-3xl font-black uppercase mt-2 break-words">
                                            {selectedUser.company_name}
                                        </h3>

                                        <div className="flex flex-wrap gap-3 mt-6">
                                            <div className="flex items-center gap-2 px-4 py-2 bg-black/20 rounded-xl text-sm font-black">
                                                <Hash size={16} />
                                                GST: {selectedUser.gst_number || "NOT PROVIDED"}
                                            </div>
                                            <div className="flex items-center gap-2 px-4 py-2 bg-black/20 rounded-xl text-sm font-black">
                                                <User size={16} />
                                                ID: {selectedUser.business_id || "PENDING"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* OWNER INFO */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Owner Name</p>
                                            <p className="text-lg font-black text-slate-900">{selectedUser.owner_name || "Not Provided"}</p>
                                        </div>

                                        <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Date of Birth</p>
                                            <p className="text-lg font-black text-slate-900">
                                                {selectedUser.owner_dob ? new Date(selectedUser.owner_dob).toLocaleDateString() : "Not Provided"}
                                            </p>
                                        </div>

                                        <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Email</p>
                                            <p className="text-sm font-bold text-slate-800 break-all">{selectedUser.email}</p>
                                        </div>

                                        <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Phone</p>
                                            <p className="text-lg font-black text-slate-900">{selectedUser.phone}</p>
                                        </div>
                                    </div>

                                    {/* ADDRESS */}
                                    <div className="space-y-4">
                                        <DetailItem icon={<Building2 className="text-red-600" />} label="Registered HQ Address" value={selectedUser.registered_address} />
                                        <DetailItem icon={<MapPin className="text-red-600" />} label="Operational Warehouse" value={selectedUser.shop_address} />
                                        <DetailItem icon={<Truck className="text-red-600" />} label="Transport Charge" value={`₹ ${selectedUser.transport_charge || 0}`} />
                                        <DetailItem icon={<AlertCircle className="text-red-600" />} label="Handling Fees" value={`₹ ${selectedUser.handling_fees || 0}`} />
                                        <DetailItem icon={<Calendar className="text-red-600" />} label="Joined On" value={new Date(selectedUser.created_at).toLocaleDateString()} />
                                    </div>

                                    {editCharges && (
                                        <div className="p-6 bg-red-50 rounded-3xl border border-red-100 space-y-4">
                                            <div>
                                                <label className="text-xs font-black text-red-500 uppercase tracking-widest">Transport Charge (₹)</label>
                                                <input
                                                    type="number"
                                                    value={transportCharge}
                                                    onChange={(e) => setTransportCharge(Number(e.target.value))}
                                                    className="w-full p-4 border border-red-100 rounded-2xl font-bold mt-2"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-xs font-black text-red-500 uppercase tracking-widest">Handling Fees (₹)</label>
                                                <input
                                                    type="number"
                                                    value={handlingFees}
                                                    onChange={(e) => setHandlingFees(Number(e.target.value))}
                                                    className="w-full p-4 border border-red-100 rounded-2xl font-bold mt-2"
                                                />
                                            </div>

                                            <div className="flex gap-3">
                                                <button
                                                    onClick={async () => {
                                                        const { error } = await supabase
                                                            .from("wholesale_users")
                                                            .update({
                                                                transport_charge: transportCharge,
                                                                handling_fees: handlingFees,
                                                                updated_at: new Date()
                                                            })
                                                            .eq("id", selectedUser.id);

                                                        if (error) toast.error("Update failed");
                                                        else {
                                                            toast.success("Charges updated");
                                                            setSelectedUser((prev: any) => ({
                                                                ...prev,
                                                                transport_charge: transportCharge,
                                                                handling_fees: handlingFees
                                                            }));
                                                            setEditCharges(false);
                                                            fetchUsers();
                                                        }
                                                    }}
                                                    className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold"
                                                >
                                                    Save Changes
                                                </button>

                                                <button onClick={() => setEditCharges(false)} className="px-6 py-3 border rounded-xl font-bold">
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* MAP BUTTON */}
                                    {selectedUser.google_maps_link && (
                                        <a
                                            href={selectedUser.google_maps_link}
                                            target="_blank"
                                            className="flex items-center justify-between p-6 bg-slate-900 text-white rounded-[2rem] font-black hover:bg-red-600 transition-all shadow-xl"
                                        >
                                            <span className="flex items-center gap-3">
                                                <Globe size={20} />
                                                Open Location in Maps
                                            </span>
                                            <ChevronRight size={20} />
                                        </a>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer actions */}
                        {editProfile ? (
                            <div className="p-5 sm:p-8 bg-white border-t border-red-50 shrink-0 grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setEditProfile(false)}
                                    className="py-4 rounded-2xl font-black text-slate-500 border-2 border-slate-100 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveProfile}
                                    disabled={savingProfile}
                                    className="py-4 rounded-2xl font-black bg-red-600 text-white shadow-lg shadow-red-100 hover:bg-red-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {savingProfile && <Loader2 className="animate-spin" size={18} />}
                                    Save Profile
                                </button>
                            </div>
                        ) : selectedUser.status === 'pending' ? (
                            <div className="p-5 sm:p-8 bg-white border-t border-red-50 space-y-4 shrink-0">
                                {showApproveInput && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-black text-red-500 uppercase tracking-widest">Transport Charge (₹)</label>
                                            <input
                                                type="number"
                                                value={transportCharge}
                                                onChange={(e) => setTransportCharge(Number(e.target.value))}
                                                className="w-full mt-2 p-4 border border-red-100 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-red-200"
                                                placeholder="Enter transport charge"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-black text-red-500 uppercase tracking-widest">Handling Fees (₹)</label>
                                            <input
                                                type="number"
                                                value={handlingFees}
                                                onChange={(e) => setHandlingFees(Number(e.target.value))}
                                                className="w-full mt-2 p-4 border border-red-100 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-red-200"
                                                placeholder="Enter handling fees"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleStatusUpdate(selectedUser.id, 'rejected')}
                                        className="py-4 rounded-2xl font-black text-slate-400 border-2 border-slate-100 hover:bg-slate-50 transition-all"
                                    >
                                        Reject
                                    </button>

                                    <button
                                        onClick={() => handleStatusUpdate(selectedUser.id, 'approved')}
                                        className="py-4 rounded-2xl font-black bg-red-600 text-white shadow-lg shadow-red-100 hover:bg-red-700 transition-all"
                                    >
                                        Approve Partner
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {editTransport && !editProfile && (
                            <div className="p-6 bg-red-50 rounded-3xl border border-red-100 space-y-3 m-5 sm:m-8 mt-0 shrink-0">
                                <label className="text-xs font-black text-red-500 uppercase tracking-widest">Edit Transport Charge (₹)</label>
                                <input
                                    type="number"
                                    value={transportCharge}
                                    onChange={(e) => setTransportCharge(Number(e.target.value))}
                                    className="w-full p-4 border border-red-100 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-red-200"
                                />
                                <div className="flex gap-3">
                                    <button onClick={() => updateTransportCharge(selectedUser.id)} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold">
                                        Update
                                    </button>
                                    <button onClick={() => setEditTransport(false)} className="px-6 py-3 border rounded-xl font-bold">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && userToDelete && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
                    <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-red-100">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[2rem] flex items-center justify-center mb-2 shadow-inner border border-red-100">
                                <Trash2 size={40} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Delete Partner?</h3>
                            <p className="text-slate-500 font-medium text-sm px-4">
                                This action is permanent and cannot be undone. Are you absolutely sure?
                            </p>

                            <div className="w-full p-5 bg-slate-50 rounded-[2rem] border border-slate-100 mt-4 flex flex-col gap-3">
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Company</span>
                                    <span className="text-base font-black text-slate-900 uppercase">{userToDelete.company_name}</span>
                                </div>
                                <div className="w-full h-px bg-slate-200 rounded-full"></div>
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Current Status</span>
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border inline-block ${statusBadgeClasses(userToDelete.status)}`}>
                                        {userToDelete.status}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3 w-full mt-6">
                                <button
                                    onClick={() => { setDeleteModalOpen(false); setUserToDelete(null); }}
                                    className="flex-1 py-4 rounded-2xl font-bold text-slate-600 bg-white border-2 border-slate-100 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-4 rounded-2xl font-bold text-white bg-red-600 shadow-lg shadow-red-200 hover:bg-red-700 transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

function DetailItem({ icon, label, value }: any) {
    return (
        <div className="flex gap-4 sm:gap-5 p-4 sm:p-5 bg-white border border-red-50 rounded-3xl group hover:border-red-200 transition-all">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">{icon}</div>
            <div className="min-w-0">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-[14px] sm:text-[15px] font-bold text-slate-800 leading-relaxed break-words">{value || "Information not available"}</p>
            </div>
        </div>
    );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <label className="text-xs font-black text-red-500 uppercase tracking-widest">
                {label} {required && <span className="text-red-600">*</span>}
            </label>
            <div className="mt-2">{children}</div>
        </div>
    );
}