"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { Link2, Loader2, ExternalLink, AlertCircle, Globe } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";

interface BookmarkData {
    url: string;
    title: string | null;
    description: string | null;
    image: string | null;
    favicon: string | null;
    siteName: string | null;
    domain: string;
}

// Bookmark Block Component
export const BookmarkBlock = createReactBlockSpec(
    {
        type: "bookmark" as const,
        propSchema: {
            url: { default: "" },
            title: { default: "" },
            description: { default: "" },
            image: { default: "" },
            favicon: { default: "" },
            siteName: { default: "" },
            domain: { default: "" },
        },
        content: "none",
    },
    {
        render: (props) => {
            const [inputUrl, setInputUrl] = useState("");
            const [isLoading, setIsLoading] = useState(false);
            const [error, setError] = useState("");
            const [imageError, setImageError] = useState(false);
            const [faviconError, setFaviconError] = useState(false);

            const hasData = !!props.block.props.url;

            const fetchPreview = useCallback(async (url: string) => {
                if (!url) return;

                // Validate URL
                try {
                    new URL(url);
                } catch {
                    setError("Invalid URL format");
                    return;
                }

                setIsLoading(true);
                setError("");
                setImageError(false);
                setFaviconError(false);

                try {
                    const { data } = await api.bookmark.preview(url);

                    // Update block props with fetched data
                    props.editor.updateBlock(props.block, {
                        props: {
                            url: data.url,
                            title: data.title || "",
                            description: data.description || "",
                            image: data.image || "",
                            favicon: data.favicon || "",
                            siteName: data.siteName || "",
                            domain: data.domain,
                        },
                    });
                } catch (err) {
                    console.error("Failed to fetch bookmark preview:", err);
                    setError("Failed to load preview. Please check the URL.");
                } finally {
                    setIsLoading(false);
                }
            }, [props.editor, props.block]);

            const handleSubmit = useCallback(() => {
                fetchPreview(inputUrl);
            }, [fetchPreview, inputUrl]);

            const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
                if (e.key === 'Enter' && !isLoading && inputUrl) {
                    e.preventDefault();
                    handleSubmit();
                }
            }, [handleSubmit, isLoading, inputUrl]);

            const handleRefresh = useCallback(() => {
                if (props.block.props.url) {
                    fetchPreview(props.block.props.url);
                }
            }, [fetchPreview, props.block.props.url]);

            const handleOpenLink = useCallback(() => {
                if (props.block.props.url) {
                    window.open(props.block.props.url, '_blank', 'noopener,noreferrer');
                }
            }, [props.block.props.url]);

            // If no URL is set, show the input form
            if (!hasData) {
                return (
                    <div
                        className="my-3 rounded-lg overflow-hidden"
                        style={{
                            backgroundColor: "var(--background-secondary)",
                            border: "1px solid var(--border)"
                        }}
                    >
                        <div className="p-4 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--foreground-secondary)" }}>
                                <Link2 size={16} />
                                Add a web bookmark
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="url"
                                    value={inputUrl}
                                    onChange={(e) => setInputUrl(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Paste URL here... (e.g., https://example.com)"
                                    className="flex-1 rounded-md px-3 py-2 text-sm outline-none"
                                    style={{
                                        backgroundColor: "var(--input-background)",
                                        border: "1px solid var(--input-border)",
                                        color: "var(--foreground)"
                                    }}
                                    disabled={isLoading}
                                    autoFocus
                                />
                                <button
                                    onClick={handleSubmit}
                                    disabled={!inputUrl || isLoading}
                                    className="px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    style={{
                                        backgroundColor: "var(--color-primary)",
                                        color: "white"
                                    }}
                                >
                                    {isLoading ? (
                                        <Loader2 className="animate-spin" size={16} />
                                    ) : (
                                        "Embed"
                                    )}
                                </button>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-error)" }}>
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>
                );
            }

            // Render the bookmark card
            const { url, title, description, image, favicon, siteName, domain } = props.block.props;

            return (
                <div
                    className="my-3 rounded-lg overflow-hidden cursor-pointer group transition-all hover:shadow-md"
                    style={{
                        backgroundColor: "var(--background-secondary)",
                        border: "1px solid var(--border)"
                    }}
                    onClick={handleOpenLink}
                >
                    <div className="flex">
                        {/* Content Section */}
                        <div className="flex-1 p-4 min-w-0">
                            {/* Title */}
                            <div
                                className="font-medium text-sm line-clamp-2 mb-1 group-hover:underline"
                                style={{ color: "var(--foreground)" }}
                            >
                                {title || url}
                            </div>

                            {/* Description */}
                            {description && (
                                <div
                                    className="text-xs line-clamp-2 mb-2"
                                    style={{ color: "var(--foreground-secondary)" }}
                                >
                                    {description}
                                </div>
                            )}

                            {/* Footer: favicon + domain */}
                            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--foreground-secondary)" }}>
                                {favicon && !faviconError ? (
                                    <img
                                        src={favicon}
                                        alt=""
                                        className="w-4 h-4 rounded-sm"
                                        onError={() => setFaviconError(true)}
                                    />
                                ) : (
                                    <Globe size={14} />
                                )}
                                <span className="truncate">
                                    {siteName || domain}
                                </span>
                                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </div>
                        </div>

                        {/* Image Section */}
                        {image && !imageError && (
                            <div
                                className="w-[200px] h-[108px] flex-shrink-0 bg-cover bg-center"
                                style={{
                                    backgroundImage: `url(${image})`,
                                    borderLeft: "1px solid var(--border)"
                                }}
                            >
                                <img
                                    src={image}
                                    alt=""
                                    className="sr-only"
                                    onError={() => setImageError(true)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Loading overlay for refresh */}
                    {isLoading && (
                        <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ backgroundColor: "rgba(var(--background-rgb), 0.8)" }}
                        >
                            <Loader2 className="animate-spin" size={24} style={{ color: "var(--color-primary)" }} />
                        </div>
                    )}
                </div>
            );
        },
    }
);

export default BookmarkBlock;
