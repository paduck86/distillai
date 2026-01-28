"use client";

import { useParams } from "next/navigation";
import EditorWrapper from "@/components/editor/EditorWrapper";

export default function PageView() {
    const params = useParams();
    const id = params.id as string;

    if (!id) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-zinc-500">페이지를 찾을 수 없습니다</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <EditorWrapper pageId={id} />
        </div>
    );
}
