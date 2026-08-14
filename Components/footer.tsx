import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  MapPin,
  Clock,
  ExternalLink,
  Phone,
  Mail
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#0a0a0b] text-slate-400 pt-10 pb-34 md:pb-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">

        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 mb-8">

          {/* Brand */}
          <div className="lg:col-span-5 space-y-4">

            <Link href="/">
              <Image
                src="/logoremovebg.png"
                alt="Jumbostar"
                width={90}
                height={30}
                className="opacity-90"
              />
            </Link>

            <p className="text-sm text-slate-500 max-w-md leading-relaxed">
              Jumbostar provides reliable wholesale and retail infrastructure
              for daily essentials, supporting businesses with quality
              products and efficient supply solutions.
            </p>

            <div className="flex gap-5 text-xs">

              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-red-600" />
                Verified Partner
              </div>

              <div className="flex items-center gap-2">
                <Clock size={14} className="text-red-600" />
                Quick Verification
              </div>

            </div>
          </div>

          {/* Platform */}
          <div className="lg:col-span-2 space-y-3">

            <h4 className="text-white text-xs font-semibold uppercase tracking-wider">
              Platform
            </h4>

            <ul className="space-y-2 text-sm">

              <li>
                <Link href="/Wholesale/categories" className="hover:text-red-500 transition">
                  Categories
                </Link>
              </li>

              <li>
                <Link href="/Wholesale/productgallery" className="hover:text-red-500 transition">
                  Products
                </Link>
              </li>


             

            </ul>
          </div>


          {/* Service */}
          <div className="lg:col-span-2 space-y-3">

            <h4 className="text-white text-xs font-semibold uppercase tracking-wider">
              Service
            </h4>

            <ul className="space-y-2 text-sm">

              <li>
                <a
                  href="/Wholesale/termspolicy"
               
                  className="hover:text-red-500 transition"
                >
                  Terms & Policy
                </a>
              </li>

            </ul>
          </div>


          {/* Address */}
          {/* Address */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider">
              Address
            </h4>

            <div className="flex gap-3 text-sm text-slate-500">
              <MapPin size={16} className="text-red-600 mt-1" />
              <span>
                <b>JUMBOSTAR ENTERPRISES</b><br />
               Survry no 49 Behind RE Rogers<br />
                 Tumkur Road Madanayakanahalli<br />
                Bangalore 562162
              </span>
            </div>

            <div className="flex flex-col gap-3 text-sm text-slate-500">
              <div className="flex gap-3">
                <Phone size={16} className="text-red-600" />
                <div className="flex flex-col gap-1">
                  <span>Ramesh – 8073082709</span> 
                   <span>Gangadhara N E – 7760711943</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 text-sm text-slate-500">
              <Mail size={16} className="text-red-600" />
              <span>
                jumbostarenterprises@gmail.com
              </span>
            </div>
          </div>

        </div>


        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-5 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-3">

          <div>
            ©️ 2024 Jumbostar Wholesale. All rights reserved.
          </div>

          <a
            href="https://rakvih.in"
            target="_blank"
            className="flex items-center gap-2 hover:text-white transition"
          >
            Developed by
            <span className="font-semibold">Rakvih</span>
            <ExternalLink size={12} />
          </a>

        </div>

      </div>

    </footer>
  );
}