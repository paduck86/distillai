import { supabase } from "./supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

async function getHeaders(isFormData = false) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers: Record<string, string> = {
        ...(token && { Authorization: `Bearer ${token}` }),
    };

    if (!isFormData) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}

export const api = {
    async get<T>(url: string): Promise<{ data: T }> {
        const headers = await getHeaders();
        const response = await fetch(`${API_BASE_URL}${url}`, { headers });
        if (!response.ok) throw new Error(`GET ${url} failed`);
        return response.json();
    },

    async post<T>(url: string, body?: any): Promise<{ data: T }> {
        const headers = await getHeaders();
        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(`POST ${url} failed`);
        return response.json();
    },

    async postFormData<T>(url: string, formData: FormData): Promise<{ data: T }> {
        const headers = await getHeaders(true);
        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: "POST",
            headers,
            body: formData,
        });
        if (!response.ok) throw new Error(`POST ${url} failed`);
        return response.json();
    },

    async put<T>(url: string, body?: any): Promise<{ data: T }> {
        const headers = await getHeaders();
        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(`PUT ${url} failed`);
        return response.json();
    },

    async delete(url: string): Promise<void> {
        const headers = await getHeaders();
        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: "DELETE",
            headers,
        });
        if (!response.ok) throw new Error(`DELETE ${url} failed`);
    },

    // Specialized methods
    pages: {
        getTree: () => api.get<any[]>("/pages/tree"),
        get: (id: string) => api.get<any>(`/pages/${id}`),
        create: (data: any) => api.post<any>("/pages", data),
        update: (id: string, data: any) => api.put<any>(`/pages/${id}`, data),
        move: (id: string, move: any) => api.put<any>(`/pages/${id}/move`, move),
        toggleCollapse: (id: string) => api.put<any>(`/pages/${id}/collapse`),
        reorder: (pageIds: string[], parentId?: string | null) =>
            api.post<any>("/pages/reorder", { pageIds, parentId }),
        summarize: (id: string, language: string = "korean") =>
            api.post<any>(`/pages/${id}/summarize`, { language }),
        // Trash
        getTrash: () => api.get<any[]>("/pages/trash"),
        moveToTrash: (id: string) => api.put<any>(`/pages/${id}/trash`),
        restore: (id: string) => api.put<any>(`/pages/${id}/restore`),
        deletePermanently: (id: string) => api.delete(`/pages/${id}/permanent`),
        emptyTrash: () => api.delete("/pages/trash/empty"),
    },
    blocks: {
        get: (pageId: string) => api.get<any[]>(`/blocks/${pageId}`),
        updateBatch: (pageId: string, blocks: any[]) =>
            api.put<any[]>(`/blocks/batch/${pageId}`, { blocks }),
    },
    // AI Summarization APIs
    youtube: {
        summarize: (url: string, language: string = "korean") =>
            api.post<{ summary: string; title?: string }>("/youtube/summarize", { url, language }),
    },
    audio: {
        transcribe: (audioBlob: Blob, language: string = "korean") => {
            const formData = new FormData();
            formData.append("audio", audioBlob, "recording.webm");
            formData.append("language", language);
            return api.postFormData<{ transcript: string }>("/audio/transcribe", formData);
        },
        summarize: (audioBlob: Blob, language: string = "korean") => {
            const formData = new FormData();
            formData.append("audio", audioBlob, "recording.webm");
            formData.append("language", language);
            return api.postFormData<{ summary: string; transcript: string }>("/audio/summarize", formData);
        },
    },
    pdf: {
        summarize: (file: File, language: string = "korean") => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("language", language);
            return api.postFormData<{ summary: string }>("/pdf/summarize", formData);
        },
    },
    image: {
        analyze: (file: File, prompt?: string) => {
            const formData = new FormData();
            formData.append("image", file);
            if (prompt) formData.append("prompt", prompt);
            return api.postFormData<{ analysis: string }>("/image/analyze", formData);
        },
    },
    url: {
        summarize: (url: string, language: string = "korean") =>
            api.post<{ summary: string; title?: string }>("/url/summarize", { url, language }),
    },
};
