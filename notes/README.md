# Project Notes

이 폴더는 Distillai 프로젝트 작업 중 발견한 인사이트, 버그 해결 방법, 결정 사항을 기록합니다.

## 사용법
- 각 작업/PR마다 새 파일 생성 (예: `2024-01-15-blocknote-cursor-fix.md`)
- PR 머지 후 관련 노트 업데이트
- 자주 발생하는 문제는 CLAUDE.md로 승격

## 기록할 내용
- 버그 원인과 해결 방법
- 아키텍처 결정 이유
- 유용한 코드 패턴
- 삽질했던 경험과 회피법

## 최근 노트
- [2024-01-15] BlockNote sideMenu가 클릭을 가로채는 문제 → `sideMenu={false}` 해결
- [2024-01-15] 이메일 화이트리스트 구현 (auth callback + layout 이중 체크)
