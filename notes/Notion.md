# 📋 Notion 전체 기능 분석 및 Distillai 구현 플랜

> 2024년 2월 Notion 직접 분석 결과

---

## 1. 에디터 블록 타입 (/ 명령어)

### 🔤 Basic Blocks
| 블록 | 단축키 | 설명 |
|------|--------|------|
| Text | - | 일반 텍스트 |
| Heading 1 | `#` | 대제목 |
| Heading 2 | `##` | 중제목 |
| Heading 3 | `###` | 소제목 |
| Bulleted list | `-` / `*` | 글머리 기호 |
| Numbered list | `1.` | 번호 매기기 |
| To-do list | `[]` | 체크박스 |
| Toggle list | `>` | 토글 (접기/펴기) |
| Quote | `"` | 인용 |
| Divider | `---` | 구분선 |
| Callout | - | 강조 박스 |
| Code | ``` | 코드 블록 |

### 📊 Database Views
| 뷰 타입 | 설명 |
|--------|------|
| Table | 스프레드시트 형태 |
| Board | 칸반 보드 |
| Timeline | 간트 차트 |
| Calendar | 달력 |
| List | 리스트 |
| Gallery | 갤러리 (카드) |
| Chart | 차트 (Bar, Line, Donut) |
| Feed | 피드 |
| Map | 지도 (New) |

### 📁 Database Property Types
| 속성 | 설명 |
|------|------|
| Text | 텍스트 |
| Number | 숫자 |
| Select | 단일 선택 |
| Multi-select | 다중 선택 |
| Status | 상태 |
| Date | 날짜 |
| Person | 사용자 |
| Files & media | 파일/미디어 |
| Checkbox | 체크박스 |
| URL | 링크 |
| Email | 이메일 |
| Phone | 전화번호 |
| Relation | 관계 (다른 DB 연결) |
| Rollup | 롤업 (관계에서 집계) |
| Formula | 수식 |
| Button | 버튼 |
| ID | 고유 ID |
| Place | 장소 |
| Created time/by | 생성 시간/사용자 |
| Last edited time/by | 수정 시간/사용자 |

### 🎨 Media & Embeds
- Image, Video, Audio
- File, PDF, Bookmark
- Code - Mermaid (다이어그램)
- Embed (50+ 외부 서비스)
  - Google Drive, Figma, GitHub, Jira, Trello, Slack, etc.

### 📐 Layout
- 2~5 Columns
- Toggle Headings (접을 수 있는 헤딩)

---

## 2. 텍스트 포맷팅 (인라인)

| 스타일 | 단축키 | 마크다운 |
|--------|--------|----------|
| Bold | `⌘+B` | `**text**` |
| Italic | `⌘+I` | `*text*` |
| Underline | `⌘+U` | - |
| Strikethrough | `⌘+⇧+X` | `~~text~~` |
| Code | `⌘+E` | `` `code` `` |
| Link | `⌘+K` | `[text](url)` |
| Highlight | `⌘+⇧+H` | - |
| Color (text/bg) | - | 10가지 색상 |
| Math/LaTeX | - | 수식 |

### 포맷팅 툴바 (텍스트 선택 시)
- Explain (AI)
- Ask AI
- Comment
- 이모지
- 체크 마크
- Text (블록 타입 변경)
- B (Bold)
- I (Italic)
- U (Underline)
- S (Strikethrough)
- </> (Code)
- 수식 (Math/LaTeX)
- 링크
- A (색상)
- ... (더보기)

---

## 3. 에디터 UX 인터랙션

### 블록 조작
- **드래그 핸들**: 블록 왼쪽에 나타나는 ⋮⋮ 아이콘
- **블록 이동**: `⌘+⇧+↑/↓`
- **블록 복제**: `⌘+D`
- **블록 삭제**: `Delete`
- **블록 타입 변환**: `⌘+/` 또는 `/turn into`

### 선택 & 편집
- **전체 선택**: `⌘+A`
- **블록 선택**: `Esc`
- **다중 블록 선택**: `⇧+Click` 또는 `⇧+↑/↓`

### @ 멘션
- `@person` - 사용자 멘션
- `@date` - 날짜 선택
- `@remind` - 리마인더
- `@page` - 페이지 링크

### [[ 링크
- `[[page name` - 페이지 링크
- `[[+page name` - 새 페이지 생성

### 블록 액션 메뉴 (더보기)
- Turn into (블록 타입 변경)
- Color (색상 변경)
- Copy link to block (⌘^L)
- Duplicate (⌘D)
- Move to (⌘⇧P)
- Delete (Del)
- Comment (⌘⇧M)
- Suggest edits (⌘⇧X)
- Ask AI (⌘J)
- Last edited 정보

---

## 4. 사이드바 & 네비게이션

### 사이드바 구조
```
Workspace Name
├── Search (⌘+P)
├── Home
├── Meetings
├── Notion AI
├── Inbox
├── Private
│   └── [Pages...]
├── Shared
│   └── Start collaborating
├── Notion apps
│   ├── Notion Mail
│   ├── Notion Calendar
│   └── Notion Desktop
├── Settings
├── Marketplace
└── Trash
```

### 페이지 헤더 기능
- Add icon (이모지 아이콘)
- Add cover (커버 이미지)
- Add comment (페이지 코멘트)
- Share (공유)
- Favorite (즐겨찾기)
- More actions (⋯)

---

## 5. 공유 & 협업

### Share 옵션
- Invite by email/group
- Permission levels: Full access, Can edit, Can view, Can comment
- General access: Only people invited / Anyone with link
- Copy link

### Publish to Web
- 공개 웹사이트로 게시
- SEO 설정 가능

### 실시간 협업
- 동시 편집
- 커서 위치 공유
- Comments & Mentions
- Page history

---

## 6. 데이터베이스 View Settings

### View 설정 옵션
- View name (뷰 이름)
- Layout (Table, Board, Timeline, Calendar, List, Gallery, Chart, Feed, Map)
- Property visibility (속성 표시 여부)
- Filter (필터)
- Sort (정렬)
- Group (그룹화)
- Conditional color (조건부 색상)
- Copy link to view (뷰 링크 복사)

### Data Source 설정
- Source (데이터 소스)
- Edit properties (속성 편집)
- Automations (자동화)
- More settings (추가 설정)
- Manage data sources (데이터 소스 관리)
- Lock database (데이터베이스 잠금)

### Table 레이아웃 옵션
- Show data source title
- Show vertical lines
- Show page icon
- Wrap all content
- Open pages in: Side peek / Center peek / Full page
- Load limit

---

## 7. 키보드 단축키 (전체)

### Popular
| 기능 | 단축키 |
|------|--------|
| Find in current page | `⌘+F` |
| Open search or jump | `⌘+P` |
| Add link to selected text | `⌘+K` |
| Copy page URL | `⌘+L` |
| Go back a page | `⌘+[` |
| Go forward a page | `⌘+]` |
| Peek at content above | `Ctrl+⇧+K` |
| Peek at content below | `Ctrl+⇧+J` |
| Toggle dark mode | `⌘+⇧+L` |

### Create & Style
| 기능 | 단축키 |
|------|--------|
| Insert line of text | `Enter` |
| Line break within block | `⇧+Enter` |
| Create comment | `⌘+⇧+M` |
| Bold | `⌘+B` |
| Italic | `⌘+I` |
| Underline | `⌘+U` |
| Strikethrough | `⌘+⇧+X` |
| Inline code | `⌘+E` |
| Add link | `⌘+K` |
| Indent | `Tab` |
| Un-indent | `⇧+Tab` |
| Turn block into type | `⌘+⌥+0` |
| Zoom out | `⌘+-` |
| Go to parent page | `⌘+⇧+U` |
| Duplicate blocks | `⌘+D` |

### Edit & Move
| 기능 | 단축키 |
|------|--------|
| Select current block | `Esc` |
| Select block with cursor | `⌘+A` |
| Delete content | `Delete` |
| Edit/change blocks | `⌘+/` |
| Move block up | `⌘+⇧+↑` |
| Move block down | `⌘+⇧+↓` |
| Expand/close toggles | `⌘+⌥+T` |
| Highlight text | `⌘+⇧+H` |

### Markdown Style
| 블록 | 마크다운 |
|------|----------|
| H1 heading | `# + Space` |
| H2 heading | `## + Space` |
| H3 heading | `### + Space` |
| Bulleted list | `- / * / • + Space` |
| Numbered list | `1. + Space` |
| To-do checkbox | `[] + Space` |
| Toggle list | `> + Space` |
| Quote block | `" + Space` |
| Bold text | `**text**` |
| Italic text | `*text*` |
| Inline code | `` `code` `` |

### Commands
| 타입 | 명령어 |
|------|--------|
| Mention person | `@person` |
| Mention date | `@date` |
| Add reminder | `@remind` |
| Create sub-page | `+sub-page name` |
| Create new page | `+new page name` |
| Link to page | `+page name` |
| Link (bracket) | `[[page name` |

---

## 8. Settings 구조

### Account
- User Profile
- Preferences
- Notifications
- Connections

### Workspace
- General
- People
- Teamspaces
- Notion AI
- Public pages
- Emoji
- Connections
- Import
- Upgrade plan

### Preferences
- Appearance (Light/Dark/System)
- Language & Time
- Text direction controls
- Start week on Monday
- Date format
- Timezone
- Desktop app settings
- Privacy settings

---

## 🎯 Distillai 에디터 구현 우선순위

### Phase 1: Core Editor (MVP)
1. **기본 블록**: Text, H1-H3, Bulleted/Numbered list, To-do, Quote, Divider, Callout
2. **인라인 포맷팅**: Bold, Italic, Underline, Strikethrough, Code, Link
3. **/ 명령어**: 블록 생성 메뉴
4. **마크다운 단축키**: `#`, `-`, `1.`, `[]`, `>`
5. **블록 드래그 앤 드롭**

### Phase 2: Enhanced Editor
1. **Toggle 블록**
2. **코드 블록** (syntax highlighting)
3. **이미지/파일 업로드**
4. **색상 (텍스트/배경)**
5. **블록 이동/복제 단축키**

### Phase 3: Database (간소화)
1. **Simple Table** (속성: Text, Select, Date, Checkbox)
2. **기본 필터/정렬**
3. **Table ↔ List 뷰 전환**

### Phase 4: Collaboration
1. **페이지 공유 (링크)**
2. **Comments**
3. **Page history**

---

## 🔑 Notion이 매끄러운 이유 (핵심 UX 포인트)

### 1. 즉각적인 피드백
- 타이핑 즉시 마크다운 변환
- 블록 호버 시 핸들 표시
- 선택 시 즉시 포맷팅 툴바

### 2. 컨텍스트 메뉴
- `/` - 블록 생성
- `@` - 멘션
- `[[` - 링크
- 선택 시 - 포맷팅 툴바

### 3. 키보드 퍼스트
- 모든 기능에 단축키 지원
- Tab/Shift+Tab 들여쓰기
- Enter로 새 블록, Backspace로 블록 병합

### 4. 스무스 애니메이션
- 블록 이동 시 부드러운 전환
- 메뉴 열기/닫기 애니메이션
- 토글 펼치기/접기

### 5. 오류 방지
- Undo/Redo (⌘+Z/⌘+⇧+Z)
- 삭제 전 확인 없음 (Undo로 복구 가능)
- 자동 저장

---

## 📚 추천 라이브러리 (Angular/TS)

### 에디터 프레임워크
- **Tiptap** (ProseMirror 기반, 가장 추천)
- **Slate.js** (React 기반이지만 참고용)
- **Lexical** (Facebook/Meta)

### 드래그 앤 드롭
- **@angular/cdk/drag-drop**
- **SortableJS**

### 마크다운 파싱
- **marked**
- **markdown-it**

---

## 🚀 구현 시 핵심 고려사항

1. **블록 기반 아키텍처**: 각 블록이 독립적인 컴포넌트
2. **Contenteditable**: 브라우저 기본 편집 기능 활용
3. **Virtual Scrolling**: 긴 문서 성능 최적화
4. **Collaborative Editing**: CRDT 또는 OT 알고리즘
5. **Offline Support**: IndexedDB + Service Worker

---

*이 문서는 Notion 웹 앱을 직접 분석하여 작성되었습니다.*
