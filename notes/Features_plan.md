# Distillai 기능 개발 계획

> 기준: `Features_plan_verify.md` 검증 결과
> 작성일: 2026-02-03

---

## 📊 현재 구현 현황

| Phase | 구현율 | 상태 |
|-------|--------|------|
| Phase 1: Core Editor | **95%** | ✅ 거의 완료 |
| Phase 2: Enhanced Editor | **85%** | 🔜 진행 중 |
| Phase 3: Advanced Blocks | **30%** | ⏳ 일부 구현 |
| Phase 4: Database | **5%** | ❌ 미구현 |
| Phase 5: Collaboration | **10%** | ❌ 미구현 |

---

## 🔴 우선순위 높음 (1주 내 구현)

### 1. Tab/Shift+Tab 들여쓰기 (리스트 중첩)

**현재 상태**: ❌ 미구현

**구현 계획**:
```typescript
// block-renderer.component.ts에 추가

// 1. Block 타입에 depth 속성 추가
interface Block {
  // ... 기존 속성
  depth?: number; // 0 = 최상위, 1 = 1단계 들여쓰기, ...
}

// 2. keydown 핸들러에 Tab 처리 추가
handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Tab') {
    event.preventDefault();
    if (event.shiftKey) {
      this.decreaseIndent(); // Shift+Tab: 내어쓰기
    } else {
      this.increaseIndent(); // Tab: 들여쓰기
    }
  }
}

// 3. CSS로 들여쓰기 스타일링
.block-depth-1 { margin-left: 24px; }
.block-depth-2 { margin-left: 48px; }
.block-depth-3 { margin-left: 72px; }
```

**파일 수정**:
- `block.types.ts`: Block 인터페이스에 `depth` 추가
- `block-renderer.component.ts`: Tab 키 핸들러 추가
- `block-renderer.component.scss`: 들여쓰기 스타일

**예상 소요 시간**: 4시간

---

### 2. Syntax Highlighting (코드 블록)

**현재 상태**: ⚠️ 언어 표시만 구현

**구현 계획**:
```bash
# Prism.js 설치
npm install prismjs @types/prismjs
```

```typescript
// code-block.component.ts (새 컴포넌트)
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
// ... 필요한 언어 추가

@Component({
  selector: 'app-code-block',
  template: `
    <div class="code-block">
      <div class="code-header">
        <select [(ngModel)]="language" (change)="onLanguageChange()">
          <option value="typescript">TypeScript</option>
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <!-- ... -->
        </select>
        <button (click)="copyCode()">Copy</button>
      </div>
      <pre class="line-numbers"><code [innerHTML]="highlightedCode"></code></pre>
    </div>
  `
})
export class CodeBlockComponent {
  highlightCode() {
    this.highlightedCode = Prism.highlight(
      this.code,
      Prism.languages[this.language],
      this.language
    );
  }
}
```

**지원 언어 (초기)**:
- TypeScript, JavaScript
- Python
- HTML, CSS
- JSON
- Bash/Shell
- SQL

**파일 생성/수정**:
- `code-block.component.ts`: 새 컴포넌트 생성
- `styles.scss`: Prism 테마 import
- `block-renderer.component.ts`: CodeBlockComponent 사용

**예상 소요 시간**: 6시간

---

### 3. Synced Block (동기화 블록)

**현재 상태**: ❌ 미구현

**구현 계획**:

1. **DB 스키마 추가**:
```sql
-- migrations/006_synced_blocks.sql
CREATE TABLE synced_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  content JSONB NOT NULL,  -- 블록 내용
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 페이지에서 synced block 참조
ALTER TABLE blocks ADD COLUMN synced_block_id UUID REFERENCES synced_blocks(id);
```

