import { Component, inject, signal, computed, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ApiService, Distillation, ChatMessage, CategoryWithCount } from '../../core/services/api.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

type ReportTab = 'detailed' | 'summary' | 'transcript';
type SubTab = '인포그래픽' | '인용리포트' | '액션아이템' | '배경지식';

interface ParsedSection {
  title: string;
  timestamp?: string;
  items: Array<{ type: 'heading' | 'bullet' | 'quote' | 'text' | 'timestamp-item'; content: string; timestamp?: string }>;
}

interface QuoteItem {
  content: string;
  timestamp?: string;
}

interface ActionItem {
  content: string;
  priority: 'high' | 'medium' | 'low';
}

@Component({
  selector: 'app-lecture-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule],
  template: `
    <div class="h-screen bg-surface flex flex-col md:flex-row">
      <!-- Mobile Header -->
      <header class="md:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-surface shrink-0">
        <div class="flex items-center gap-2">
          <button
            (click)="goBack()"
            class="p-1.5 rounded-lg hover:bg-surface-elevated transition-colors">
            <i class="pi pi-arrow-left text-zinc-400"></i>
          </button>
          <span class="text-sm font-medium text-white truncate max-w-[200px]">{{ distillation()?.title }}</span>
        </div>
        <div class="flex items-center gap-1">
          <button
            (click)="showMobilePlayer.set(!showMobilePlayer())"
            class="p-2 rounded-lg hover:bg-surface-elevated transition-colors"
            [class.bg-primary]="showMobilePlayer()"
            [class.bg-opacity-20]="showMobilePlayer()">
            <i class="pi pi-volume-up" [class.text-primary]="showMobilePlayer()"></i>
          </button>
          <button
            (click)="toggleAgentPanel()"
            class="p-2 rounded-lg hover:bg-surface-elevated transition-colors"
            [class.bg-primary]="showAgentPanel()"
            [class.bg-opacity-20]="showAgentPanel()">
            <i class="pi pi-comments" [class.text-primary]="showAgentPanel()"></i>
          </button>
        </div>
      </header>

      <!-- Mobile Player Panel -->
      @if (showMobilePlayer()) {
        <div class="md:hidden bg-surface-elevated border-b border-zinc-800 p-4 shrink-0">
          <div class="bg-surface rounded-xl border border-zinc-700 p-4">
            <div class="flex items-center gap-3 mb-3">
              <button
                (click)="togglePlay()"
                class="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shrink-0">
                @if (isPlaying()) {
                  <i class="pi pi-pause text-white text-lg"></i>
                } @else {
                  <i class="pi pi-play text-white text-lg ml-0.5"></i>
                }
              </button>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-white truncate">{{ distillation()?.title }}</p>
                <p class="text-xs text-zinc-500">{{ formatTime(currentTime()) }} / {{ formatTime(audioDuration()) }}</p>
              </div>
              @if (distillation()?.audioUrl || distillation()?.audioPath) {
                <button
                  (click)="downloadAudio()"
                  class="p-2 rounded-lg hover:bg-surface-overlay transition-colors">
                  <i class="pi pi-download text-zinc-400"></i>
                </button>
              }
            </div>
            @if (distillation()?.audioUrl || distillation()?.audioPath) {
              <div
                class="h-2 bg-zinc-700 rounded-full cursor-pointer overflow-hidden"
                (click)="seekAudio($event)">
                <div class="h-full bg-primary rounded-full transition-all" [style.width.%]="progress()"></div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Left Panel - Source & Player (Desktop only) -->
      <aside class="hidden md:flex w-[360px] border-r border-zinc-800 flex-col bg-surface-elevated/30 shrink-0">
        <!-- Header -->
        <div class="p-4 border-b border-zinc-800">
          <div class="flex items-center gap-2 mb-3">
            <button
              (click)="goBack()"
              class="p-1.5 rounded-lg hover:bg-surface-elevated transition-colors">
              <i class="pi pi-arrow-left text-zinc-400 text-sm"></i>
            </button>
            <span class="text-xs text-zinc-500">대시보드로 돌아가기</span>
          </div>
          <h2 class="text-sm font-medium text-zinc-400 mb-1">자료 (1)</h2>
        </div>

        <!-- Audio Source Card -->
        <div class="p-4 flex-1 overflow-auto">
          <div class="bg-surface-elevated rounded-xl border border-zinc-700 overflow-hidden">
            <!-- Audio Visualizer Placeholder -->
            <div class="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center relative">
              <div class="absolute inset-0 flex items-center justify-center">
                <!-- Waveform visualization -->
                <div class="flex items-center gap-1 h-16">
                  @for (i of waveformBars; track i) {
                    <div
                      class="w-1 bg-primary/60 rounded-full transition-all duration-150"
                      [style.height.px]="isPlaying() ? (20 + Math.random() * 40) : 20">
                    </div>
                  }
                </div>
              </div>
              <!-- Play Button Overlay -->
              <button
                (click)="togglePlay()"
                class="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
                <div class="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
                  @if (isPlaying()) {
                    <i class="pi pi-pause text-white text-2xl"></i>
                  } @else {
                    <i class="pi pi-play text-white text-2xl ml-1"></i>
                  }
                </div>
              </button>
            </div>

            <!-- Audio Info -->
            <div class="p-4">
              <div class="flex items-start gap-3 mb-3">
                <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                  <i class="pi pi-microphone text-white"></i>
                </div>
                <div class="min-w-0 flex-1">
                  @if (isEditingTitle()) {
                    <input
                      #titleInput
                      [(ngModel)]="editedTitle"
                      (blur)="onTitleBlur($event)"
                      (keydown.enter)="saveTitle()"
                      (compositionstart)="isComposingTitle = true"
                      (compositionend)="onTitleCompositionEnd($event)"
                      class="input text-sm font-medium w-full"
                      autofocus />
                  } @else {
                    <h3
                      (click)="startEditTitle()"
                      class="text-sm font-medium text-white truncate cursor-pointer hover:text-primary transition-colors">
                      {{ distillation()?.title }}
                    </h3>
                  }
                  <p class="text-xs text-zinc-500 mt-0.5">
                    {{ formatDuration(distillation()?.durationSeconds) }} • {{ formatDate(distillation()?.createdAt) }}
                  </p>
                </div>
              </div>

              <!-- Mini Progress Bar -->
              @if (distillation()?.audioUrl || distillation()?.audioPath) {
                <audio
                  #audioPlayer
                  [src]="distillation()?.audioUrl"
                  (timeupdate)="onTimeUpdate()"
                  (ended)="onAudioEnded()"
                  (loadedmetadata)="onMetadataLoaded()"
                  (durationchange)="onDurationChange()"
                  (loadeddata)="onLoadedData()"
                  (loadstart)="onLoadStart()"
                  (error)="onAudioError($event)"
                  preload="auto">
                </audio>

                <div class="space-y-2">
                  <div
                    #progressBar
                    class="h-1.5 bg-zinc-700 rounded-full cursor-pointer overflow-hidden"
                    (click)="seekAudio($event)">
                    <div
                      class="h-full bg-primary rounded-full transition-all"
                      [style.width.%]="progress()">
                    </div>
                  </div>
                  <div class="flex justify-between text-xs text-zinc-500 font-mono">
                    <span>{{ formatTime(currentTime()) }}</span>
                    <div class="flex items-center gap-2">
                      <button
                        (click)="cycleSpeed()"
                        class="px-1.5 py-0.5 rounded bg-surface-overlay text-zinc-400 hover:text-white transition-colors">
                        {{ playbackSpeed() }}x
                      </button>
                      <span>{{ formatTime(audioDuration()) }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Bottom Buttons -->
            <div class="flex border-t border-zinc-700">
              <button
                (click)="activeTab.set('transcript')"
                class="flex-1 px-4 py-3 flex items-center justify-center gap-2
                       text-sm text-zinc-400 hover:text-white hover:bg-surface-overlay transition-colors">
                <i class="pi pi-file-edit"></i>
                <span>스크립트</span>
              </button>
              @if (distillation()?.audioUrl || distillation()?.audioPath) {
                <button
                  (click)="downloadAudio()"
                  class="flex-1 px-4 py-3 flex items-center justify-center gap-2 border-l border-zinc-700
                         text-sm text-zinc-400 hover:text-white hover:bg-surface-overlay transition-colors">
                  <i class="pi pi-download"></i>
                  <span>다운로드</span>
                </button>
              }
            </div>
          </div>

          <!-- Category Selection (always visible) -->
          <div class="mt-4 p-4 bg-surface rounded-xl border border-zinc-700">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-zinc-500 uppercase tracking-wider">카테고리</span>
              @if (isAISuggested()) {
                <span class="text-xs text-amber-400 flex items-center gap-1">
                  <i class="pi pi-sparkles text-xs"></i>
                  AI 추천
                </span>
              } @else if (currentCategory()) {
                <span class="text-xs text-emerald-400 flex items-center gap-1">
                  <i class="pi pi-check-circle text-xs"></i>
                  확인됨
                </span>
              }
            </div>

            <div class="relative">
              <button
                (click)="showCategoryDropdown.set(!showCategoryDropdown())"
                class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface-elevated
                       border border-zinc-700 hover:border-zinc-600 transition-colors">
                @if (currentCategory()) {
                  <div class="flex items-center gap-2">
                    <span
                      class="w-2.5 h-2.5 rounded-full shrink-0"
                      [style.backgroundColor]="currentCategory()!.color"></span>
                    <span class="text-sm text-white">{{ currentCategory()!.name }}</span>
                  </div>
                } @else {
                  <span class="text-sm text-zinc-500">카테고리 선택</span>
                }
                <i class="pi pi-chevron-down text-xs text-zinc-400"
                   [class.rotate-180]="showCategoryDropdown()"></i>
              </button>

              @if (showCategoryDropdown()) {
                <div class="absolute top-full left-0 right-0 mt-1 bg-surface-elevated border border-zinc-700
                            rounded-xl shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                  @for (category of categories(); track category.id) {
                    <button
                      (click)="updateCategory(category.id)"
                      [disabled]="savingCategory()"
                      class="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-surface-overlay
                             transition-colors disabled:opacity-50"
                      [class.bg-cyan-500]="category.id === distillation()?.aiSuggestedCategoryId"
                      [class.bg-opacity-10]="category.id === distillation()?.aiSuggestedCategoryId">
                      <span
                        class="w-2.5 h-2.5 rounded-full shrink-0"
                        [style.backgroundColor]="category.color"></span>
                      <span class="text-sm flex-1"
                            [class.text-cyan-400]="category.id === distillation()?.aiSuggestedCategoryId"
                            [class.text-white]="category.id !== distillation()?.aiSuggestedCategoryId">
                        {{ category.name }}
                      </span>
                      @if (category.id === distillation()?.aiSuggestedCategoryId) {
                        <i class="pi pi-check text-xs text-cyan-400"></i>
                      }
                    </button>
                  }
                </div>
              }
            </div>

            @if (isAISuggested()) {
              <button
                (click)="updateCategory(currentCategory()!.id)"
                [disabled]="savingCategory()"
                class="w-full mt-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30
                       text-sm text-cyan-400 hover:bg-cyan-500/20 transition-colors disabled:opacity-50">
                @if (savingCategory()) {
                  <i class="pi pi-spin pi-spinner mr-2"></i>
                }
                AI 추천 확인
              </button>
            }
          </div>
        </div>

        <!-- Bottom Actions -->
        <div class="p-4 border-t border-zinc-800 space-y-2">
          <button
            (click)="toggleAgentPanel()"
            class="w-full btn-primary flex items-center justify-center gap-2 py-2.5">
            <i class="pi pi-comments"></i>
            <span>Agent D와 대화하기</span>
          </button>
          <div class="relative">
            <button
              (click)="showSidebarExportMenu.set(!showSidebarExportMenu())"
              class="w-full btn-secondary flex items-center justify-center gap-2 py-2.5">
              <i class="pi pi-file-export"></i>
              <span>요약 내보내기</span>
            </button>
            @if (showSidebarExportMenu()) {
              <div class="absolute bottom-full left-0 right-0 mb-2 bg-surface-elevated border border-zinc-700
                          rounded-xl shadow-xl overflow-hidden z-50">
                <div class="py-2">
                  <!-- PDF -->
                  <button
                    (click)="exportAs('pdf'); showSidebarExportMenu.set(false)"
                    class="w-full px-4 py-3 text-left hover:bg-surface-overlay flex items-center justify-between">
                    <div>
                      <div class="text-sm font-medium text-white">PDF</div>
                      <div class="text-xs text-zinc-500">문서 전송에 가장 적합</div>
                    </div>
                    <i class="pi pi-check text-primary text-sm"></i>
                  </button>
                  <!-- DOCX -->
                  <button
                    (click)="exportAs('docx'); showSidebarExportMenu.set(false)"
                    class="w-full px-4 py-3 text-left hover:bg-surface-overlay">
                    <div class="text-sm font-medium text-white">DOCX</div>
                    <div class="text-xs text-zinc-500">마이크로소프트 워드 문서 형식</div>
                  </button>
                  <!-- JSON -->
                  <button
                    (click)="exportAs('json'); showSidebarExportMenu.set(false)"
                    class="w-full px-4 py-3 text-left hover:bg-surface-overlay">
                    <div class="text-sm font-medium text-white">JSON</div>
                    <div class="text-xs text-zinc-500">프로그래밍 데이터로 적합</div>
                  </button>
                  <!-- MARKDOWN -->
                  <button
                    (click)="exportAs('md'); showSidebarExportMenu.set(false)"
                    class="w-full px-4 py-3 text-left hover:bg-surface-overlay">
                    <div class="text-sm font-medium text-white">MARKDOWN</div>
                    <div class="text-xs text-zinc-500">리포트로 내보내기 적합</div>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </aside>

      <!-- Right Panel - Report Content -->
      <main class="flex-1 flex flex-col overflow-hidden">
        <!-- Tab Navigation -->
        <div class="border-b border-zinc-800 bg-surface/95 backdrop-blur-sm">
          <div class="px-6 py-3 flex items-center gap-1">
            @for (tab of tabs; track tab.id) {
              <button
                (click)="activeTab.set(tab.id)"
                [class]="activeTab() === tab.id
                  ? 'px-4 py-2 rounded-lg bg-primary/10 text-primary border border-primary/30 text-sm font-medium'
                  : 'px-4 py-2 rounded-lg text-zinc-400 hover:bg-surface-elevated text-sm font-medium transition-colors'">
                {{ tab.label }}
                @if (tab.id === activeTab()) {
                  <i class="pi pi-star-fill text-xs ml-1 text-primary"></i>
                }
              </button>
            }
            <div class="flex-1"></div>
            <div class="relative">
              <button
                (click)="toggleSettingsMenu()"
                class="p-2 rounded-lg hover:bg-surface-elevated transition-colors">
                <i class="pi pi-cog text-zinc-400"></i>
              </button>
              @if (showSettingsMenu()) {
                <div class="absolute right-0 top-full mt-1 w-56 bg-surface-elevated border border-zinc-700
                            rounded-xl shadow-xl overflow-hidden z-50">
                  <div class="p-2">
                    <div class="px-3 py-2 text-xs text-zinc-500 uppercase tracking-wider">설정</div>
                    <button
                      (click)="toggleAutoPlay(); showSettingsMenu.set(false)"
                      class="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-surface-overlay
                             rounded-lg flex items-center justify-between">
                      <span>타임스탬프 자동 재생</span>
                      <i [class]="autoPlayTimestamp() ? 'pi pi-check text-primary' : 'pi pi-times text-zinc-500'"></i>
                    </button>
                    <button
                      (click)="toggleShowTimestamps(); showSettingsMenu.set(false)"
                      class="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-surface-overlay
                             rounded-lg flex items-center justify-between">
                      <span>타임스탬프 표시</span>
                      <i [class]="showTimestamps() ? 'pi pi-check text-primary' : 'pi pi-times text-zinc-500'"></i>
                    </button>
                    <div class="border-t border-zinc-700 my-2"></div>
                    <button
                      (click)="regenerateSummary(); showSettingsMenu.set(false)"
                      [disabled]="summarizing()"
                      class="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-surface-overlay
                             rounded-lg flex items-center gap-2 disabled:opacity-50">
                      <i class="pi pi-refresh text-sm"></i>
                      <span>리포트 재생성</span>
                    </button>
                    <button
                      (click)="deleteLecture(); showSettingsMenu.set(false)"
                      class="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10
                             rounded-lg flex items-center gap-2">
                      <i class="pi pi-trash text-sm"></i>
                      <span>삭제</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Sub tabs for detailed report -->
          @if (activeTab() === 'detailed') {
            <div class="px-6 pb-3 flex items-center gap-2">
              <span class="text-xs text-zinc-500 mr-2">추천</span>
              @for (subtab of subTabs; track subtab) {
                <button
                  (click)="activeSubTab.set(subtab)"
                  class="px-3 py-1 rounded-full text-xs border transition-colors"
                  [class]="activeSubTab() === subtab
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'">
                  {{ subtab }}
                </button>
              }
            </div>
          }
        </div>

        <!-- Content Area -->
        <div class="flex-1 overflow-auto">
          @if (loading()) {
            <div class="flex flex-col items-center justify-center h-full text-center p-8">
              <i class="pi pi-spin pi-spinner text-3xl text-primary mb-4"></i>
              <p class="text-zinc-400">노트를 불러오는 중...</p>
            </div>
          } @else if (distillation()?.status === 'processing') {
            <div class="flex flex-col items-center justify-center h-full text-center p-8">
              <div class="relative mb-6">
                <div class="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                  <i class="pi pi-bolt text-2xl text-primary"></i>
                </div>
              </div>
              <h2 class="font-display text-xl font-semibold text-white mb-2">
                AI가 리포트를 작성하고 있습니다
              </h2>
              <p class="text-zinc-400 max-w-md">
                음성을 분석하고 핵심 내용을 추출하고 있습니다. 잠시만 기다려주세요...
              </p>
            </div>
          } @else if (!distillation()?.summaryMd && activeTab() !== 'transcript') {
            <div class="flex flex-col items-center justify-center h-full text-center p-8">
              <div class="w-20 h-20 rounded-full bg-surface-elevated flex items-center justify-center mb-4">
                <i class="pi pi-file-edit text-3xl text-zinc-500"></i>
              </div>
              <h2 class="font-display text-xl font-semibold text-white mb-2">
                아직 리포트가 없습니다
              </h2>
              <p class="text-zinc-400 mb-6">
                AI 분석을 시작하여 상세 리포트를 생성하세요
              </p>
              <button (click)="startSummarize()" class="btn-primary" [disabled]="summarizing()">
                @if (summarizing()) {
                  <i class="pi pi-spin pi-spinner mr-2"></i>
                  분석 중...
                } @else {
                  <i class="pi pi-bolt mr-2"></i>
                  AI 리포트 생성
                }
              </button>
            </div>
          } @else {
            <!-- Report Content -->
            <div class="max-w-4xl mx-auto px-8 py-6">
              @switch (activeTab()) {
                @case ('detailed') {
                  @switch (activeSubTab()) {
                    @case ('인포그래픽') {
                      @if (parsedSections().length > 0) {
                        @for (section of parsedSections(); track section.title; let i = $index) {
                          <section class="mb-10">
                            <div class="flex items-start gap-4 mb-4">
                              <h2 class="text-lg font-display font-semibold text-white flex-1">
                                {{ i + 1 }}. {{ section.title }}
                              </h2>
                              @if (section.timestamp) {
                                <button
                                  (click)="seekToTimestamp(section.timestamp)"
                                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                         bg-surface-elevated border border-zinc-700
                                         text-xs text-zinc-400 hover:text-primary hover:border-primary/50 transition-colors">
                                  <i class="pi pi-play text-xs"></i>
                                  <span class="font-mono">{{ section.timestamp }}</span>
                                </button>
                              }
                            </div>
                            <div class="pl-4 border-l-2 border-zinc-700 space-y-3">
                              @for (item of section.items; track $index) {
                                <div class="text-zinc-300 leading-relaxed">
                                  @if (item.type === 'heading') {
                                    <h3 class="text-base font-semibold text-white mt-4 mb-2">{{ item.content }}</h3>
                                  } @else if (item.type === 'bullet') {
                                    <div class="flex gap-2">
                                      <span class="text-primary mt-1">•</span>
                                      <span [innerHTML]="highlightKeywords(item.content)"></span>
                                    </div>
                                  } @else if (item.type === 'quote') {
                                    <blockquote class="pl-4 border-l-2 border-primary/50 italic text-zinc-400 my-3">"{{ item.content }}"</blockquote>
                                  } @else if (item.type === 'timestamp-item' && item.timestamp) {
                                    <div class="flex gap-3 items-start">
                                      <button (click)="seekToTimestamp(item.timestamp!)"
                                        class="shrink-0 px-2 py-1 rounded bg-surface-elevated border border-zinc-700
                                               text-xs font-mono text-zinc-400 hover:text-primary hover:border-primary/50 transition-colors">
                                        {{ item.timestamp }}
                                      </button>
                                      <span [innerHTML]="highlightKeywords(item.content)"></span>
                                    </div>
                                  } @else {
                                    <p [innerHTML]="highlightKeywords(item.content)"></p>
                                  }
                                </div>
                              }
                            </div>
                          </section>
                        }
                      } @else {
                        <article class="prose prose-invert prose-zinc max-w-none
                                      prose-headings:font-display prose-headings:font-semibold
                                      prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                                      prose-p:text-zinc-300 prose-p:leading-relaxed
                                      prose-strong:text-primary prose-strong:font-semibold
                                      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                                      prose-li:text-zinc-300 prose-li:marker:text-primary">
                          <div [innerHTML]="renderedSummary()"></div>
                        </article>
                      }
                    }
                    @case ('인용리포트') {
                      <div class="space-y-4">
                        <div class="bg-surface-elevated rounded-xl border border-zinc-700 p-6">
                          <h2 class="font-display text-lg font-semibold text-white mb-6 flex items-center gap-2">
                            <i class="pi pi-comment text-primary"></i>
                            주요 인용문
                          </h2>
                          @if (extractedQuotes().length > 0) {
                            <div class="space-y-4">
                              @for (quote of extractedQuotes(); track $index) {
                                <div class="relative pl-6 py-3 border-l-4 border-primary/40 bg-surface-overlay/30 rounded-r-lg">
                                  <i class="pi pi-quote-left absolute left-2 top-3 text-primary/40 text-xs"></i>
                                  <p class="text-zinc-200 italic leading-relaxed">{{ quote.content }}</p>
                                  @if (quote.timestamp) {
                                    <button (click)="seekToTimestamp(quote.timestamp)"
                                      class="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded
                                             bg-surface-elevated border border-zinc-700
                                             text-xs text-zinc-400 hover:text-primary hover:border-primary/50 transition-colors">
                                      <i class="pi pi-play text-xs"></i>
                                      <span class="font-mono">{{ quote.timestamp }}</span>
                                    </button>
                                  }
                                </div>
                              }
                            </div>
                          } @else {
                            <p class="text-zinc-500 text-center py-8">인용문이 없습니다</p>
                          }
                        </div>
                      </div>
                    }
                    @case ('액션아이템') {
                      <div class="space-y-4">
                        <div class="bg-surface-elevated rounded-xl border border-zinc-700 p-6">
                          <h2 class="font-display text-lg font-semibold text-white mb-6 flex items-center gap-2">
                            <i class="pi pi-check-square text-primary"></i>
                            액션 아이템
                          </h2>
                          @if (extractedActions().length > 0) {
                            <div class="space-y-3">
                              @for (action of extractedActions(); track $index) {
                                <div class="flex items-start gap-3 p-3 rounded-lg bg-surface-overlay/30 border border-zinc-700/50">
                                  <div [class]="'w-5 h-5 rounded-full flex items-center justify-center shrink-0 ' +
                                    (action.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                     action.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                     'bg-green-500/20 text-green-400')">
                                    <i class="pi pi-check text-xs"></i>
                                  </div>
                                  <div class="flex-1">
                                    <p class="text-zinc-200">{{ action.content }}</p>
                                    <span [class]="'text-xs mt-1 inline-block px-2 py-0.5 rounded ' +
                                      (action.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                                       action.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                                       'bg-green-500/10 text-green-400')">
                                      {{ action.priority === 'high' ? '높음' : action.priority === 'medium' ? '중간' : '낮음' }}
                                    </span>
                                  </div>
                                </div>
                              }
                            </div>
                          } @else {
                            <p class="text-zinc-500 text-center py-8">액션 아이템이 없습니다</p>
                          }
                        </div>
                      </div>
                    }
                    @case ('배경지식') {
                      <div class="space-y-4">
                        <div class="bg-surface-elevated rounded-xl border border-zinc-700 p-6">
                          <h2 class="font-display text-lg font-semibold text-white mb-6 flex items-center gap-2">
                            <i class="pi pi-book text-primary"></i>
                            배경 지식
                          </h2>
                          @if (backgroundKnowledge().length > 0) {
                            <div class="space-y-4">
                              @for (item of backgroundKnowledge(); track $index) {
                                <div class="p-4 rounded-lg bg-surface-overlay/30 border border-zinc-700/50">
                                  <h3 class="font-semibold text-white mb-2 flex items-center gap-2">
                                    <i class="pi pi-lightbulb text-primary text-sm"></i>
                                    {{ item.term }}
                                  </h3>
                                  <p class="text-zinc-300 text-sm leading-relaxed">{{ item.explanation }}</p>
                                </div>
                              }
                            </div>
                          } @else {
                            <p class="text-zinc-500 text-center py-8">배경 지식이 없습니다</p>
                          }
                        </div>
                        @if (learningKeywords().length > 0) {
                          <div class="bg-surface-elevated rounded-xl border border-zinc-700 p-6">
                            <h2 class="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
                              <i class="pi pi-search text-primary"></i>
                              추가 학습 키워드
                            </h2>
                            <div class="flex flex-wrap gap-2">
                              @for (keyword of learningKeywords(); track keyword) {
                                <span class="px-3 py-1.5 rounded-full bg-zinc-700/50 text-zinc-300 text-sm
                                             hover:bg-primary/20 hover:text-primary cursor-pointer transition-colors">
                                  {{ keyword }}
                                </span>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    }
                  }
                }
                @case ('summary') {
                  <!-- Key Points Summary -->
                  <div class="space-y-6">
                    <div class="bg-surface-elevated rounded-xl border border-zinc-700 p-6">
                      <h2 class="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <i class="pi pi-star text-primary"></i>
                        핵심 포인트
                      </h2>
                      <div class="space-y-3">
                        @for (point of keyPoints(); track $index; let i = $index) {
                          <div class="flex gap-3">
                            <span class="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm
                                        flex items-center justify-center shrink-0 font-medium">
                              {{ i + 1 }}
                            </span>
                            <p class="text-zinc-300 leading-relaxed">{{ point }}</p>
                          </div>
                        }
                      </div>
                    </div>

                    <!-- Keywords -->
                    @if (distillation()?.tags && distillation()!.tags.length > 0) {
                      <div class="bg-surface-elevated rounded-xl border border-zinc-700 p-6">
                        <h2 class="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <i class="pi pi-tag text-primary"></i>
                          핵심 키워드
                        </h2>
                        <div class="flex flex-wrap gap-2">
                          @for (tag of distillation()?.tags; track tag) {
                            <span class="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm border border-primary/30">
                              {{ tag }}
                            </span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
                @case ('transcript') {
                  <!-- Full Transcript -->
                  <div class="space-y-4">
                    @if (distillation()?.fullTranscript) {
                      <div class="bg-surface-elevated rounded-xl border border-zinc-700 p-6">
                        <h2 class="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <i class="pi pi-file-edit text-primary"></i>
                          전체 스크립트
                        </h2>
                        <div class="text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                          {{ distillation()?.fullTranscript }}
                        </div>
                      </div>
                    } @else {
                      <div class="text-center py-16">
                        <div class="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center mx-auto mb-4">
                          <i class="pi pi-file-edit text-2xl text-zinc-500"></i>
                        </div>
                        <p class="text-zinc-400">스크립트가 없습니다</p>
                      </div>
                    }
                  </div>
                }
              }
            </div>

            <!-- Export Toolbar (Lilys AI style) -->
            @if (distillation()?.summaryMd) {
              <div class="fixed bottom-6 left-1/2 transform -translate-x-1/2 md:left-auto md:translate-x-0
                          md:relative md:bottom-auto md:mt-8 md:mb-4 z-40">
                <div class="flex items-center gap-1 px-2 py-1.5 rounded-full bg-surface-elevated border border-zinc-700 shadow-lg">
                  <!-- Feedback Buttons -->
                  <button
                    (click)="giveFeedback('like')"
                    [class]="feedbackGiven() === 'like'
                      ? 'p-2 rounded-full bg-green-500/20 text-green-400'
                      : 'p-2 rounded-full hover:bg-surface-overlay text-zinc-400 hover:text-white transition-colors'"
                    title="좋아요">
                    <i class="pi pi-thumbs-up text-sm"></i>
                  </button>
                  <button
                    (click)="giveFeedback('dislike')"
                    [class]="feedbackGiven() === 'dislike'
                      ? 'p-2 rounded-full bg-red-500/20 text-red-400'
                      : 'p-2 rounded-full hover:bg-surface-overlay text-zinc-400 hover:text-white transition-colors'"
                    title="싫어요">
                    <i class="pi pi-thumbs-down text-sm"></i>
                  </button>

                  <div class="w-px h-5 bg-zinc-700 mx-1"></div>

                  <!-- Regenerate Button -->
                  <button
                    (click)="regenerateSummary()"
                    [disabled]="summarizing()"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-surface-overlay
                           text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                    title="다시 생성">
                    @if (summarizing()) {
                      <i class="pi pi-spin pi-spinner text-sm"></i>
                    } @else {
                      <i class="pi pi-refresh text-sm"></i>
                    }
                    <span class="text-xs hidden sm:inline">다시 생성</span>
                  </button>

                  <div class="w-px h-5 bg-zinc-700 mx-1"></div>

                  <!-- Share Button -->
                  <button
                    (click)="shareReport()"
                    class="p-2 rounded-full hover:bg-surface-overlay text-zinc-400 hover:text-white transition-colors"
                    title="공유">
                    <i class="pi pi-share-alt text-sm"></i>
                  </button>

                  <!-- Download Button with Format Menu -->
                  <div class="relative">
                    <button
                      (click)="showExportMenu.set(!showExportMenu())"
                      class="p-2 rounded-full hover:bg-surface-overlay text-zinc-400 hover:text-white transition-colors"
                      title="다운로드">
                      <i class="pi pi-download text-sm"></i>
                    </button>
                    @if (showExportMenu()) {
                      <div class="absolute bottom-full right-0 mb-2 w-56 bg-surface-elevated border border-zinc-700
                                  rounded-xl shadow-xl overflow-hidden z-50">
                        <div class="py-2">
                          <!-- PDF -->
                          <button
                            (click)="exportAs('pdf'); showExportMenu.set(false)"
                            class="w-full px-4 py-3 text-left hover:bg-surface-overlay flex items-center justify-between">
                            <div>
                              <div class="text-sm font-medium text-white">PDF</div>
                              <div class="text-xs text-zinc-500">문서 전송에 가장 적합</div>
                            </div>
                            <i class="pi pi-check text-primary text-sm"></i>
                          </button>
                          <!-- DOCX -->
                          <button
                            (click)="exportAs('docx'); showExportMenu.set(false)"
                            class="w-full px-4 py-3 text-left hover:bg-surface-overlay">
                            <div class="text-sm font-medium text-white">DOCX</div>
                            <div class="text-xs text-zinc-500">마이크로소프트 워드 문서 형식</div>
                          </button>
                          <!-- JSON -->
                          <button
                            (click)="exportAs('json'); showExportMenu.set(false)"
                            class="w-full px-4 py-3 text-left hover:bg-surface-overlay">
                            <div class="text-sm font-medium text-white">JSON</div>
                            <div class="text-xs text-zinc-500">프로그래밍 데이터로 적합</div>
                          </button>
                          <!-- MARKDOWN -->
                          <button
                            (click)="exportAs('md'); showExportMenu.set(false)"
                            class="w-full px-4 py-3 text-left hover:bg-surface-overlay">
                            <div class="text-sm font-medium text-white">MARKDOWN</div>
                            <div class="text-xs text-zinc-500">리포트로 내보내기 적합</div>
                          </button>
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Copy Button -->
                  <button
                    (click)="copySummaryToClipboard()"
                    class="p-2 rounded-full hover:bg-surface-overlay text-zinc-400 hover:text-white transition-colors relative"
                    title="복사">
                    @if (showCopySuccess()) {
                      <i class="pi pi-check text-sm text-green-400"></i>
                    } @else {
                      <i class="pi pi-copy text-sm"></i>
                    }
                  </button>
                </div>
              </div>
            }
          }
        </div>
      </main>

      <!-- Agent D Panel -->
      @if (showAgentPanel()) {
        <aside class="fixed md:relative inset-0 md:inset-auto w-full md:w-[380px] border-l border-zinc-800 flex flex-col bg-surface-elevated z-50 md:z-auto md:shrink-0">
          <div class="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span class="text-white font-bold text-sm">D</span>
              </div>
              <span class="font-semibold text-white">Agent D</span>
            </div>
            <div class="flex items-center gap-1">
              @if (chatMessages().length > 0) {
                <button
                  (click)="resetChat()"
                  class="p-1.5 rounded-lg hover:bg-surface-overlay transition-colors"
                  title="새 대화">
                  <i class="pi pi-refresh text-zinc-400 hover:text-white"></i>
                </button>
              }
              <button
                (click)="toggleAgentPanel()"
                class="p-1.5 rounded-lg hover:bg-surface-overlay transition-colors"
                title="닫기">
                <i class="pi pi-times text-zinc-400 hover:text-white"></i>
              </button>
            </div>
          </div>

          <!-- Chat Messages -->
          <div class="flex-1 overflow-auto p-4 space-y-4" #chatContainer>
            @for (msg of chatMessages(); track $index) {
              <div [class]="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
                @if (msg.role === 'user') {
                  <div class="bg-primary text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[85%]">
                    <p class="text-sm whitespace-pre-wrap">{{ msg.content }}</p>
                  </div>
                } @else {
                  <div class="bg-surface-overlay text-zinc-100 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[85%] agent-message">
                    <div class="text-sm agent-prose" [innerHTML]="renderChatMessage(msg.content)"></div>
                  </div>
                }
              </div>
            }

            @if (chatMessages().length === 0) {
              <div class="text-center py-8">
                <p class="text-sm text-zinc-500 mb-4">
                  이 강의에 대해 무엇이든 물어보세요
                </p>
                <div class="space-y-2">
                  @for (suggestion of suggestions; track suggestion) {
                    <button
                      (click)="sendMessage(suggestion)"
                      class="block w-full text-left px-3 py-2 text-sm text-zinc-400
                             bg-surface-elevated rounded-lg border border-zinc-700
                             hover:border-primary hover:text-primary transition-colors">
                      {{ suggestion }}
                    </button>
                  }
                </div>
              </div>
            }

            @if (chatLoading()) {
              <div class="flex justify-start">
                <div class="bg-surface-overlay text-zinc-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div class="flex gap-1">
                    <span class="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"></span>
                    <span class="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></span>
                    <span class="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Chat Input -->
          <div class="p-4 border-t border-zinc-800">
            <div class="flex items-center gap-2">
              <input
                [(ngModel)]="chatInput"
                (keydown.enter)="sendMessage(chatInput())"
                placeholder="메시지를 입력하세요..."
                class="input flex-1 text-sm" />
              <button
                (click)="sendMessage(chatInput())"
                [disabled]="!chatInput() || chatLoading()"
                class="btn-primary p-2.5">
                <i class="pi pi-send"></i>
              </button>
            </div>
          </div>
        </aside>
      }

      <!-- Category Dropdown Overlay -->
      @if (showCategoryDropdown()) {
        <div (click)="showCategoryDropdown.set(false)" class="fixed inset-0 z-40"></div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }

    .animate-bounce {
      animation: bounce 0.6s infinite;
    }

    /* Agent D 채팅 마크다운 스타일 */
    .agent-prose {
      line-height: 1.6;
    }

    .agent-prose ::ng-deep h1,
    .agent-prose ::ng-deep h2,
    .agent-prose ::ng-deep h3,
    .agent-prose ::ng-deep h4 {
      font-weight: 600;
      margin-top: 0.75em;
      margin-bottom: 0.25em;
      color: #fff;
    }

    .agent-prose ::ng-deep h1 { font-size: 1.25em; }
    .agent-prose ::ng-deep h2 { font-size: 1.125em; }
    .agent-prose ::ng-deep h3 { font-size: 1em; }

    .agent-prose ::ng-deep p {
      margin: 0.4em 0;
    }

    .agent-prose ::ng-deep p:first-child {
      margin-top: 0;
    }

    .agent-prose ::ng-deep p:last-child {
      margin-bottom: 0;
    }

    .agent-prose ::ng-deep strong,
    .agent-prose ::ng-deep b {
      font-weight: 600;
      color: #06b6d4;
    }

    .agent-prose ::ng-deep em,
    .agent-prose ::ng-deep i {
      font-style: italic;
      color: #d4d4d8;
    }

    .agent-prose ::ng-deep ul,
    .agent-prose ::ng-deep ol {
      margin: 0.5em 0;
      padding-left: 1.25em;
    }

    .agent-prose ::ng-deep li {
      margin: 0.2em 0;
    }

    .agent-prose ::ng-deep ul li {
      list-style-type: disc;
    }

    .agent-prose ::ng-deep ol li {
      list-style-type: decimal;
    }

    .agent-prose ::ng-deep blockquote {
      border-left: 3px solid #06b6d4;
      padding-left: 0.75em;
      margin: 0.5em 0;
      color: #a1a1aa;
      font-style: italic;
    }

    .agent-prose ::ng-deep code {
      background: rgba(39, 39, 42, 0.8);
      padding: 0.1em 0.3em;
      border-radius: 0.25em;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85em;
    }

    .agent-prose ::ng-deep pre {
      background: rgba(39, 39, 42, 0.8);
      padding: 0.6em 0.8em;
      border-radius: 0.5em;
      overflow-x: auto;
      margin: 0.5em 0;
    }

    .agent-prose ::ng-deep pre code {
      background: transparent;
      padding: 0;
    }

    .agent-prose ::ng-deep hr {
      border: none;
      border-top: 1px solid #3f3f46;
      margin: 0.75em 0;
    }

    .agent-prose ::ng-deep a {
      color: #06b6d4;
      text-decoration: underline;
    }

    .agent-prose ::ng-deep table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.5em 0;
      font-size: 0.9em;
    }

    .agent-prose ::ng-deep th,
    .agent-prose ::ng-deep td {
      border: 1px solid #3f3f46;
      padding: 0.4em 0.6em;
      text-align: left;
    }

    .agent-prose ::ng-deep th {
      background: rgba(39, 39, 42, 0.5);
      font-weight: 600;
    }
  `]
})
export class LectureDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);

  @ViewChild('audioPlayer') audioPlayerRef!: ElementRef<HTMLAudioElement>;
  @ViewChild('progressBar') progressBarRef!: ElementRef<HTMLDivElement>;

  Math = Math;

  distillation = signal<Distillation | null>(null);
  loading = signal(true);
  summarizing = signal(false);
  isEditingTitle = signal(false);
  editedTitle = '';
  isComposingTitle = false; // 한글 IME 조합 상태 추적

  // Tabs
  activeTab = signal<ReportTab>('detailed');
  activeSubTab = signal<SubTab>('인포그래픽');

  tabs: { id: ReportTab; label: string }[] = [
    { id: 'detailed', label: '자세한 리포트' },
    { id: 'summary', label: '핵심 리포트' },
    { id: 'transcript', label: '스크립트' },
  ];

  subTabs: SubTab[] = ['인포그래픽', '인용리포트', '액션아이템', '배경지식'];

  // Audio player state
  isPlaying = signal(false);
  currentTime = signal(0);
  audioDuration = signal(0);
  progress = signal(0);
  playbackSpeed = signal(1);
  isMetadataLoaded = signal(false);

  // Waveform visualization
  waveformBars = Array.from({ length: 40 }, (_, i) => i);

  // Mobile state
  showMobilePlayer = signal(false);

  // Agent panel state
  showAgentPanel = signal(false);
  chatInput = signal('');
  chatMessages = signal<ChatMessage[]>([]);
  chatLoading = signal(false);

  suggestions = [
    '이 강의의 핵심 포인트 3가지를 알려줘',
    '초보자도 이해할 수 있게 설명해줘',
    '관련 퀴즈 3문제 내줘',
  ];

  // Settings state
  showSettingsMenu = signal(false);
  autoPlayTimestamp = signal(true);
  showTimestamps = signal(true);

  // Export toolbar state
  feedbackGiven = signal<'like' | 'dislike' | null>(null);
  showCopySuccess = signal(false);
  showExportMenu = signal(false);
  showSidebarExportMenu = signal(false);

  // Category state
  categories = signal<CategoryWithCount[]>([]);
  showCategoryDropdown = signal(false);
  savingCategory = signal(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDistillation(id);
    }
    this.loadCategories();
  }

  loadCategories() {
    this.api.getCategories().subscribe({
      next: (response) => {
        this.categories.set(response.data);
      },
      error: (error) => {
        console.error('Failed to load categories:', error);
      }
    });
  }

  // Get current category (either AI suggested or confirmed)
  currentCategory = computed(() => {
    const d = this.distillation();
    if (!d?.aiSuggestedCategoryId) return null;
    return this.categories().find(c => c.id === d.aiSuggestedCategoryId) || null;
  });

  // Check if category is from AI suggestion (not confirmed)
  isAISuggested = computed(() => {
    const d = this.distillation();
    return d?.aiSuggestedCategoryId && !d?.categoryConfirmed;
  });

  // Update category
  updateCategory(categoryId: string) {
    const d = this.distillation();
    if (!d) return;

    this.savingCategory.set(true);
    this.api.confirmCategory(d.id, { categoryId }).subscribe({
      next: (response) => {
        this.distillation.set(response.data);
        this.savingCategory.set(false);
        this.showCategoryDropdown.set(false);
      },
      error: (error) => {
        console.error('Failed to update category:', error);
        this.savingCategory.set(false);
      }
    });
  }

  loadDistillation(id: string) {
    this.loading.set(true);
    this.api.getLecture(id).subscribe({
      next: (response) => {
        console.log('📥 Lecture loaded:', {
          id: response.data.id,
          audioPath: response.data.audioPath,
          audioUrl: response.data.audioUrl,
        });
        this.distillation.set(response.data);
        this.loading.set(false);
        if (this.showAgentPanel()) {
          this.loadChatHistory(id);
        }
      },
      error: (error) => {
        console.error('Failed to load distillation:', error);
        this.loading.set(false);
      }
    });
  }

  loadChatHistory(id: string) {
    this.api.getChatHistory(id).subscribe({
      next: (response) => {
        this.chatMessages.set(response.data);
      },
      error: (error) => {
        console.error('Failed to load chat history:', error);
      }
    });
  }

  // Parse markdown into structured sections
  parsedSections = computed(() => {
    const md = this.distillation()?.summaryMd || '';
    if (!md) return [];

    const sections: Array<{
      title: string;
      timestamp?: string;
      items: Array<{ type: 'heading' | 'bullet' | 'quote' | 'text' | 'timestamp-item'; content: string; timestamp?: string }>;
    }> = [];

    const lines = md.split('\n');
    let currentSection: typeof sections[0] | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Main heading (## or ###)
      const h2Match = trimmed.match(/^#{2,3}\s+(.+)/);
      if (h2Match) {
        if (currentSection) sections.push(currentSection);

        // Extract timestamp if present [00:00:00]
        const timestampMatch = h2Match[1].match(/\[(\d{2}:\d{2}(?::\d{2})?)\]/);
        const title = h2Match[1].replace(/\[(\d{2}:\d{2}(?::\d{2})?)\]/, '').trim();

        currentSection = {
          title,
          timestamp: timestampMatch?.[1],
          items: []
        };
        continue;
      }

      // Sub heading (####)
      const h4Match = trimmed.match(/^#{4,}\s+(.+)/);
      if (h4Match && currentSection) {
        currentSection.items.push({ type: 'heading', content: h4Match[1] });
        continue;
      }

      // Bullet point - check for inline timestamp
      if ((trimmed.startsWith('- ') || trimmed.startsWith('* ')) && currentSection) {
        const bulletContent = trimmed.substring(2);
        const inlineTimestamp = bulletContent.match(/^\[(\d{2}:\d{2}(?::\d{2})?)\]\s*/);
        if (inlineTimestamp) {
          currentSection.items.push({
            type: 'timestamp-item',
            content: bulletContent.replace(/^\[\d{2}:\d{2}(?::\d{2})?\]\s*/, ''),
            timestamp: inlineTimestamp[1]
          });
        } else {
          currentSection.items.push({
            type: 'bullet',
            content: bulletContent
          });
        }
        continue;
      }

      // Quote
      if (trimmed.startsWith('>') && currentSection) {
        currentSection.items.push({
          type: 'quote',
          content: trimmed.substring(1).trim().replace(/^[""]|[""]$/g, '')
        });
        continue;
      }

      // Regular text
      if (currentSection && trimmed) {
        currentSection.items.push({ type: 'text', content: trimmed });
      }
    }

    if (currentSection) sections.push(currentSection);
    return sections;
  });

  // Extract key points from summary
  keyPoints = computed(() => {
    const md = this.distillation()?.summaryMd || '';
    const points: string[] = [];

    // Look for "핵심 정리" or similar sections
    const keySection = md.match(/#{2,3}\s*핵심\s*정리[\s\S]*?(?=#{2,3}|$)/i);
    if (keySection) {
      const bullets = keySection[0].match(/[-*]\s+(.+)/g);
      if (bullets) {
        bullets.forEach(b => {
          points.push(b.replace(/^[-*]\s+/, '').trim());
        });
      }
    }

    // If no key section found, extract first few bullets
    if (points.length === 0) {
      const allBullets = md.match(/[-*]\s+(.+)/g);
      if (allBullets) {
        allBullets.slice(0, 5).forEach(b => {
          points.push(b.replace(/^[-*]\s+/, '').trim());
        });
      }
    }

    return points;
  });

  renderedSummary = computed((): SafeHtml => {
    const md = this.distillation()?.summaryMd || '';
    if (!md) return '';
    const html = marked(md) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  // Extract quotes from summary
  extractedQuotes = computed((): Array<{ content: string; timestamp?: string }> => {
    const md = this.distillation()?.summaryMd || '';
    const quotes: Array<{ content: string; timestamp?: string }> = [];

    // Find quoted text (> or "...")
    const quoteMatches = md.match(/>\s*[""]?([^"\n]+)[""]?|[""]([^"]+)[""]/g);
    if (quoteMatches) {
      quoteMatches.forEach(q => {
        const content = q.replace(/^>\s*[""]?|[""]$/g, '').trim();
        if (content.length > 10) {
          // Try to find associated timestamp
          const lineIndex = md.indexOf(q);
          const nearbyText = md.substring(Math.max(0, lineIndex - 100), lineIndex + q.length + 100);
          const timestampMatch = nearbyText.match(/\[(\d{2}:\d{2}(?::\d{2})?)\]/);
          quotes.push({
            content,
            timestamp: timestampMatch?.[1]
          });
        }
      });
    }

    // Also look for **Insight** or 중요 인용 patterns
    const insightMatches = md.match(/\*\*(?:Insight|인사이트|중요\s*인용)\*\*:\s*([^\n]+)/gi);
    if (insightMatches) {
      insightMatches.forEach(match => {
        const content = match.replace(/\*\*(?:Insight|인사이트|중요\s*인용)\*\*:\s*/i, '').trim();
        if (content && !quotes.some(q => q.content === content)) {
          quotes.push({ content });
        }
      });
    }

    return quotes.slice(0, 10);
  });

  // Extract action items from summary
  extractedActions = computed((): Array<{ content: string; priority: 'high' | 'medium' | 'low' }> => {
    const md = this.distillation()?.summaryMd || '';
    const actions: Array<{ content: string; priority: 'high' | 'medium' | 'low' }> = [];

    // Look for action-related keywords
    const actionPatterns = [
      /[-*]\s*(?:\*\*)?(?:TODO|할\s*일|실행|해야\s*할|Action|액션)(?:\*\*)?[:\s]+([^\n]+)/gi,
      /[-*]\s*~(.+?)~를?\s*(?:해야|하세요|합니다|하기)/gi,
      /[-*]\s*(.+?)(?:을|를)\s*(?:해야|하세요|합니다|해보세요|추천)/gi,
    ];

    actionPatterns.forEach(pattern => {
      const matches = md.matchAll(pattern);
      for (const match of matches) {
        const content = match[1]?.trim();
        if (content && content.length > 5 && !actions.some(a => a.content === content)) {
          // Determine priority based on keywords
          let priority: 'high' | 'medium' | 'low' = 'medium';
          if (/중요|필수|반드시|꼭|urgent|critical/i.test(content)) {
            priority = 'high';
          } else if (/선택|나중에|가능하면|optional/i.test(content)) {
            priority = 'low';
          }
          actions.push({ content, priority });
        }
      }
    });

    // Fallback: extract first few bullet points with action words
    if (actions.length === 0) {
      const bullets = md.match(/[-*]\s+(.+)/g);
      if (bullets) {
        bullets.slice(0, 5).forEach(b => {
          const content = b.replace(/^[-*]\s+/, '').trim();
          if (/해야|하세요|합니다|하기|실행|적용|시도/i.test(content)) {
            actions.push({ content, priority: 'medium' });
          }
        });
      }
    }

    return actions.slice(0, 10);
  });

  // Extract background knowledge terms
  backgroundKnowledge = computed((): Array<{ term: string; explanation: string }> => {
    const md = this.distillation()?.summaryMd || '';
    const knowledge: Array<{ term: string; explanation: string }> = [];

    // Look for definition patterns
    const patterns = [
      /\*\*([^*]+)\*\*[:\s]+([^\n]+)/g,
      /(?:####?\s*)([^:\n]+)[:\s]+([^\n]+)/g,
    ];

    patterns.forEach(pattern => {
      const matches = md.matchAll(pattern);
      for (const match of matches) {
        const term = match[1]?.trim();
        const explanation = match[2]?.trim();
        if (term && explanation && term.length < 50 && explanation.length > 20) {
          if (!knowledge.some(k => k.term === term)) {
            knowledge.push({ term, explanation });
          }
        }
      }
    });

    // Also extract from "핵심 개념" sections
    const conceptSection = md.match(/#{2,4}\s*(?:핵심\s*개념|개념\s*설명|배경\s*지식)[\s\S]*?(?=#{2,3}|$)/i);
    if (conceptSection) {
      const bullets = conceptSection[0].match(/[-*]\s+\*\*([^*]+)\*\*[:\s]+([^\n]+)/g);
      if (bullets) {
        bullets.forEach(b => {
          const termMatch = b.match(/\*\*([^*]+)\*\*/);
          const explanation = b.replace(/^[-*]\s+\*\*[^*]+\*\*[:\s]+/, '').trim();
          if (termMatch && explanation) {
            const term = termMatch[1].trim();
            if (!knowledge.some(k => k.term === term)) {
              knowledge.push({ term, explanation });
            }
          }
        });
      }
    }

    return knowledge.slice(0, 8);
  });

  // Extract learning keywords
  learningKeywords = computed((): string[] => {
    const md = this.distillation()?.summaryMd || '';
    const keywords: string[] = [];

    // Look for "추가 학습 키워드" section
    const keywordSection = md.match(/#{2,4}\s*(?:추가\s*학습\s*키워드|관련\s*키워드|더\s*알아보기)[\s\S]*?(?=#{2,3}|$)/i);
    if (keywordSection) {
      const bullets = keywordSection[0].match(/[-*]\s+([^\n]+)/g);
      if (bullets) {
        bullets.forEach(b => {
          const keyword = b.replace(/^[-*]\s+/, '').trim();
          if (keyword && !keywords.includes(keyword)) {
            keywords.push(keyword);
          }
        });
      }
    }

    // Fallback to tags if no keywords found
    if (keywords.length === 0) {
      const tags = this.distillation()?.tags || [];
      keywords.push(...tags);
    }

    return keywords.slice(0, 10);
  });

  highlightKeywords(text: string): SafeHtml {
    // Bold text between ** or __ becomes highlighted
    let html = text
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-primary font-semibold">$1</strong>')
      .replace(/__([^_]+)__/g, '<strong class="text-primary font-semibold">$1</strong>');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  /**
   * Agent D 채팅 메시지를 마크다운으로 렌더링
   */
  renderChatMessage(content: string): SafeHtml {
    if (!content) return '';
    const html = marked(content) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // Settings methods
  toggleSettingsMenu() {
    this.showSettingsMenu.update(v => !v);
  }

  toggleAutoPlay() {
    this.autoPlayTimestamp.update(v => !v);
  }

  toggleShowTimestamps() {
    this.showTimestamps.update(v => !v);
  }

  regenerateSummary() {
    this.startSummarize();
  }

  // Export toolbar methods
  giveFeedback(type: 'like' | 'dislike') {
    if (this.feedbackGiven() === type) {
      this.feedbackGiven.set(null);
    } else {
      this.feedbackGiven.set(type);
      // TODO: API call to save feedback
    }
  }

  shareReport() {
    const d = this.distillation();
    if (!d) return;

    // Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: d.title || 'Distillai 리포트',
        text: `${d.title} - AI 요약 리포트`,
        url: window.location.href
      }).catch(() => {
        // Fallback: copy URL to clipboard
        this.copyUrlToClipboard();
      });
    } else {
      // Fallback: copy URL to clipboard
      this.copyUrlToClipboard();
    }
  }

  copyUrlToClipboard() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      this.showCopySuccess.set(true);
      setTimeout(() => this.showCopySuccess.set(false), 2000);
    });
  }

  copySummaryToClipboard() {
    const d = this.distillation();
    if (!d) return;

    let content = `# ${d.title}\n\n`;

    if (d.summaryMd) {
      content += d.summaryMd;
    }

    navigator.clipboard.writeText(content).then(() => {
      this.showCopySuccess.set(true);
      setTimeout(() => this.showCopySuccess.set(false), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  exportAs(format: 'md' | 'txt' | 'html' | 'json' | 'pdf' | 'docx') {
    const d = this.distillation();
    if (!d) return;

    const title = d.title || 'summary';
    const dateStr = d.createdAt
      ? new Date(d.createdAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const baseFilename = `${title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${dateStr}`;

    // PDF는 브라우저 인쇄 기능 사용
    if (format === 'pdf') {
      this.exportAsPdf(d);
      return;
    }

    // DOCX는 Word 호환 HTML 생성
    if (format === 'docx') {
      this.exportAsDocx(d, baseFilename);
      return;
    }

    let content: string;
    let mimeType: string;
    let extension: string;

    switch (format) {
      case 'md':
        content = this.generateMarkdownContent(d);
        mimeType = 'text/markdown;charset=utf-8';
        extension = 'md';
        break;
      case 'txt':
        content = this.generateTextContent(d);
        mimeType = 'text/plain;charset=utf-8';
        extension = 'txt';
        break;
      case 'html':
        content = this.generateHtmlContent(d);
        mimeType = 'text/html;charset=utf-8';
        extension = 'html';
        break;
      case 'json':
        content = this.generateJsonContent(d);
        mimeType = 'application/json;charset=utf-8';
        extension = 'json';
        break;
      default:
        return;
    }

    const filename = `${baseFilename}.${extension}`;
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private exportAsPdf(d: Distillation) {
    // PDF 내보내기용 새 창 열기
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('팝업이 차단되었습니다. 팝업을 허용해주세요.');
      return;
    }

    const summaryHtml = d.summaryMd ? marked(d.summaryMd) as string : '<p>요약이 없습니다</p>';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>${d.title || 'Distillai 리포트'}</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.7;
            padding: 40px;
            color: #1a1a1a;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 { font-size: 24px; margin-bottom: 16px; color: #111; border-bottom: 2px solid #06b6d4; padding-bottom: 12px; }
          h2 { font-size: 18px; margin-top: 24px; margin-bottom: 12px; color: #06b6d4; }
          h3 { font-size: 16px; margin-top: 20px; margin-bottom: 8px; color: #333; }
          p { margin-bottom: 12px; }
          ul, ol { margin-left: 24px; margin-bottom: 12px; }
          li { margin-bottom: 6px; }
          .meta { color: #666; font-size: 14px; margin-bottom: 24px; }
          .tags { margin-bottom: 20px; }
          .tag { display: inline-block; background: #e0f7fa; color: #0097a7; padding: 4px 12px; border-radius: 16px; font-size: 12px; margin-right: 8px; }
          blockquote { border-left: 4px solid #06b6d4; padding-left: 16px; margin: 16px 0; color: #555; font-style: italic; }
          code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
          pre { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; }
          hr { border: none; border-top: 1px solid #e0e0e0; margin: 32px 0; }
          .transcript { background: #fafafa; padding: 20px; border-radius: 8px; font-family: monospace; font-size: 13px; white-space: pre-wrap; margin-top: 24px; }
          .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${d.title || '제목 없음'}</h1>
        <div class="meta">생성일: ${this.formatDate(d.createdAt)} | 길이: ${this.formatDuration(d.durationSeconds)}</div>
        ${d.tags && d.tags.length > 0 ? `<div class="tags">${d.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
        <div class="content">${summaryHtml}</div>
        ${d.fullTranscript ? `<hr><h2>전체 스크립트</h2><div class="transcript">${d.fullTranscript}</div>` : ''}
        <div class="footer">Generated by Distillai</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }

  private exportAsDocx(d: Distillation, baseFilename: string) {
    const summaryHtml = d.summaryMd ? marked(d.summaryMd) as string : '<p>요약이 없습니다</p>';

    // Word 호환 HTML (MIME type으로 .doc 파일 생성)
    const docContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <title>${d.title || 'Distillai 리포트'}</title>
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
          h1 { font-size: 24pt; color: #111; border-bottom: 2px solid #06b6d4; padding-bottom: 8pt; }
          h2 { font-size: 16pt; color: #06b6d4; margin-top: 16pt; }
          h3 { font-size: 14pt; color: #333; margin-top: 12pt; }
          p { margin-bottom: 8pt; }
          ul, ol { margin-left: 20pt; }
          .meta { color: #666; font-size: 10pt; margin-bottom: 16pt; }
          .tag { background: #e0f7fa; color: #0097a7; padding: 2pt 8pt; margin-right: 4pt; }
          blockquote { border-left: 3pt solid #06b6d4; padding-left: 12pt; color: #555; font-style: italic; }
        </style>
      </head>
      <body>
        <h1>${d.title || '제목 없음'}</h1>
        <p class="meta">생성일: ${this.formatDate(d.createdAt)} | 길이: ${this.formatDuration(d.durationSeconds)}</p>
        ${d.tags && d.tags.length > 0 ? `<p>${d.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}</p>` : ''}
        <hr>
        ${summaryHtml}
        ${d.fullTranscript ? `<hr><h2>전체 스크립트</h2><p style="font-family: monospace; white-space: pre-wrap;">${d.fullTranscript}</p>` : ''}
        <hr>
        <p style="text-align: center; color: #999; font-size: 9pt;">Generated by Distillai</p>
      </body>
      </html>
    `;

    const blob = new Blob([docContent], { type: 'application/msword' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseFilename}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private generateMarkdownContent(d: Distillation): string {
    let content = `# ${d.title}\n\n`;
    content += `> 생성일: ${this.formatDate(d.createdAt)}\n`;
    content += `> 길이: ${this.formatDuration(d.durationSeconds)}\n\n`;

    if (d.tags && d.tags.length > 0) {
      content += `**태그:** ${d.tags.join(', ')}\n\n`;
    }

    content += `---\n\n`;

    if (d.summaryMd) {
      content += d.summaryMd;
    } else {
      content += '(요약이 아직 생성되지 않았습니다)';
    }

    if (d.fullTranscript) {
      content += `\n\n---\n\n## 전체 스크립트\n\n${d.fullTranscript}`;
    }

    return content;
  }

  private generateTextContent(d: Distillation): string {
    let content = `${d.title}\n${'='.repeat(d.title?.length || 10)}\n\n`;
    content += `생성일: ${this.formatDate(d.createdAt)}\n`;
    content += `길이: ${this.formatDuration(d.durationSeconds)}\n\n`;

    if (d.tags && d.tags.length > 0) {
      content += `태그: ${d.tags.join(', ')}\n\n`;
    }

    content += `${'─'.repeat(40)}\n\n`;

    if (d.summaryMd) {
      // Remove markdown syntax for plain text
      content += d.summaryMd
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    }

    if (d.fullTranscript) {
      content += `\n\n${'─'.repeat(40)}\n\n전체 스크립트\n${'─'.repeat(40)}\n\n${d.fullTranscript}`;
    }

    return content;
  }

  private generateHtmlContent(d: Distillation): string {
    const summaryHtml = d.summaryMd ? marked(d.summaryMd) as string : '<p>요약이 아직 생성되지 않았습니다</p>';

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${d.title || 'Distillai 리포트'}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background: #121212;
      color: #e4e4e7;
    }
    h1 { color: #fff; border-bottom: 2px solid #06b6d4; padding-bottom: 0.5rem; }
    h2, h3 { color: #06b6d4; }
    .meta { color: #71717a; font-size: 0.875rem; margin-bottom: 1rem; }
    .tags { margin-bottom: 1rem; }
    .tag {
      display: inline-block;
      background: rgba(6, 182, 212, 0.1);
      color: #06b6d4;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      margin-right: 0.5rem;
    }
    hr { border: none; border-top: 1px solid #3f3f46; margin: 2rem 0; }
    blockquote {
      border-left: 3px solid #06b6d4;
      padding-left: 1rem;
      margin-left: 0;
      color: #a1a1aa;
      font-style: italic;
    }
    code {
      background: #27272a;
      padding: 0.1rem 0.3rem;
      border-radius: 0.25rem;
      font-family: 'JetBrains Mono', monospace;
    }
    pre {
      background: #27272a;
      padding: 1rem;
      border-radius: 0.5rem;
      overflow-x: auto;
    }
    .transcript {
      background: #1f1f23;
      padding: 1.5rem;
      border-radius: 0.5rem;
      white-space: pre-wrap;
      font-family: monospace;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <h1>${d.title || '제목 없음'}</h1>
  <div class="meta">
    생성일: ${this.formatDate(d.createdAt)} | 길이: ${this.formatDuration(d.durationSeconds)}
  </div>
  ${d.tags && d.tags.length > 0 ? `
  <div class="tags">
    ${d.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
  </div>
  ` : ''}
  <hr>
  <div class="content">
    ${summaryHtml}
  </div>
  ${d.fullTranscript ? `
  <hr>
  <h2>전체 스크립트</h2>
  <div class="transcript">${d.fullTranscript}</div>
  ` : ''}
  <hr>
  <p style="color: #71717a; font-size: 0.75rem; text-align: center;">
    Generated by Distillai - AI 지식 증류 플랫폼
  </p>
</body>
</html>`;
  }

  private generateJsonContent(d: Distillation): string {
    return JSON.stringify({
      title: d.title,
      createdAt: d.createdAt,
      durationSeconds: d.durationSeconds,
      tags: d.tags || [],
      summary: d.summaryMd || null,
      transcript: d.fullTranscript || null,
      status: d.status,
      exportedAt: new Date().toISOString(),
      source: 'Distillai'
    }, null, 2);
  }

  deleteLecture() {
    const d = this.distillation();
    if (!d) return;

    if (confirm('정말로 이 노트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      this.api.deleteLecture(d.id).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('Failed to delete lecture:', error);
          alert('삭제에 실패했습니다. 다시 시도해주세요.');
        }
      });
    }
  }

  startEditTitle() {
    this.editedTitle = this.distillation()?.title || '';
    this.isEditingTitle.set(true);
    this.isComposingTitle = false;
  }

  onTitleCompositionEnd(event: Event) {
    // IME 조합 완료 시 최신 값으로 업데이트
    const input = event.target as HTMLInputElement;
    this.editedTitle = input.value;
    this.isComposingTitle = false;
  }

  onTitleBlur(event: Event) {
    const input = event.target as HTMLInputElement;
    // setTimeout으로 지연시켜 compositionend가 먼저 실행되도록 함
    setTimeout(() => {
      this.editedTitle = input.value;
      this.saveTitle();
    }, 0);
  }

  saveTitle() {
    const d = this.distillation();
    if (d && this.editedTitle.trim()) {
      this.api.updateLecture(d.id, { title: this.editedTitle.trim() }).subscribe({
        next: (response) => {
          this.distillation.set(response.data);
        },
        error: (error) => {
          console.error('Failed to update title:', error);
        }
      });
    }
    this.isEditingTitle.set(false);
  }

  startSummarize() {
    const d = this.distillation();
    if (!d) return;

    this.summarizing.set(true);
    this.api.summarizeLecture(d.id).subscribe({
      next: (response) => {
        this.distillation.set(response.data);
        this.summarizing.set(false);
      },
      error: (error) => {
        console.error('Failed to summarize:', error);
        this.summarizing.set(false);
      }
    });
  }

  togglePlay() {
    const audio = this.audioPlayerRef?.nativeElement;
    if (!audio) return;

    if (this.isPlaying()) {
      audio.pause();
      this.isPlaying.set(false);
    } else {
      audio.play().catch(err => console.error('Failed to play:', err));
      this.isPlaying.set(true);
    }
  }

  seekAudio(event: MouseEvent) {
    const audio = this.audioPlayerRef?.nativeElement;
    const progressBar = this.progressBarRef?.nativeElement;
    const duration = this.audioDuration();
    if (!audio || !progressBar || duration <= 0) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    if (isFinite(newTime)) {
      audio.currentTime = newTime;
      this.currentTime.set(newTime);
      this.progress.set(percentage * 100);
    }
  }

  seekToTimestamp(timestamp: string) {
    const audio = this.audioPlayerRef?.nativeElement;
    const duration = this.audioDuration();
    if (!audio || duration <= 0) return;

    const parts = timestamp.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    }

    if (isFinite(seconds) && seconds <= duration) {
      audio.currentTime = seconds;
      this.currentTime.set(seconds);
      this.progress.set((seconds / duration) * 100);
      if (!this.isPlaying()) {
        this.togglePlay();
      }
    }
  }

  cycleSpeed() {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(this.playbackSpeed());
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];
    this.playbackSpeed.set(newSpeed);

    const audio = this.audioPlayerRef?.nativeElement;
    if (audio) {
      audio.playbackRate = newSpeed;
    }
  }

  onTimeUpdate() {
    const audio = this.audioPlayerRef?.nativeElement;
    const duration = this.audioDuration();
    if (!audio || !this.isMetadataLoaded() || duration <= 0) return;

    this.currentTime.set(audio.currentTime);
    const newProgress = (audio.currentTime / duration) * 100;
    this.progress.set(Math.max(0, Math.min(100, newProgress)));
  }

  onAudioEnded() {
    this.isPlaying.set(false);
    this.progress.set(0);
    this.currentTime.set(0);
  }

  onLoadStart() {
    this.progress.set(0);
    this.currentTime.set(0);
    this.isPlaying.set(false);
    this.isMetadataLoaded.set(false);
  }

  onMetadataLoaded() {
    this.trySetDuration();
  }

  onDurationChange() {
    this.trySetDuration();
  }

  onLoadedData() {
    this.trySetDuration();
  }

  private trySetDuration() {
    const audio = this.audioPlayerRef?.nativeElement;
    if (!audio) return;

    // 브라우저에서 유효한 duration을 얻은 경우
    if (isFinite(audio.duration) && audio.duration > 0) {
      this.audioDuration.set(audio.duration);
      this.progress.set(0);
      this.currentTime.set(0);
      this.isMetadataLoaded.set(true);
      return;
    }

    // WebM 파일의 경우 duration이 Infinity일 수 있음
    // 백엔드에서 저장한 durationSeconds를 fallback으로 사용
    const fallbackDuration = this.distillation()?.durationSeconds;
    if (fallbackDuration && fallbackDuration > 0) {
      this.audioDuration.set(fallbackDuration);
      this.progress.set(0);
      this.currentTime.set(0);
      this.isMetadataLoaded.set(true);
    }
  }

  onAudioError(event: Event) {
    const audio = event.target as HTMLAudioElement;
    const error = audio.error;
    console.error('🔴 Audio load error:', {
      code: error?.code,
      message: error?.message,
      src: audio.src,
    });
  }

  ngOnDestroy() {
    const audio = this.audioPlayerRef?.nativeElement;
    if (audio) {
      audio.pause();
    }
  }

  toggleAgentPanel() {
    this.showAgentPanel.update(v => !v);
    const d = this.distillation();
    if (this.showAgentPanel() && d) {
      this.loadChatHistory(d.id);
    }
  }

  /**
   * 채팅 초기화 - 서버에서도 대화 기록 삭제
   */
  resetChat() {
    const d = this.distillation();
    if (!d) return;

    // 로컬 상태 먼저 초기화
    this.chatMessages.set([]);
    this.chatInput.set('');

    // 서버에서 대화 기록 삭제
    this.api.clearChatHistory(d.id).subscribe({
      error: (error) => {
        console.error('Failed to clear chat history:', error);
      }
    });
  }

  sendMessage(content: string) {
    if (!content.trim()) return;
    const d = this.distillation();
    if (!d) return;

    this.chatMessages.update(msgs => [...msgs, {
      id: 'temp-' + Date.now(),
      userId: '',
      distillationId: d.id,
      role: 'user' as const,
      content: content.trim(),
      createdAt: new Date().toISOString()
    }]);
    this.chatInput.set('');
    this.chatLoading.set(true);

    this.api.sendChatMessage(d.id, content.trim()).subscribe({
      next: (response) => {
        this.chatMessages.update(msgs => [...msgs, response.data]);
        this.chatLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to send message:', error);
        this.chatLoading.set(false);
        this.chatMessages.update(msgs => [...msgs, {
          id: 'error-' + Date.now(),
          userId: '',
          distillationId: d.id,
          role: 'assistant' as const,
          content: '죄송합니다. 메시지 전송에 실패했습니다. 다시 시도해주세요.',
          createdAt: new Date().toISOString()
        }]);
      }
    });
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatDuration(seconds?: number | null): string {
    if (!seconds) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  /**
   * 녹음 파일 다운로드
   */
  downloadAudio() {
    const d = this.distillation();
    if (!d) return;

    const audioUrl = d.audioUrl;
    if (!audioUrl) {
      console.error('No audio URL available');
      return;
    }

    // 파일명 생성 (제목 + 날짜)
    const title = d.title || 'recording';
    const dateStr = d.createdAt
      ? new Date(d.createdAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // 확장자 추출 (audioPath에서 또는 기본값 webm)
    const ext = d.audioPath?.split('.').pop() || 'webm';
    const filename = `${title.replace(/[^a-zA-Z0-9가-힣\s]/g, '_').replace(/\s+/g, '_')}_${dateStr}.${ext}`;

    // Fetch and download
    fetch(audioUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('Failed to download audio:', error);
        // Fallback: open in new tab
        window.open(audioUrl, '_blank');
      });
  }

  /**
   * 요약 내용 마크다운 파일로 내보내기 (기본 형식)
   */
  exportSummary() {
    this.exportAs('md');
  }
}
