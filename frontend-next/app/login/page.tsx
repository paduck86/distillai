"use client";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
    const router = useRouter();
    const { user, loading } = useAuthStore();

    useEffect(() => {
        if (!loading && user) {
            router.push("/dashboard");
        }
    }, [user, loading, router]);

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) {
            console.error("Login error:", error);
        }
    };

    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: "var(--background)" }}
            >
                <div
                    className="animate-spin w-8 h-8 border-2 rounded-full"
                    style={{
                        borderColor: "var(--border)",
                        borderTopColor: "var(--color-primary)"
                    }}
                />
            </div>
        );
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center"
            style={{ backgroundColor: "var(--background)" }}
        >
            <div className="w-full max-w-md p-4 md:p-8">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{ backgroundColor: "var(--color-primary)" }}
                    >
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                        </svg>
                    </div>
                    <h1
                        className="text-2xl font-bold"
                        style={{ color: "var(--foreground)" }}
                    >
                        Distillai
                    </h1>
                    <p
                        className="mt-2"
                        style={{ color: "var(--foreground-secondary)" }}
                    >
                        AI로 지식을 증류하세요
                    </p>
                </div>

                {/* Login Card */}
                <div
                    className="rounded-2xl p-6"
                    style={{
                        backgroundColor: "var(--card-background)",
                        border: "1px solid var(--border)"
                    }}
                >
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 font-medium rounded-xl transition-colors cursor-pointer"
                        style={{
                            backgroundColor: "var(--foreground)",
                            color: "var(--background)"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Google로 계속하기
                    </button>
                </div>

                <p
                    className="text-center text-sm mt-6"
                    style={{ color: "var(--foreground-tertiary)" }}
                >
                    로그인하면 서비스 이용약관에 동의하게 됩니다
                </p>
            </div>
        </div>
    );
}
