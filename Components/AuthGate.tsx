"use client";

import { useEffect, useState } from "react";
import AuthModal from "./AuthModal";

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const [checked, setChecked] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const checkUser = () => {
            const savedUser = localStorage.getItem("wholesale_user");
            setUser(savedUser ? JSON.parse(savedUser) : null);
            setChecked(true);
        };

        checkUser();
        window.addEventListener("wholesale_login", checkUser);
        return () => window.removeEventListener("wholesale_login", checkUser);
    }, []);

    // Avoid a flash of content before we've checked localStorage
    if (!checked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="h-8 w-8 border-2 border-slate-200 border-t-red-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <>
                {/* Blurred/blocked placeholder behind the modal so it doesn't look like a blank page */}
                <div className="min-h-screen bg-slate-50 blur-sm pointer-events-none select-none" />
                <AuthModal isOpen={true} onClose={() => {}} mandatory />
            </>
        );
    }

    return <>{children}</>;
}