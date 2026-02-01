"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// 허용된 이메일 목록
const ALLOWED_EMAILS = [
    "paduck86@gmail.com",
    "xunaoo@gmail.com"
];

export default function AuthCallbackPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            const { data, error } = await supabase.auth.getSession();

            if (error) {
                console.error("Auth callback error:", error);
                router.push("/login");
                return;
            }

            // 이메일 화이트리스트 체크
            const userEmail = data.session?.user?.email;
            if (!userEmail || !ALLOWED_EMAILS.includes(userEmail.toLowerCase())) {
                console.error("Unauthorized email:", userEmail);
                setError("접근이 허용되지 않은 이메일입니다.");
                // 로그아웃 처리
                await supabase.auth.signOut();
                setTimeout(() => {
                    router.push("/login");
                }, 2000);
                return;
            }

            router.push("/dashboard");
        };

        handleCallback();
    }, [router]);

    return (
        <div
            className="min-h-screen flex items-center justify-center"
            style={{ backgroundColor: "var(--background)" }}
        >
            <div className="text-center">
                {error ? (
                    <>
                        <div
                            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                            style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                style={{ color: "#ef4444" }}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <p style={{ color: "#ef4444" }}>{error}</p>
                        <p
                            className="text-sm mt-2"
                            style={{ color: "var(--foreground-tertiary)" }}
                        >
                            로그인 페이지로 이동합니다...
                        </p>
                    </>
                ) : (
                    <>
                        <div
                            className="animate-spin w-8 h-8 border-2 rounded-full mx-auto mb-4"
                            style={{
                                borderColor: "var(--border)",
                                borderTopColor: "var(--color-primary)"
                            }}
                        />
                        <p style={{ color: "var(--foreground-secondary)" }}>로그인 중...</p>
                    </>
                )}
            </div>
        </div>
    );
}
