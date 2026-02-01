"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useUIStore } from "@/store/useUIStore";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/sidebar/Sidebar";
import PagePreviewPopover from "@/components/editor/PagePreviewPopover";

// 허용된 이메일 목록
const ALLOWED_EMAILS = [
    "paduck86@gmail.com",
    "xunaoo@gmail.com"
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { user, loading } = useAuthStore();
    const { sidebarOpen, setSidebarOpen, toggleSidebar } = useUIStore();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
        // 이메일 화이트리스트 체크
        if (!loading && user && !ALLOWED_EMAILS.includes(user.email?.toLowerCase() || "")) {
            console.error("Unauthorized email:", user.email);
            supabase.auth.signOut().then(() => {
                router.push("/login");
            });
        }
    }, [user, loading, router]);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setSidebarOpen(false);
    }, [router, setSidebarOpen]);

    // Show loading while checking auth
    if (loading) {
        return (
            <div
                className="flex h-screen items-center justify-center"
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

    // Don't render if not authenticated
    if (!user) {
        return null;
    }

    return (
        <div
            className="flex h-screen overflow-hidden"
            style={{ backgroundColor: "var(--background)" }}
        >
            {/* Mobile Header */}
            <div
                className="fixed top-0 left-0 right-0 z-40 flex items-center h-12 px-4 md:hidden"
                style={{
                    backgroundColor: "var(--background)",
                    borderBottom: "1px solid var(--border)"
                }}
            >
                <button
                    onClick={toggleSidebar}
                    className="p-2 -ml-2 rounded-md transition-colors"
                    style={{ color: "var(--foreground)" }}
                >
                    <Menu className="w-5 h-5" />
                </button>
                <span
                    className="ml-2 font-semibold"
                    style={{ color: "var(--foreground)" }}
                >
                    Distillai
                </span>
            </div>

            {/* Sidebar Overlay (Mobile) */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                className={`
                    fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out
                    md:relative md:translate-x-0
                    ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
                `}
            >
                {/* Mobile close button */}
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="absolute top-3 right-3 p-1 rounded-md md:hidden z-10"
                    style={{ color: "var(--foreground-secondary)" }}
                >
                    <X className="w-5 h-5" />
                </button>
                <Sidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative pt-12 md:pt-0">
                {children}
            </main>

            {/* Page Preview Popover (for page link hover) */}
            <PagePreviewPopover />
        </div>
    );
}
