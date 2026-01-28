"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const handleCallback = async () => {
            const { error } = await supabase.auth.getSession();

            if (error) {
                console.error("Auth callback error:", error);
                router.push("/login");
                return;
            }

            router.push("/dashboard");
        };

        handleCallback();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950">
            <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-zinc-400">로그인 중...</p>
            </div>
        </div>
    );
}