2. **동작 방식**:
```typescript
// synced-block.service.ts
@Injectable({ providedIn: 'root' })
export class SyncedBlockService {
  // Synced Block 생성
  async createSyncedBlock(content: Block[]): Promise<SyncedBlock> {
    return this.supabase.from('synced_blocks').insert({ content });
  }

  // 다른 페이지에 삽입
  async insertSyncedBlockReference(pageId: string, syncedBlockId: string) {
    return this.supabase.from('blocks').insert({
      page_id: pageId,
      type: 'synced_block',
      synced_block_id: syncedBlockId
    });
  }

  // 실시간 구독 (변경 시 모든 참조에 반영)
  subscribeToSyncedBlock(syncedBlockId: string) {
    return this.supabase
      .channel(`synced_block:${syncedBlockId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'synced_blocks',
        filter: `id=eq.${syncedBlockId}`
      }, (payload) => {
        this.updateAllReferences(payload.new);
      })
      .subscribe();
  }
}
```

3. **UI**:
- 블록 선택 후 "Synced Block 만들기" 메뉴
- Synced Block은 빨간색 테두리로 구분
- 편집 시 "모든 곳에 반영됩니다" 알림

**파일 생성/수정**:
- `migrations/006_synced_blocks.sql`: DB 스키마
- `synced-block.service.ts`: 비즈니스 로직
- `block-renderer.component.ts`: Synced Block 렌더링
- `slash-command.component.ts`: 메뉴 추가

**예상 소요 시간**: 12시간

---

## 🟡 우선순위 중간 (2주 내 구현)

### 4. 숫자 단축키 (⌘+⌥+1~9)

**현재 상태**: ❌ 미구현

**구현 계획**:
```typescript
// block-renderer.component.ts

@HostListener('document:keydown', ['$event'])
handleGlobalKeydown(event: KeyboardEvent) {
  // ⌘+⌥+숫자 감지
  if (event.metaKey && event.altKey && /^[0-9]$/.test(event.key)) {
    event.preventDefault();
    this.convertBlockByNumber(parseInt(event.key));
  }
}

convertBlockByNumber(num: number) {
  const typeMap: Record<number, BlockType> = {
    0: 'text',
    1: 'heading1',
    2: 'heading2',
    3: 'heading3',
    4: 'todo',
    5: 'bullet',
    6: 'numbered',
    7: 'toggle',
    8: 'code',
    9: 'page'
  };

  const newType = typeMap[num];
  if (newType && this.currentBlock) {
    this.changeBlockType(this.currentBlock.id, newType);
  }
}
```

**예상 소요 시간**: 2시간

---

### 5. 블록 이동/복제 단축키

**현재 상태**: ⚠️ 메뉴에서만 가능

**구현 계획**:
```typescript
// block-renderer.component.ts

@HostListener('document:keydown', ['$event'])
handleGlobalKeydown(event: KeyboardEvent) {
  // ⌘+⇧+↑ 블록 위로 이동
  if (event.metaKey && event.shiftKey && event.key === 'ArrowUp') {
    event.preventDefault();
    this.moveBlockUp();
  }

  // ⌘+⇧+↓ 블록 아래로 이동
  if (event.metaKey && event.shiftKey && event.key === 'ArrowDown') {
    event.preventDefault();
    this.moveBlockDown();
  }

  // ⌘+D 블록 복제
  if (event.metaKey && event.key === 'd') {
    event.preventDefault();
    this.duplicateBlock();
  }
}
```

**예상 소요 시간**: 3시간

---

### 6. Table of Contents (목차)

**현재 상태**: ❌ 미구현

**구현 계획**:
```typescript
// toc-block.component.ts
@Component({
  selector: 'app-toc-block',
  template: `
    <div class="toc-block">
      <div class="toc-title">목차</div>
      <ul class="toc-list">
        @for (item of tocItems; track item.id) {
          <li [class]="'toc-level-' + item.level">
            <a (click)="scrollToBlock(item.id)">{{ item.text }}</a>
          </li>
        }
      </ul>
    </div>
  `
})
export class TocBlockComponent implements OnInit {
  tocItems: TocItem[] = [];

  ngOnInit() {
    this.generateToc();
  }

  generateToc() {
    // 페이지 내 모든 Heading 블록 스캔
    this.tocItems = this.pageBlocks
      .filter(b => b.type.startsWith('heading'))
      .map(b => ({
        id: b.id,
        text: b.content,
        level: parseInt(b.type.replace('heading', ''))
      }));
  }

