"use client";

import { Loader2 } from "lucide-react";

interface SidebarLoadingItemProps {
    depth: number;
}

export function SidebarLoadingItem({ depth }: SidebarLoadingItemProps) {
    return (
        <div
            className="flex items-center gap-1.5 py-1 mx-1 rounded-md cursor-default"
            style={{
                paddingLeft: `${depth * 12 + 12}px`,
                paddingRight: "8px",
            }}
        >
            {/* Indent guides can be added here if we match PageTreeItem exactly, 
                but for now we just match padding */}

            <div className="w-4 h-4 flex items-center justify-center">
                {/* Placeholder for expand chevron space */}
            </div>

            <div className="shrink-0 text-neutral-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>

            <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden ml-1.5">
                <div className="h-full bg-neutral-300 rounded-full animate-[loading_2s_ease-in-out_infinite] w-1/3" />
            </div>

            <style jsx>{`
                @keyframes loading {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(100%); width: 60%; }
                    100% { transform: translateX(200%); width: 20%; }
                }
            `}</style>
        </div>
    );
}
