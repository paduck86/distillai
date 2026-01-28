/**
 * Notion-style Block Types for Distillai
 *
 * 노션 스타일의 블록 기반 에디터를 위한 타입 정의
 * Distillai 고유의 타임스탬프 및 AI 요약 블록 포함
 */

// Distillai-specific blocks
// Force Rebuild Triggered
import { SourceType } from '../services/api.service';

// ============================================
// Block Types
// ============================================

export type BlockType =
  // Basic blocks
  | 'text'        // 일반 텍스트
  | 'heading1'    // H1
  | 'heading2'    // H2
  | 'heading3'    // H3
  | 'bullet'      // 불릿 리스트
  | 'numbered'    // 번호 리스트
  | 'todo'        // 체크박스
  | 'toggle'      // 토글 (접기/펼치기)
  | 'quote'       // 인용
  | 'callout'     // 콜아웃 (💡, ⚠️ 등)
  | 'divider'     // 구분선
  | 'code'        // 코드 블록
  // Distillai-specific blocks
  | 'timestamp'   // 🎯 타임스탬프 (오디오 연동)
  | 'ai_summary'  // 🎯 AI 요약 블록
  | 'embed'       // 임베드 (YouTube, 링크)
  // Media blocks
  | 'image'       // 🖼️ 이미지 블록
  | 'video'       // 🎥 동영상 블록
  | 'audio'       // 🔊 오디오 블록
  | 'file'        // 📁 파일 블록
  | 'bookmark'    // 🔖 웹 북마크
  | 'page'        // 📄 하위 페이지
  | 'table';      // 📊 테이블 블록

// ============================================
// Block Properties
// ============================================

export interface BlockProperties {
  // Heading
  level?: 1 | 2 | 3;

  // Todo
  checked?: boolean;

  // Toggle
  collapsed?: boolean;

  // Callout
  icon?: string;
  color?: BlockColor;

  // Code
  language?: string;

  // Timestamp (Distillai-specific)
  timestamp?: string;  // "00:15:30" 형식

  // AI Generated marker
  aiGenerated?: boolean;

  // Embed
  embedUrl?: string;
  embedType?: 'youtube' | 'image' | 'link';

  // Text formatting (inline)
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  link?: string;
  highlight?: string;  // Highlight color

  // Image properties
  imageUrl?: string;
  imageCaption?: string;
  imageWidth?: 'small' | 'medium' | 'large' | 'full';
  imageAlign?: 'left' | 'center' | 'right';

  // Table properties
  tableData?: string[][];  // 2D array of cell contents
  tableHeaders?: boolean;  // First row as header
  tableColumnWidths?: number[];  // Column widths in pixels
}

// ============================================
// Block Colors (Notion-style)
// ============================================

export type BlockColor =
  | 'default'
  | 'gray'
  | 'brown'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red';

export const BLOCK_COLORS: Record<BlockColor, { bg: string; text: string }> = {
  default: { bg: 'transparent', text: 'inherit' },
  gray: { bg: 'rgba(128, 128, 128, 0.1)', text: 'rgb(120, 119, 116)' },
  brown: { bg: 'rgba(159, 107, 83, 0.1)', text: 'rgb(159, 107, 83)' },
  orange: { bg: 'rgba(255, 163, 68, 0.1)', text: 'rgb(217, 115, 13)' },
  yellow: { bg: 'rgba(255, 220, 73, 0.1)', text: 'rgb(203, 145, 47)' },
  green: { bg: 'rgba(77, 171, 154, 0.1)', text: 'rgb(68, 131, 97)' },
  blue: { bg: 'rgba(82, 156, 202, 0.1)', text: 'rgb(51, 126, 169)' },
  purple: { bg: 'rgba(154, 109, 215, 0.1)', text: 'rgb(144, 101, 176)' },
  pink: { bg: 'rgba(226, 85, 161, 0.1)', text: 'rgb(193, 76, 138)' },
  red: { bg: 'rgba(255, 115, 105, 0.1)', text: 'rgb(212, 76, 71)' },
};

// ============================================
// Block Interface
// ============================================

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  properties?: BlockProperties;
  children?: Block[];

  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// Page Interface (Container for blocks)
// ============================================

export interface Page {
  id: string;
  icon?: string;        // 페이지 아이콘 (이모지 또는 URL)
  cover?: string;       // 커버 이미지 URL
  title: string;
  blocks: Block[];
  metadata: PageMetadata;
}

export interface PageMetadata {
  sourceType: SourceType;
  sourceUrl?: string;
  audioUrl?: string;
  durationSeconds?: number;
  createdAt: string;
  updatedAt: string;

