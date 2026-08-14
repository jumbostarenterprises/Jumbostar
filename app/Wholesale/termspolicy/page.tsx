import React from "react";
import Link from "next/link";
import { Shield, FileText, Lock, Building2, Mail, ArrowLeft } from "lucide-react";

export default function TermsPolicyPage() {
    return (
        <div className="min-h-screen bg-black pb-24 text-slate-100 selection:bg-red-600 selection:text-white">
            {/* Header / Navigation */}
            <div className="bg-gradient-to-b from-neutral-900 to-black border-b border-neutral-800 text-white py-20 px-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Link
                        href="/customer"
                        className="inline-flex items-center gap-2 text-neutral-400 hover:text-red-500 transition-colors font-medium text-sm"
                    >
                        <ArrowLeft size={16} /> Back to Home
                    </Link>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter">
                        Terms & <span className="text-red-600">Privacy Policy</span>
                    </h1>
                    <p className="text-neutral-400 text-lg md:text-xl max-w-2xl font-light">
                        Operated by Jumbostar Enterprises. Review our terms of use, privacy practices, and platform guidelines.
                    </p>
                </div>
            </div>

            {/* Main Content Container */}
            <main className="max-w-4xl mx-auto px-6 -mt-10">
                <div className="bg-neutral-950 border border-neutral-800/80 rounded-[3rem] p-8 md:p-16 shadow-2xl space-y-16">
                    
                    {/* Notice Box */}
                    <div className="bg-red-950/20 border border-red-950 p-6 md:p-8 rounded-3xl flex items-start gap-4">
                        <Shield className="text-red-600 flex-shrink-0 mt-1" size={28} />
                        <p className="text-red-200/80 text-sm md:text-base font-medium leading-relaxed">
                            For the most up-to-date and legally binding information, it is recommended to review the specific Terms and Conditions page on the official Jumbostar website or mobile application, as policies may change.
                        </p>
                    </div>

                    {/* Section 1: Privacy Policy */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-neutral-800 pb-6">
                            <div className="p-3 bg-red-600/10 border border-red-600/20 rounded-2xl text-red-600">
                                <Lock size={28} />
                            </div>
                            <h2 className="text-2xl md:text-4xl font-black tracking-tight text-white">1. Privacy Policy & Data Usage</h2>
                        </div>
                        <div className="space-y-4 text-neutral-300 leading-relaxed font-light">
                            <p className="text-lg">
                                Welcome to Jumbostar! This mobile application is owned and operated by <strong className="text-white font-semibold">Jumbostar Enterprises</strong>, incorporated in India, with its registered office at 60/2 A Madanayakanahalli, opp. Miami Supermarket, Bangalore - 562162, Karnataka, India.
                            </p>
                            
                            <h3 className="font-bold text-white text-xl pt-4">Information Collection & Permissions</h3>
                            <ul className="space-y-3 pl-2">
                                <li className="flex items-start gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2.5 flex-shrink-0" />
                                    <span><strong>Registration Info:</strong> Collects personal information including name, age, address, email ID, phone number, and account details.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2.5 flex-shrink-0" />
                                    <span><strong>Location:</strong> Collected to optimize delivery services and ensure precise deliveries based on voluntary sharing.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2.5 flex-shrink-0" />
                                    <span><strong>Camera & Storage:</strong> Accessed upon explicit request to capture profile images during onboarding and enable photo selection from your device.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2.5 flex-shrink-0" />
                                    <span><strong>Device Info:</strong> Read phone state permission is requested to access essential details like IMEI and network info for optimal functionality.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2.5 flex-shrink-0" />
                                    <span><strong>Aadhaar / PAN Data:</strong> Captured images of PAN and Aadhaar cards are processed solely for user identification and verification, passed on to lending partners (NBFCs). This data is <strong className="text-white">not stored on systems for more than one week</strong> after the verification and onboarding process is completed.</span>
                                </li>
                            </ul>

                            <h3 className="font-bold text-white text-xl pt-4">Data Sharing & Security</h3>
                            <p className="text-lg">
                                Information collected may be transferred to a third party in the event of a sale, acquisition, merger, or bankruptcy. Cookies are used to provide uninterrupted service and record site visits, but not for unauthorized personal information storage.
                            </p>
                        </div>
                    </section>

                    {/* Section 2: Terms of Use */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-neutral-800 pb-6">
                            <div className="p-3 bg-red-600/10 border border-red-600/20 rounded-2xl text-red-600">
                                <FileText size={28} />
                            </div>
                            <h2 className="text-2xl md:text-4xl font-black tracking-tight text-white">2. Terms of Use (Platform)</h2>
                        </div>
                        <ul className="space-y-4 text-neutral-300 leading-relaxed font-light pl-2">
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2.5 flex-shrink-0" />
                                <span><strong>Account Rules:</strong> Users are permitted to operate only one account.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2.5 flex-shrink-0" />
                                <span><strong>Prohibited Activities:</strong> Creating multiple accounts to manipulate rewards, collusion, and exploiting loopholes are strictly prohibited.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2.5 flex-shrink-0" />
                                <span><strong>Penalties:</strong> Violations can result in account termination, forfeiture of earned benefits, or fines.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2.5 flex-shrink-0" />
                                <span><strong>Service Modifications:</strong> Jumbostar reserves the right to modify, suspend, or terminate any aspect of the platform without notice.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2.5 flex-shrink-0" />
                                <span><strong>Jurisdiction:</strong> Operated by Jumbostar Enterprises based in Bangalore, India.</span>
                            </li>
                        </ul>
                    </section>

                    {/* Section 3: Seller & Customer Services */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-neutral-800 pb-6">
                            <div className="p-3 bg-red-600/10 border border-red-600/20 rounded-2xl text-red-600">
                                <Building2 size={28} />
                            </div>
                            <h2 className="text-2xl md:text-4xl font-black tracking-tight text-white">3. Seller and Customer Services</h2>
                        </div>
                        <p className="text-neutral-300 leading-relaxed font-light text-lg">
                            Jumbostar provides a full-stack B2B marketplace covering FMCG products, logistics, warehousing, inventory management, quality control, fintech services, and payment collection. Sellers can utilize platform services to manage product listings, search engine optimization (SEO), and paid campaigns.
                        </p>
                    </section>

                    {/* Contact & Support */}
                    <section className="bg-neutral-900 border border-neutral-800 p-8 md:p-10 rounded-[2.5rem] space-y-6">
                        <h3 className="text-2xl font-black text-white">Questions or Concerns?</h3>
                        <p className="text-neutral-400 text-base leading-relaxed font-light">
                            If you have questions about this policy, privacy practices, or want to opt-out of communications, reach out to us:
                        </p>
                        <div className="flex flex-col md:flex-row gap-4 pt-2">
                            <a
                                href="mailto:jumbostarenterprises@gmail.com"
                                className="inline-flex items-center gap-3 bg-black border border-neutral-800 px-6 py-4 rounded-2xl shadow-lg font-bold text-white hover:border-red-600 hover:text-red-500 transition-all group"
                            >
                                <Mail size={18} className="text-red-600 group-hover:scale-110 transition-transform" />
                                jumbostarenterprises@gmail.com
                            </a>
                            <a
                                href="mailto:support@jumbotail.com"
                                className="inline-flex items-center gap-3 bg-black border border-neutral-800 px-6 py-4 rounded-2xl shadow-lg font-bold text-white hover:border-red-600 hover:text-red-500 transition-all group"
                            >
                                <Mail size={18} className="text-red-600 group-hover:scale-110 transition-transform" />
                                support@jumbotail.com (Account Support)
                            </a>
                        </div>
                    </section>

                </div>
            </main>
        </div>
    );
}