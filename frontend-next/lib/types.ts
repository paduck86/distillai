export type SourceType =
  | "youtube"
  | "audio"
  | "video"
  | "url"
  | "recording"
  | "pdf"
  | "website"
  | "text"
  | "note"
  | "x_thread"
  | "clipboard";

export interface PageTreeNode {
  id: string;
  parentId: string | null;
  title: string;
  pageIcon: string | null;
  isFolder: boolean;
  collapsed: boolean;
  position: number;
  status: "pending" | "uploading" | "processing" | "crystallized" | "failed";
  sourceType: SourceType;
  audioUrl: string | null;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
  depth: number;
  children: PageTreeNode[];
}

export interface SmartFolder {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  type: "all" | "recent" | "uncategorized" | "processing" | "tag" | "favorites";
}

export interface RecentView {
  id: string;
  title: string;
  viewedAt: string;
}
