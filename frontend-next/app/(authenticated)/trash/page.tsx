"use client";

import { useEffect, useState } from "react";
import { Trash2, RotateCcw, X, Search, AlertCircle } from "lucide-react";
import { usePageStore } from "@/store/usePageStore";
import { toast } from "sonner";

export default function TrashPage() {
    const {
        trashPages,
        loadTrash,
        restorePage,
        deletePermanently,
        emptyTrash
    } = usePageStore();

    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        loadTrash();
    }, [loadTrash]);

    const filteredPages = trashPages.filter(page =>
        (page.title || "Untitled").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleRestore = async (id: string, title?: string) => {
        try {
            await restorePage(id);
            toast.success(`'${title || "페이지"}' 복원됨`);
        } catch (error) {
            toast.error("복원 실패");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("영구 삭제하시겠습니까? 복구할 수 없습니다.")) {
            try {
                await deletePermanently(id);
                toast.success("영구 삭제됨");
            } catch (error) {
                toast.error("삭제 실패");
            }
        }
    };

    const handleEmptyTrash = async () => {
        if (confirm("휴지통을 비우시겠습니까? 모든 항목이 영구 삭제됩니다.")) {
            try {
                await emptyTrash();
                toast.success("휴지통 비우기 완료");
            } catch (error) {
                toast.error("휴지통 비우기 실패");
            }
        }
    };

    return (
        <div
            className="flex-1 flex flex-col h-full overflow-hidden"
            style={{ backgroundColor: "var(--background)" }}
        >
            {/* Extended Header Area */}
            <div className="px-8 pt-8 pb-4 shrink-0">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                            style={{ backgroundColor: "var(--card-background)", border: "1px solid var(--border)" }}
                        >
                            <Trash2 className="w-5 h-5" style={{ color: "var(--foreground-secondary)" }} />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>
                                휴지통
                            </h1>
                            <p className="text-sm" style={{ color: "var(--foreground-secondary)" }}>
                                {trashPages.length}개 항목
                            </p>
                        </div>
                    </div>

                    {trashPages.length > 0 && (
                        <button
                            onClick={handleEmptyTrash}
                            className="px-3 py-1.5 rounded-md text-sm transition-colors border"
                            style={{
                                color: "var(--color-danger)",
                                borderColor: "var(--border)",
                                backgroundColor: "transparent"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "var(--color-danger-bg)";
                                e.currentTarget.style.borderColor = "var(--color-danger)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                                e.currentTarget.style.borderColor = "var(--border)";
                            }}
                        >
                            휴지통 비우기
                        </button>
                    )}
                </div>

                {/* Search Bar */}
                <div className="relative max-w-2xl">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                        style={{ color: "var(--foreground-tertiary)" }}
                    />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="휴지통 검색..."
                        className="w-full pl-9 pr-4 py-2 rounded-md text-sm outline-none border transition-shadow focus:ring-2 focus:ring-blue-500/20"
                        style={{
                            backgroundColor: "var(--card-background)",
                            borderColor: "var(--border)",
                            color: "var(--foreground)",
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-neutral-200/50"
                        >
                            <X className="w-3.5 h-3.5" style={{ color: "var(--foreground-tertiary)" }} />
                        </button>
                    )}
                </div>
            </div>

            {/* List Header */}
            {trashPages.length > 0 && (
                <div className="flex items-center px-8 pb-2 text-xs font-medium border-b shrink-0"
                    style={{ color: "var(--foreground-tertiary)", borderColor: "var(--border)" }}>
                    <div className="flex-1 pl-4">페이지 이름</div>
                    <div className="w-32 text-right pr-12">삭제된 날짜</div>
                </div>
            )}

            {/* Content List */}
            <div className="flex-1 overflow-y-auto px-8 py-2">
                {trashPages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "var(--background-hover)" }}>
                            <Trash2 className="w-8 h-8" style={{ color: "var(--foreground-tertiary)" }} />
                        </div>
                        <p style={{ color: "var(--foreground-secondary)" }}>휴지통이 비어 있습니다</p>
                    </div>
                ) : filteredPages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center mt-8">
                        <p style={{ color: "var(--foreground-secondary)" }}>검색 결과가 없습니다</p>
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {filteredPages.map((page) => (
                            <div
                                key={page.id}
                                className="group flex items-center justify-between px-3 py-2 rounded-md transition-colors border border-transparent hover:border-neutral-200/50"
                                style={{
                                    backgroundColor: "transparent"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--background-hover)"}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                                <div className="flex-1 min-w-0 pr-4 flex items-center gap-2">
                                    <span className="truncate text-sm" style={{ color: "var(--foreground)" }}>
                                        {page.title || "Untitled"}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4">
                                    <span
                                        className="text-xs w-24 text-right"
                                        style={{ color: "var(--foreground-tertiary)" }}
                                    >
                                        {new Date(page.trashedAt).toLocaleDateString()}
                                    </span>

                                    <div className="flex items-center gap-1 w-16 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleRestore(page.id, page.title)}
                                            className="p-1.5 rounded-md transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                            style={{ color: "var(--foreground-secondary)" }}
                                            title="페이지 복원"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(page.id)}
                                            className="p-1.5 rounded-md transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                                            style={{ color: "var(--foreground-tertiary)" }}
                                            onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-danger)"}
                                            onMouseLeave={(e) => e.currentTarget.style.color = "var(--foreground-tertiary)"}
                                            title="영구 삭제"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