  // X (Twitter) fields
  xAuthorHandle?: string;
  xAuthorName?: string;

  // Category
  categoryId?: string;
  categoryConfirmed?: boolean;
}

// ============================================
// Block Operations
// ============================================

export interface BlockCreateInput {
  type: BlockType;
  content: string;
  properties?: BlockProperties;
  parentId?: string;  // For nested blocks
  position?: number;
}

export interface BlockUpdateInput {
  content?: string;
  properties?: BlockProperties;
  position?: number;
}

// ============================================
// Slash Command Types
// ============================================

export type SlashCommandCategory = 'basic' | 'ai' | 'media' | 'advanced';

export interface SlashCommand {
  id: string;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
  category: SlashCommandCategory;
  shortcut?: string;
  blockType?: BlockType;
  aiAction?: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  // --- AI Section (Top) ---
  { id: 'ask', label: 'AI에게 질문', labelEn: 'Ask AI', description: 'Agent D가 답변해드립니다', descriptionEn: 'Ask Agent D', icon: 'pi-sparkles', category: 'ai', aiAction: 'ask' },
  { id: 'summarize', label: '요약', labelEn: 'Summarize', description: '이 페이지 내용 요약', descriptionEn: 'Summarize page content', icon: 'pi-bolt', category: 'ai', aiAction: 'summarize' },
  { id: 'translate', label: '번역', labelEn: 'Translate', description: '다른 언어로 번역', descriptionEn: 'Translate content', icon: 'pi-language', category: 'ai', aiAction: 'translate' },
  { id: 'explain', label: '설명', labelEn: 'Explain', description: '쉽게 설명해달라고 요청', descriptionEn: 'Ask for explanation', icon: 'pi-question-circle', category: 'ai', aiAction: 'explain' },

  // --- Basic Blocks ---
  { id: 'text', label: '텍스트', labelEn: 'Text', description: '일반 텍스트', descriptionEn: 'Plain text', icon: 'pi-align-left', category: 'basic', blockType: 'text' },
  { id: 'page', label: '페이지', labelEn: 'Page', description: '하위 페이지 생성', descriptionEn: 'Embed a sub-page', icon: 'pi-file', category: 'basic', blockType: 'page' },
  { id: 'h1', label: '제목 1', labelEn: 'Heading 1', description: '대제목', descriptionEn: 'Big section heading', icon: 'pi-hashtag', category: 'basic', blockType: 'heading1', shortcut: '/h1' },
  { id: 'h2', label: '제목 2', labelEn: 'Heading 2', description: '중제목', descriptionEn: 'Medium section heading', icon: 'pi-hashtag', category: 'basic', blockType: 'heading2', shortcut: '/h2' },
  { id: 'h3', label: '제목 3', labelEn: 'Heading 3', description: '소제목', descriptionEn: 'Small section heading', icon: 'pi-hashtag', category: 'basic', blockType: 'heading3', shortcut: '/h3' },
  { id: 'table', label: '표', labelEn: 'Table', description: '간단한 표', descriptionEn: 'Simple table', icon: 'pi-table', category: 'basic', blockType: 'table' },
  { id: 'bullet', label: '글머리 기호 목록', labelEn: 'Bulleted list', description: '간단한 목록', descriptionEn: 'Simple bulleted list', icon: 'pi-list', category: 'basic', blockType: 'bullet' },
  { id: 'number', label: '번호 매기기 목록', labelEn: 'Numbered list', description: '순서가 있는 목록', descriptionEn: 'Numbered list', icon: 'pi-sort-numeric-up', category: 'basic', blockType: 'numbered' },
  { id: 'toggle', label: '토글 목록', labelEn: 'Toggle list', description: '접고 펼칠 수 있는 목록', descriptionEn: 'Toggles inside blocks', icon: 'pi-caret-right', category: 'basic', blockType: 'toggle' },
  { id: 'quote', label: '인용', labelEn: 'Quote', description: '인용구 캡처', descriptionEn: 'Capture a quote', icon: 'pi-bookmark', category: 'basic', blockType: 'quote' },
  { id: 'divider', label: '구분선', labelEn: 'Divider', description: '블록 시각적 분리', descriptionEn: 'Visually divide blocks', icon: 'pi-minus', category: 'basic', blockType: 'divider' },
  { id: 'callout', label: '콜아웃', labelEn: 'Callout', description: '글 강조', descriptionEn: 'Make writing stand out', icon: 'pi-info-circle', category: 'basic', blockType: 'callout' },

