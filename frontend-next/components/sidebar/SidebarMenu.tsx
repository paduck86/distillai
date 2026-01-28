"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
    Star,
    Link as LinkIcon,
    Copy,
    PenLine,
    Trash,
    MoreHorizontal,
    Check,
    ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarMenuProps {
    pageId: string;
    isFavorite?: boolean;
    onRename?: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
    onToggleFavorite?: () => void;
    onOpenChange?: (open: boolean) => void;
}

export function SidebarMenu({
    pageId,
    isFavorite,
    onRename,
    onDelete,
    onDuplicate,
    onToggleFavorite,
    onOpenChange
}: SidebarMenuProps) {
    // We can add state here if needed for specific internal actions
    // but for now we'll mostly rely on props or dummy actions as requested for the UI component.

    return (
        <DropdownMenu.Root onOpenChange={onOpenChange}>
            <DropdownMenu.Trigger asChild>
                <button
                    className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 data-[state=open]:opacity-100 data-[state=open]:bg-neutral-200/50 hover:bg-neutral-200/50"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Page actions"
                >
                    <MoreHorizontal className="w-4 h-4 text-neutral-500" />
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className={cn(
                        "z-50 min-w-[220px] bg-white rounded-lg",
                        "border border-neutral-200/60",
                        "shadow-[0px_4px_12px_-4px_rgba(0,0,0,0.08),0px_2px_4px_-1px_rgba(0,0,0,0.04)]", // Notion-like delicate shadow
                        "p-1.5",
                        "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                        "duration-100 ease-out"
                    )}
                    align="start"
                    side="right"
                    sideOffset={4}
                    alignOffset={-4}
                    onClick={(e) => e.stopPropagation()}
                >
                    <MenuItem
                        icon={Star}
                        fillIcon={isFavorite}
                        label={isFavorite ? "즐겨찾기 해제" : "즐겨찾기에 추가"}
                        onClick={onToggleFavorite}
                    />

                    <div className="h-px bg-neutral-100 my-1 mx-1" />

                    <MenuItem
                        icon={LinkIcon}
                        label="링크 복사"
                        onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/page/${pageId}`);
                        }}
                    />
                    <MenuItem
                        icon={Copy}
                        label="복제"
                        onClick={onDuplicate}
                    />
                    <MenuItem
                        icon={PenLine}
                        label="이름 변경"
                        onClick={onRename}
                    />

                    <div className="h-px bg-neutral-100 my-1 mx-1" />

                    <MenuItem
                        icon={Trash}
                        label="휴지통으로 이동"
                        onClick={onDelete}
                    />
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}

interface MenuItemProps {
    icon: React.ElementType;
    label: string;
    shortcut?: string;
    variant?: "default" | "destructive";
    fillIcon?: boolean;
    onClick?: () => void;
}

function MenuItem({
    icon: Icon,
    label,
    shortcut,
    variant = "default",
    fillIcon,
    onClick
}: MenuItemProps) {
    return (
        <DropdownMenu.Item
            className={cn(
                "relative flex items-center px-2.5 py-1.5 rounded-[4px] text-sm select-none outline-none cursor-default",
                "transition-colors duration-75",
                variant === "destructive"
                    ? "text-neutral-700 focus:bg-neutral-100 focus:text-red-600 data-[highlighted]:text-red-600 group/item"
                    : "text-neutral-700 focus:bg-neutral-100",
                "group"
            )}
            onSelect={(e) => {
                if (onClick) {
                    onClick();
                }
            }}
        >
            <div className={cn(
                "mr-2.5 text-neutral-500",
                variant === "destructive" && "group-focus:text-red-500 group-data-[highlighted]:text-red-500",
                fillIcon && "text-yellow-500"
            )}>
                <Icon
                    className={cn("w-4 h-4", fillIcon && "fill-current")}
                    strokeWidth={1.5}
                />
            </div>

            <span className="flex-1 font-normal leading-none tracking-tight">
                {label}
            </span>

            {shortcut && (
                <span className="ml-2 text-xs text-neutral-400 font-normal tracking-wide">
                    {shortcut}
                </span>
            )}
        </DropdownMenu.Item>
    );
}
