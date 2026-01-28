"use client";

import { useEffect, useState } from "react";
import { useThemeStore } from "@/store/useThemeStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { theme, setTheme } = useThemeStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Apply theme on mount
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(theme);
    }, [theme]);

    // Prevent hydration mismatch by rendering children only after mount
    if (!mounted) {
        return (
            <div style={{ visibility: "hidden" }}>
                {children}
            </div>
        );
    }

    return <>{children}</>;
}