  scrollToBlock(blockId: string) {
    document.getElementById(`block-${blockId}`)?.scrollIntoView({
      behavior: 'smooth'
    });
  }
}
```

**예상 소요 시간**: 4시간

---

### 7. Web Bookmark 프리뷰

**현재 상태**: ⚠️ 플레이스홀더만 존재

**구현 계획**:

1. **백엔드 API** (URL 메타데이터 파싱):
```typescript
// backend/src/routes/bookmark.routes.ts
router.get('/api/bookmark/preview', async (req, res) => {
  const { url } = req.query;

  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const metadata = {
      title: $('meta[property="og:title"]').attr('content') || $('title').text(),
      description: $('meta[property="og:description"]').attr('content'),
      image: $('meta[property="og:image"]').attr('content'),
      favicon: $('link[rel="icon"]').attr('href'),
      url: url
    };

    res.json(metadata);
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch URL' });
  }
});
```

2. **프론트엔드 컴포넌트**:
```typescript
// bookmark-block.component.ts
@Component({
  selector: 'app-bookmark-block',
  template: `
    <a [href]="bookmark.url" target="_blank" class="bookmark-card">
      @if (bookmark.image) {
        <img [src]="bookmark.image" class="bookmark-image" />
      }
      <div class="bookmark-content">
        <div class="bookmark-title">{{ bookmark.title }}</div>
        <div class="bookmark-description">{{ bookmark.description }}</div>
        <div class="bookmark-url">
          <img [src]="bookmark.favicon" class="favicon" />
          {{ bookmark.url | domain }}
        </div>
      </div>
    </a>
  `
})
```

**파일 생성/수정**:
- `backend/src/routes/bookmark.routes.ts`: 메타데이터 API
- `bookmark-block.component.ts`: 북마크 UI 컴포넌트
- `block-renderer.component.ts`: 컴포넌트 연동

**예상 소요 시간**: 6시간

---

## 🟢 우선순위 낮음 (추후 확장)

### 8. Database Views (Phase 4)

**예상 소요 시간**: 40시간+

**구현 순서**:
1. Database 스키마 설계
2. Property Types 구현 (Text, Select, Date, Number, Checkbox)
3. Table View 구현
4. Filter/Sort/Group 구현
5. Board View (칸반) 구현
6. List View 구현

**기술 스택 검토**:
- TanStack Table (React) vs ag-Grid vs 자체 구현
- Supabase Realtime으로 실시간 동기화

---

### 9. Collaboration (Phase 5)

**예상 소요 시간**: 60시간+

**구현 순서**:
1. 페이지 공유 링크 생성
2. 권한 관리 (View/Edit/Comment)
3. Comments 시스템
4. @Mentions
5. Page History (버전 관리)
6. 실시간 커서 공유 (Yjs/CRDT)

**기술 스택 검토**:
- Supabase Realtime Presence
- Yjs/Y-Websocket for CRDT
- Liveblocks (유료)

---

## 📅 개발 일정 (제안)

### Week 1
- [ ] Tab/Shift+Tab 들여쓰기 (4h)
- [ ] 숫자 단축키 (2h)
- [ ] 블록 이동/복제 단축키 (3h)

### Week 2
- [ ] Syntax Highlighting (6h)
- [ ] Table of Contents (4h)
- [ ] Web Bookmark 프리뷰 (6h)

### Week 3-4
- [ ] Synced Block (12h)
- [ ] 버그 수정 및 테스트

### Month 2+
- [ ] Database Views (선택적)
- [ ] Collaboration (선택적)

---

## 📝 참고 사항

### BlockNote 에디터 활용
현재 `frontend-next/`에 BlockNote 기반 에디터가 있습니다.
기존 Angular 에디터와 병행 개발하거나 마이그레이션 검토 필요.

### 코드베이스 위치
- Angular 에디터: `frontend/src/app/features/page/`
- Next.js 에디터: `frontend-next/components/editor/`
- 백엔드: `backend/src/`

---

*작성자: Claude*
*마지막 업데이트: 2026-02-03*