  // --- Media ---
  { id: 'image', label: '이미지', labelEn: 'Image', description: '이미지 업로드 또는 임베드', descriptionEn: 'Upload or embed image', icon: 'pi-image', category: 'media', blockType: 'image' },
  { id: 'video', label: '동영상', labelEn: 'Video', description: '동영상 업로드 또는 임베드', descriptionEn: 'Upload or embed video', icon: 'pi-video', category: 'media', blockType: 'video' },
  { id: 'audio', label: '오디오', labelEn: 'Audio', description: '오디오 업로드 또는 임베드', descriptionEn: 'Upload or embed audio', icon: 'pi-volume-up', category: 'media', blockType: 'audio' },
  { id: 'code', label: '코드', labelEn: 'Code', description: '코드 스니펫 캡처', descriptionEn: 'Capture a code snippet', icon: 'pi-code', category: 'media', blockType: 'code' },
  { id: 'file', label: '파일', labelEn: 'File', description: '파일 업로드 또는 임베드', descriptionEn: 'Upload or embed file', icon: 'pi-file', category: 'media', blockType: 'file' },
  { id: 'bookmark', label: '웹 북마크', labelEn: 'Web bookmark', description: '링크 미리보기 저장', descriptionEn: 'Save a bookmark to a website', icon: 'pi-bookmark', category: 'media', blockType: 'bookmark' },

  // --- Database (Placeholder for visual completeness) ---
  { id: 'database_inline', label: '데이터베이스 (인라인)', labelEn: 'Database - Inline', description: '페이지 내 데이터베이스', descriptionEn: 'Database in page', icon: 'pi-server', category: 'advanced', blockType: 'table' },
  { id: 'database_full', label: '데이터베이스 (전체 페이지)', labelEn: 'Database - Full page', description: '전체 페이지 데이터베이스', descriptionEn: 'Full page database', icon: 'pi-calendar', category: 'advanced', blockType: 'table' },
];

// ============================================
// Hover Actions
// ============================================

export interface HoverAction {
  id: string;
  icon: string;
  label: string;
  labelEn: string;
  shortcut?: string;
  danger?: boolean;
}

export const HOVER_ACTIONS: HoverAction[] = [
  { id: 'delete', icon: 'pi-trash', label: '삭제', labelEn: 'Delete', shortcut: 'Del', danger: true },
  { id: 'duplicate', icon: 'pi-copy', label: '복제', labelEn: 'Duplicate', shortcut: 'Ctrl+D' },
  { id: 'turn-into', icon: 'pi-sync', label: '변환', labelEn: 'Turn into' },
  { id: 'comment', icon: 'pi-comment', label: '댓글', labelEn: 'Comment' },
  { id: 'color', icon: 'pi-palette', label: '색상', labelEn: 'Color' },
  // AI Actions (Distillai-specific)
  { id: 'ask-ai', icon: 'pi-sparkles', label: 'Agent D에게 질문', labelEn: 'Ask Agent D' },
  { id: 'summarize-block', icon: 'pi-compress', label: '이 블록 요약', labelEn: 'Summarize this block' },
];

// ============================================
// Callout Icons
// ============================================

export const CALLOUT_ICONS = [
  '💡', // Idea
  '⚠️', // Warning
  '📌', // Pin
  '✅', // Check
  '❌', // Cross
  '🔥', // Fire
  '💭', // Thought
  '📝', // Note
  '🎯', // Target
  '🚀', // Rocket
  '💪', // Strength
  '🤔', // Thinking
  '📚', // Books
  '🔗', // Link
  '⭐', // Star
];

// ============================================
// Markdown to Blocks Conversion
// ============================================

