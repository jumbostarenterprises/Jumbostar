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

    return (
        <div className="p-8 bg-[#FFF8F8] min-h-screen font-sans text-slate-900">
            <Toaster position="top-right" />

            {/* Header Section */}
            <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>

                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Wholesale <span className="text-red-600">Requests</span></h1>
                    <p className="text-slate-600 mt-2 text-lg font-medium">Verify and manage wholesale partner applications.</p>
                </div>

                {/* All Filter Tabs */}
                <div className="bg-white p-2 rounded-2xl shadow-md border border-red-50 flex flex-wrap gap-1">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-3 ${filter === s
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

            {/* Main Content Table */}
            <div className="max-w-7xl mx-auto bg-white rounded-[2.5rem] border border-red-100 shadow-xl shadow-red-900/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-red-50/50 border-b border-red-100">
                                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-700">Company / Tax ID</th>
                                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-700">Primary Contact</th>
                                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-700">Communication</th>
                                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-700">Status</th>
                                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-red-50">
                            {loading ? (
                                <tr><td colSpan={5} className="py-32 text-center"><Loader2 className="animate-spin mx-auto text-red-600" size={40} /></td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan={5} className="py-32 text-center text-slate-500 font-bold text-lg">No records found for "{filter}"</td></tr>
                            ) : filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-red-50/30 transition-colors group">

                                    {/* Company */}
                                    <td className="px-8 py-6">
                                        <div className="font-black text-slate-900 uppercase text-base">
                                            {user.company_name}
                                        </div>

                                        <div className="text-xs font-bold text-red-600 mt-1 flex items-center gap-1">
                                            <Hash size={12} />
                                            {user.gst_number || "NO GST"}
                                        </div>
                                    </td>

                                    {/* Owner */}
                                    <td className="px-8 py-6">
                                        <div className="font-bold text-slate-800">
                                            {user.owner_name || "Not Provided"}
                                        </div>

                                        <div className="text-xs text-slate-500 font-medium">
                                            Joined {new Date(user.created_at).toLocaleDateString()}
                                        </div>

                                        {user.owner_dob && (
                                            <div className="text-xs text-slate-400">
                                                DOB: {new Date(user.owner_dob).toLocaleDateString()}
                                            </div>
                                        )}
                                    </td>

                                    {/* Contact */}
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-sm text-slate-700 font-bold mb-1">
                                            <Mail size={14} className="text-red-400" />
                                            {user.email}
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                                            <Phone size={14} className="text-red-400" />
                                            {user.phone}
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-8 py-6">
                                        <span
                                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${user.status === "pending"
                                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                                : user.status === "approved"
                                                    ? "bg-red-50 text-red-700 border-red-200"
                                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                                }`}
                                        >
                                            {user.status}
                                        </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2">
                                            {user.status === "approved" && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setTransportCharge(user.transport_charge ?? 0);
                                                        setHandlingFees(user.handling_fees ?? 0);
                                                        setEditCharges(true);
                                                    }}
                                                    className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-700 transition-all shadow-sm"
                                                    title="Edit Charges"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                            )}
                                            {/* View */}
                                            <button
                                                onClick={() => setSelectedUser(user)}
                                                className="p-3 bg-white border border-red-100 rounded-2xl text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Eye size={18} />
                                            </button>

                                            {/* Delete */}
                                            <button
                                                onClick={() => {
                                                    setUserToDelete(user);
                                                    setDeleteModalOpen(true);
                                                }}
                                                className="p-3 bg-white border border-red-100 rounded-2xl text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                title="Delete Record"
                                            >
                                                <Trash2 size={18} />
                                            </button>

                                            {user.status === "pending" && (
                                                <>
                                                    {/* Approve */}
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setShowApproveInput(true);
                                                        }}
                                                        className="p-3 bg-white border border-red-100 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                    >
                                                        <CheckCircle2 size={18} />
                                                    </button>

                                                    {/* Reject */}
                                                    <button
                                                        onClick={() => handleStatusUpdate(user.id, "rejected")}
                                                        className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                                    >
                                                        <XCircle size={18} />
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

            {/* Slide-over Detail View */}
            {selectedUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 flex justify-end transition-all">
                    <div className="w-full max-w-xl bg-white h-full shadow-2xl p-0 flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-8 border-b border-red-50 bg-red-50/30 flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Application Details</h2>
                            <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-red-100 text-red-600 rounded-xl transition-colors"><XCircle /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">

                            {/* BUSINESS CARD */}
                            <div className="p-8 bg-red-500 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                                <Building2 className="absolute right-[-10px] bottom-[-10px] text-white/10" size={120} />

                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">
                                    Verified Business
                                </p>

                                <h3 className="text-3xl font-black uppercase mt-2">
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
                            <div className="grid grid-cols-2 gap-4">

                                <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                                        Owner Name
                                    </p>
                                    <p className="text-lg font-black text-slate-900">
                                        {selectedUser.owner_name || "Not Provided"}
                                    </p>
                                </div>

                                <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                                        Date of Birth
                                    </p>
                                    <p className="text-lg font-black text-slate-900">
                                        {selectedUser.owner_dob
                                            ? new Date(selectedUser.owner_dob).toLocaleDateString()
                                            : "Not Provided"}
                                    </p>
                                </div>

                                <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                                        Email
                                    </p>
                                    <p className="text-sm font-bold text-slate-800 break-all">
                                        {selectedUser.email}
                                    </p>
                                </div>

                                <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                                        Phone
                                    </p>
                                    <p className="text-lg font-black text-slate-900">
                                        {selectedUser.phone}
                                    </p>
                                </div>

                            </div>


                            {/* ADDRESS */}
                            <div className="space-y-4">

                                <DetailItem
                                    icon={<Building2 className="text-red-600" />}
                                    label="Registered HQ Address"
                                    value={selectedUser.registered_address}
                                />

                                <DetailItem
                                    icon={<MapPin className="text-red-600" />}
                                    label="Operational Warehouse"
                                    value={selectedUser.shop_address}
                                />

                                <DetailItem
                                    icon={<Truck className="text-red-600" />}
                                    label="Transport Charge"
                                    value={`₹ ${selectedUser.transport_charge || 0}`}
                                />

                                <DetailItem
                                    icon={<AlertCircle className="text-red-600" />}
                                    label="Handling Fees"
                                    value={`₹ ${selectedUser.handling_fees || 0}`}
                                />

                                <DetailItem
                                    icon={<Calendar className="text-red-600" />}
                                    label="Joined On"
                                    value={new Date(selectedUser.created_at).toLocaleDateString()}
                                />

                            </div>


                            {editCharges && (
                                <div className="p-6 bg-red-50 rounded-3xl border border-red-100 space-y-4">

                                    <div>
                                        <label className="text-xs font-black text-red-500 uppercase tracking-widest">
                                            Transport Charge (₹)
                                        </label>
                                        <input
                                            type="number"
                                            value={transportCharge}
                                            onChange={(e) => setTransportCharge(Number(e.target.value))}
                                            className="w-full p-4 border border-red-100 rounded-2xl font-bold mt-2"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-black text-red-500 uppercase tracking-widest">
                                            Handling Fees (₹)
                                        </label>
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

                                        <button
                                            onClick={() => setEditCharges(false)}
                                            className="px-6 py-3 border rounded-xl font-bold"
                                        >
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

                        </div>

                        {selectedUser.status === 'pending' && (
                            <div className="p-8 bg-white border-t border-red-50 space-y-4">

                            {showApproveInput && (
                                <div className="space-y-4">
                                    
                                    {/* Transport Charge */}
                                    <div>
                                        <label className="text-xs font-black text-red-500 uppercase tracking-widest">
                                            Transport Charge (₹)
                                        </label>
                                        <input
                                            type="number"
                                            value={transportCharge}
                                            onChange={(e) => setTransportCharge(Number(e.target.value))}
                                            className="w-full mt-2 p-4 border border-red-100 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-red-200"
                                            placeholder="Enter transport charge"
                                        />
                                    </div>

                                    {/* Handling Fees */}
                                    <div>
                                        <label className="text-xs font-black text-red-500 uppercase tracking-widest">
                                            Handling Fees (₹)
                                        </label>
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
                        )}
                        {editTransport && (
                            <div className="p-6 bg-red-50 rounded-3xl border border-red-100 space-y-3">
                                <label className="text-xs font-black text-red-500 uppercase tracking-widest">
                                    Edit Transport Charge (₹)
                                </label>

                                <input
                                    type="number"
                                    value={transportCharge}
                                    onChange={(e) => setTransportCharge(Number(e.target.value))}
                                    className="w-full p-4 border border-red-100 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-red-200"
                                />

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => updateTransportCharge(selectedUser.id)}
                                        className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold"
                                    >
                                        Update
                                    </button>

                                    <button
                                        onClick={() => setEditTransport(false)}
                                        className="px-6 py-3 border rounded-xl font-bold"
                                    >
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
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-red-100">
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
                                    <span
                                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border inline-block ${userToDelete.status === "pending"
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : userToDelete.status === "approved"
                                                ? "bg-red-50 text-red-700 border-red-200"
                                                : "bg-slate-100 text-slate-600 border-slate-200"
                                            }`}
                                    >
                                        {userToDelete.status}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3 w-full mt-6">
                                <button
                                    onClick={() => {
                                        setDeleteModalOpen(false);
                                        setUserToDelete(null);
                                    }}
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
        <div className="flex gap-5 p-5 bg-white border border-red-50 rounded-3xl group hover:border-red-200 transition-all">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">{icon}</div>
            <div>
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-[15px] font-bold text-slate-800 leading-relaxed">{value || "Information not available"}</p>
            </div>
        </div>
    );
}