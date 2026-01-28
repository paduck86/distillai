"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function RootPage() {
    const router = useRouter();
    const { user, loading } = useAuthStore();

    useEffect(() => {
        if (!loading) {
            if (user) {
                router.push("/dashboard");
            } else {
                router.push("/login");
            }
        }
    }, [user, loading, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
        </div>
    );
}