export function markdownToBlocks(markdown: string): Block[] {
  if (!markdown) return [];

  const blocks: Block[] = [];
  const lines = markdown.split('\n');
  let currentIndex = 0;

  while (currentIndex < lines.length) {
    const line = lines[currentIndex];

    // Skip empty lines
    if (!line.trim()) {
      currentIndex++;
      continue;
    }

    // Heading 1
    if (line.startsWith('# ')) {
      blocks.push(createBlock('heading1', line.slice(2).trim()));
    }
    // Heading 2
    else if (line.startsWith('## ')) {
      blocks.push(createBlock('heading2', line.slice(3).trim()));
    }
    // Heading 3
    else if (line.startsWith('### ')) {
      blocks.push(createBlock('heading3', line.slice(4).trim()));
    }
    // Bullet list
    else if (line.match(/^[-*]\s/)) {
      blocks.push(createBlock('bullet', line.slice(2).trim()));
    }
    // Numbered list
    else if (line.match(/^\d+\.\s/)) {
      const content = line.replace(/^\d+\.\s/, '').trim();
      blocks.push(createBlock('numbered', content));
    }
    // Todo (checkbox)
    else if (line.match(/^-\s*\[[ x]\]/i)) {
      const checked = line.match(/^-\s*\[x\]/i) !== null;
      const content = line.replace(/^-\s*\[[ x]\]\s*/i, '').trim();
      blocks.push(createBlock('todo', content, { checked }));
    }
    // Quote
    else if (line.startsWith('> ')) {
      blocks.push(createBlock('quote', line.slice(2).trim()));
    }
    // Code block (fenced)
    else if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      currentIndex++;
      while (currentIndex < lines.length && !lines[currentIndex].startsWith('```')) {
        codeLines.push(lines[currentIndex]);
        currentIndex++;
      }
      blocks.push(createBlock('code', codeLines.join('\n'), { language }));
    }
    // Divider
    else if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
      blocks.push(createBlock('divider', ''));
    }
    // Timestamp detection [00:15:30]
    else if (/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/.test(line)) {
      const match = line.match(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/);
      if (match) {
        const content = line.replace(match[0], '').trim();
        blocks.push(createBlock('timestamp', content, { timestamp: match[1] }));
      }
    }
    // Callout (> 💡 or > ⚠️ style)
    else if (line.match(/^>\s*[💡⚠️📌✅❌🔥💭📝🎯🚀]/)) {
      const iconMatch = line.match(/^>\s*([💡⚠️📌✅❌🔥💭📝🎯🚀])/);
      const icon = iconMatch ? iconMatch[1] : '💡';
      const content = line.replace(/^>\s*[💡⚠️📌✅❌🔥💭📝🎯🚀]\s*/, '').trim();
      blocks.push(createBlock('callout', content, { icon }));
    }
    // Plain text
    else {
      blocks.push(createBlock('text', line.trim()));
    }

    currentIndex++;
  }

  return blocks;
}

function createBlock(type: BlockType, content: string, properties?: BlockProperties): Block {
  return {
    id: generateBlockId(),
    type,
    content,
    properties,
  };
}

export function generateBlockId(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments or testing
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================
// Blocks to Markdown Conversion
// ============================================

export function blocksToMarkdown(blocks: Block[]): string {
  return blocks.map(block => blockToMarkdown(block)).join('\n\n');
}

function blockToMarkdown(block: Block): string {
  switch (block.type) {
    case 'heading1':
      return `# ${block.content}`;
    case 'heading2':
      return `## ${block.content}`;
    case 'heading3':
      return `### ${block.content}`;
    case 'bullet':
      return `- ${block.content}`;
    case 'numbered':
      return `1. ${block.content}`;
    case 'todo':
      const checked = block.properties?.checked ? 'x' : ' ';
      return `- [${checked}] ${block.content}`;
    case 'quote':
      return `> ${block.content}`;
    case 'callout':
      const icon = block.properties?.icon || '💡';
      return `> ${icon} ${block.content}`;
    case 'code':
      const lang = block.properties?.language || '';
      return `\`\`\`${lang}\n${block.content}\n\`\`\``;
    case 'divider':
      return '---';
    case 'timestamp':
      const ts = block.properties?.timestamp || '00:00:00';
      return `[${ts}] ${block.content}`;
    case 'ai_summary':
      return `> ✨ **AI Summary**\n> ${block.content}`;
    case 'embed':
      return block.properties?.embedUrl || block.content;
    case 'toggle':
      const collapsed = block.properties?.collapsed ? '▶' : '▼';
      return `${collapsed} ${block.content}`;
    case 'image':
      const imgUrl = block.properties?.imageUrl || '';
      const caption = block.properties?.imageCaption || '';
      return caption ? `![${caption}](${imgUrl})` : `![](${imgUrl})`;
    case 'table':
      return tableToMarkdown(block.properties?.tableData || [['']]);
    default:
      return block.content;
  }
}

/**
 * Convert table data to markdown format
 */
function tableToMarkdown(data: string[][]): string {
  if (data.length === 0) return '';

  const lines: string[] = [];

  // Header row
  if (data.length > 0) {
    lines.push('| ' + data[0].join(' | ') + ' |');
    lines.push('| ' + data[0].map(() => '---').join(' | ') + ' |');
  }

  // Body rows
  for (let i = 1; i < data.length; i++) {
    lines.push('| ' + data[i].join(' | ') + ' |');
  }

  return lines.join('\n');
}
