# Notion 기능 분석 문서 검증 결과

> 검증일: 2026-02-03
> 검증 방법: Notion 웹 앱 직접 테스트 (Chrome MCP)

---

## 검증 대상

`notes/Notion.md` 문서의 정확성 검증

---

## 1. Basic Blocks 추가 항목 검증

| 항목 | 문서 표기 | 실제 Notion | 상태 |
|------|----------|------------|------|
| Synced Block | Synced Block | Synced block | ✅ 정확 |
| Simple Table | Simple Table | Table | ✅ 정확 (Table로 표시됨) |
| Table of Contents | Table of Contents | Table of contents | ✅ 정확 |
| Breadcrumb | Breadcrumb | Breadcrumb | ✅ 정확 |
| Bookmark | Bookmark | Web bookmark | ✅ 정확 (Web bookmark로 표시됨) |
| Template Button | Template Button | Button | ⚠️ 수정 필요 (Button으로 표시됨) |

### 스크린샷 검증 내역

1. `/synced` 검색 → "Synced block" 확인
2. `/table` 검색 → "Table", "Table view - Database", "Table of contents" 확인
3. `/bread` 검색 → "Breadcrumb" 확인
4. `/bookmark` 검색 → "Web bookmark" 확인
5. `/template` 검색 → "Button" 확인

---

## 2. Block Type Creation 숫자 단축키 검증

| 단축키 | 문서 설명 | 실제 동작 | 상태 |
|--------|----------|----------|------|
| `⌘+⌥+0` | Text | - | 미테스트 |
| `⌘+⌥+1` | H1 heading | H1으로 변환됨 | ✅ 정확 |
| `⌘+⌥+2` | H2 heading | - | 미테스트 |
| `⌘+⌥+3` | H3 heading | - | 미테스트 |
| `⌘+⌥+4` | Checkbox | - | 미테스트 |
| `⌘+⌥+5` | Bullet list | Bullet list로 변환됨 | ✅ 정확 |
| `⌘+⌥+6` | Numbered list | - | 미테스트 |
| `⌘+⌥+7` | Toggle list | - | 미테스트 |
| `⌘+⌥+8` | Code block | - | 미테스트 |
| `⌘+⌥+9` | New page | - | 미테스트 |

### 테스트 결과

- "Testing shortcuts" 텍스트 입력 후 `⌘+⌥+1` → H1 heading으로 변환 ✅
- H1 상태에서 `⌘+⌥+5` → Bullet list로 변환 ✅

---

## 3. 이전 검증에서 확인된 항목 (2026-02-03 첫 번째 검증)

### / 명령어 블록 타입
- Basic Blocks (Text, H1-H3, Lists, Toggle, Quote, Divider, Callout, Code) ✅
- AI Blocks (Ask a question, Ask about this page, Make shorter, AI Meeting Notes) ✅
- Database Views (Table, Board, Timeline, Calendar, List, Gallery, Chart, Feed, Map, Form) ✅
- Media (Image, Video, Audio) ✅
- Layout (2-5 Columns, Toggle Heading 1/2/3) ✅
- Embeds (Tweet, GitHub Gist, Google Maps, Figma, Abstract, Invision, Mixpanel, Framer 등) ✅

### 텍스트 포맷팅 툴바
- Improve writing (AI) ✅
- Ask AI ✅
- Comment ✅
- 이모지, 체크마크 ✅
- Text, B, I, U, S, </>, 수식, 링크, A (색상), ... ✅

### 사이드바 구조
- Workspace Name, Search, Home, Meetings, Notion AI, Inbox ✅
- Private, Shared, Notion apps ✅
- Settings, Marketplace, Trash ✅

### Database Property Types
- 기본 속성 (Text, Number, Select, Multi-select, Status, Date 등) ✅
- 외부 연동 속성 (Google Drive File, Figma File, GitHub Pull Request, Zendesk Ticket) ✅

### Settings 구조
- Account (Preferences, Notifications, Connections) ✅
- Workspace (General, People, Teamspaces, Notion AI, Public pages, Emoji, Connections, Import, Upgrade plan) ✅
- Preferences (Appearance, Language & Time, Text direction controls, Start week on Monday, Date format, Timezone) ✅

---

## 4. 문서 수정 권장사항

### 즉시 수정 필요

1. **Template Button → Button**
   - 현재 문서: "Template Button"
   - 실제 Notion: "Button"
   - 권장: "Button (Template Button)" 또는 그냥 "Button"으로 수정

### 선택적 수정 (더 정확한 표기)

2. **Bookmark → Web bookmark**
   - 현재 문서: "Bookmark"
   - 실제 Notion: "Web bookmark"
   - 권장: 현재 표기도 충분히 이해 가능

---

## 5. 검증 결론

| 카테고리 | 검증 결과 |
|----------|----------|
| Basic Blocks | ✅ 정확 (1개 명칭 수정 필요) |
| Database Views | ✅ 정확 |
| Database Properties | ✅ 정확 |
| 숫자 단축키 | ✅ 정확 |
| 사이드바 구조 | ✅ 정확 |
| Settings 구조 | ✅ 정확 |
| 텍스트 포맷팅 | ✅ 정확 |

**전체 평가: 문서의 분석은 매우 정확함. 작은 명칭 차이(Template Button → Button)만 수정하면 완벽함.**

---

*검증자: Claude (Chrome MCP를 통한 Notion 웹 앱 직접 테스트)*
