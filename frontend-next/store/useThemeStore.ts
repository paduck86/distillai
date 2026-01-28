import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark";

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: "light", // Default to light mode
            setTheme: (theme) => {
                set({ theme });
                if (typeof window !== "undefined") {
                    document.documentElement.classList.remove("light", "dark");
                    document.documentElement.classList.add(theme);
                }
            },
            toggleTheme: () => {
                const newTheme = get().theme === "light" ? "dark" : "light";
                get().setTheme(newTheme);
            },
        }),
        {
            name: "distillai-theme",
            onRehydrateStorage: () => (state) => {
                if (state && typeof window !== "undefined") {
                    document.documentElement.classList.remove("light", "dark");
                    document.documentElement.classList.add(state.theme);
                }
            },
        }
    )
);
