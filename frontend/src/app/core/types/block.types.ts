/**
 * Notion-style Block Types for Distillai
 *
 * 노션 스타일의 블록 기반 에디터를 위한 타입 정의
 * Distillai 고유의 타임스탬프 및 AI 요약 블록 포함
 */

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
  // Basic blocks
  { id: 'text', label: '텍스트', labelEn: 'Text', description: '일반 텍스트 블록', descriptionEn: 'Plain text block', icon: 'pi-align-left', category: 'basic', blockType: 'text' },
  { id: 'h1', label: '제목 1', labelEn: 'Heading 1', description: '큰 제목', descriptionEn: 'Large heading', icon: 'pi-hashtag', category: 'basic', blockType: 'heading1' },
  { id: 'h2', label: '제목 2', labelEn: 'Heading 2', description: '중간 제목', descriptionEn: 'Medium heading', icon: 'pi-hashtag', category: 'basic', blockType: 'heading2' },
  { id: 'h3', label: '제목 3', labelEn: 'Heading 3', description: '작은 제목', descriptionEn: 'Small heading', icon: 'pi-hashtag', category: 'basic', blockType: 'heading3' },
  { id: 'bullet', label: '글머리 기호', labelEn: 'Bullet list', description: '불릿 리스트', descriptionEn: 'Bulleted list item', icon: 'pi-list', category: 'basic', blockType: 'bullet' },
  { id: 'number', label: '번호 매기기', labelEn: 'Numbered list', description: '번호 리스트', descriptionEn: 'Numbered list item', icon: 'pi-sort-numeric-up', category: 'basic', blockType: 'numbered' },
  { id: 'todo', label: '할 일', labelEn: 'To-do', description: '체크박스', descriptionEn: 'Checkbox item', icon: 'pi-check-square', category: 'basic', blockType: 'todo' },
  { id: 'toggle', label: '토글', labelEn: 'Toggle', description: '접기/펼치기', descriptionEn: 'Collapsible block', icon: 'pi-caret-right', category: 'basic', blockType: 'toggle' },
  { id: 'quote', label: '인용', labelEn: 'Quote', description: '인용문', descriptionEn: 'Quote block', icon: 'pi-bookmark', category: 'basic', blockType: 'quote' },
  { id: 'callout', label: '콜아웃', labelEn: 'Callout', description: '강조 박스', descriptionEn: 'Highlighted callout', icon: 'pi-info-circle', category: 'basic', blockType: 'callout' },
  { id: 'divider', label: '구분선', labelEn: 'Divider', description: '수평선', descriptionEn: 'Horizontal divider', icon: 'pi-minus', category: 'basic', blockType: 'divider' },
  { id: 'code', label: '코드', labelEn: 'Code', description: '코드 블록', descriptionEn: 'Code block', icon: 'pi-code', category: 'basic', blockType: 'code' },

  // AI Commands (Distillai-specific)
  { id: 'summarize', label: 'AI 요약', labelEn: 'AI Summary', description: '페이지 전체를 AI로 요약', descriptionEn: 'Summarize the entire page with AI', icon: 'pi-sparkles', category: 'ai', aiAction: 'summarize' },
  { id: 'ask', label: 'Agent D', labelEn: 'Agent D', description: 'AI에게 질문하기', descriptionEn: 'Ask AI a question', icon: 'pi-comments', category: 'ai', aiAction: 'ask' },
  { id: 'quiz', label: '퀴즈 생성', labelEn: 'Generate Quiz', description: '학습 퀴즈 만들기', descriptionEn: 'Create learning quiz', icon: 'pi-question-circle', category: 'ai', aiAction: 'quiz' },
  { id: 'expand', label: '확장 설명', labelEn: 'Expand', description: '선택한 내용 상세 설명', descriptionEn: 'Expand on selected content', icon: 'pi-arrows-alt', category: 'ai', aiAction: 'expand' },
  { id: 'translate', label: '번역', labelEn: 'Translate', description: '다른 언어로 번역', descriptionEn: 'Translate to another language', icon: 'pi-globe', category: 'ai', aiAction: 'translate' },

  // Media
  { id: 'timestamp', label: '타임스탬프', labelEn: 'Timestamp', description: '오디오 위치 마커', descriptionEn: 'Audio position marker', icon: 'pi-clock', category: 'media', blockType: 'timestamp' },
  { id: 'embed', label: '임베드', labelEn: 'Embed', description: 'YouTube, 링크 등 임베드', descriptionEn: 'Embed YouTube, links, etc.', icon: 'pi-external-link', category: 'media', blockType: 'embed' },
  { id: 'image', label: '이미지', labelEn: 'Image', description: '이미지 업로드 또는 URL 임베드', descriptionEn: 'Upload image or embed from URL', icon: 'pi-image', category: 'media', blockType: 'image' },
  { id: 'table', label: '표', labelEn: 'Table', description: '간단한 표 만들기', descriptionEn: 'Create a simple table', icon: 'pi-table', category: 'basic', blockType: 'table' },
  { id: 'record', label: '녹음 시작', labelEn: 'Start Recording', description: '이 페이지에 오디오 녹음 추가', descriptionEn: 'Add audio recording to this page', icon: 'pi-microphone', category: 'media', aiAction: 'record' },

  // Advanced
  { id: 'import', label: '가져오기', labelEn: 'Import', description: '외부 콘텐츠 가져오기', descriptionEn: 'Import external content', icon: 'pi-download', category: 'advanced', aiAction: 'import' },
  { id: 'subpage', label: '하위 페이지', labelEn: 'Sub-page', description: '현재 페이지 아래에 새 페이지 생성', descriptionEn: 'Create new page under current page', icon: 'pi-file-plus', category: 'advanced', aiAction: 'subpage' },
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

function generateBlockId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
