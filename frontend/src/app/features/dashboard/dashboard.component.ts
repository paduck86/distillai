import { Component, inject, signal, OnInit, ViewChild, ElementRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
import { ApiService, Distillation, SourceType, SmartFolder, CategoryWithCount } from '../../core/services/api.service';
import { ThemeService } from '../../core/services/theme.service';
import { FolderStateService } from '../../core/services/folder-state.service';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { DialogModule } from 'primeng/dialog';
import { debounceTime, Subject } from 'rxjs';
import { SidebarComponent } from './components/sidebar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, AvatarModule, DialogModule, SidebarComponent],
  template: `
    <div class="h-screen flex flex-col transition-colors duration-200"
         [class]="theme.isDark() ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'">
      <!-- Header -->
      <header class="border-b shrink-0 backdrop-blur-md transition-colors z-50"
              [class]="theme.isDark()
                ? 'border-zinc-800 bg-zinc-950/90'
                : 'border-zinc-200 bg-white/90'">
        <div class="px-4 md:px-6 py-3 flex items-center justify-between">
          <!-- Left: Mobile Menu + Logo -->
          <div class="flex items-center gap-3">
            <!-- Mobile Menu Button -->
            <button
              (click)="sidebarOpen.set(!sidebarOpen())"
              class="p-2 rounded-lg transition-colors md:hidden"
              [class]="theme.isDark()
                ? 'hover:bg-zinc-800 text-zinc-400'
                : 'hover:bg-zinc-100 text-zinc-500'">
              <i class="pi pi-bars text-lg"></i>
            </button>

            <!-- Logo -->
            <div class="flex items-center gap-2">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600
                          flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <i class="pi pi-bolt text-white"></i>
              </div>
              <span class="font-bold text-lg hidden sm:inline">Distillai</span>
            </div>
          </div>

          <!-- Right Actions -->
          <div class="flex items-center gap-2">
            <!-- Theme Toggle -->
            <button
              (click)="theme.toggle()"
              class="p-2.5 rounded-xl transition-colors"
              [class]="theme.isDark()
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'">
              <i [class]="theme.isDark() ? 'pi pi-sun' : 'pi pi-moon'"></i>
            </button>

            <!-- User Menu -->
            <div class="relative">
              <button
                (click)="toggleUserMenu()"
                class="flex items-center gap-2 p-1.5 rounded-xl transition-colors"
                [class]="theme.isDark() ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'">
                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600
                            flex items-center justify-center text-white text-sm font-medium">
                  {{ userInitial() }}
                </div>
              </button>

              @if (showUserMenu()) {
                <div class="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-xl overflow-hidden z-50 border"
                     [class]="theme.isDark()
                       ? 'bg-zinc-900 border-zinc-700'
                       : 'bg-white border-zinc-200'">
                  <div class="px-4 py-3 border-b"
                       [class]="theme.isDark() ? 'border-zinc-700' : 'border-zinc-100'">
                    <p class="text-sm font-medium truncate">{{ userEmail() }}</p>
                    <p class="text-xs opacity-50">Free Plan</p>
                  </div>
                  <button
                    (click)="signOut()"
                    class="w-full px-4 py-3 text-left text-sm flex items-center gap-2 transition-colors"
                    [class]="theme.isDark()
                      ? 'hover:bg-zinc-800 text-zinc-300'
                      : 'hover:bg-zinc-50 text-zinc-600'">
                    <i class="pi pi-sign-out"></i>
                    <span>로그아웃</span>
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      </header>

      <!-- Main Layout with Sidebar -->
      <div class="flex flex-1 overflow-hidden relative">
        <!-- Mobile Sidebar Overlay -->
        @if (sidebarOpen()) {
          <div
            (click)="sidebarOpen.set(false)"
            class="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity">
          </div>
        }

        <!-- Sidebar -->
        <app-sidebar
          class="shrink-0 fixed md:relative inset-y-0 left-0 z-50 md:z-auto transition-transform duration-300 ease-in-out md:translate-x-0"
          [class]="sidebarOpen() ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
          (smartFolderSelected)="onSmartFolderSelected($event); sidebarOpen.set(false)"
          (categorySelected)="onCategorySelected($event); sidebarOpen.set(false)"
          (dashboardRequested)="onDashboardRequested(); sidebarOpen.set(false)">
        </app-sidebar>

        <!-- Main Content -->
        <main class="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6">

        <!-- Hero Section + Import Tabs (Dashboard view or "새 프로젝트" clicked) -->
        @if (isNewProjectMode() || folderState.selectedSmartFolderId() === 'dashboard') {
          <!-- Hero Section -->
          <section class="text-center mb-4 md:mb-6">
            <h1 class="text-xl md:text-2xl font-bold mb-2">
              쌓아둔 자료들을 인사이트로 전환하세요
            </h1>
            <p class="text-sm opacity-60">유튜브, 오디오, 영상 파일을 AI가 분석해 핵심만 정리합니다</p>
          </section>

          <!-- Import Tabs Section -->
          <section class="mb-6 md:mb-8">
          <!-- Tab Buttons -->
          <div class="flex items-center justify-center gap-2 mb-4 flex-wrap">
            @for (tab of importTabs; track tab.id) {
              <button
                (click)="selectImportTab(tab.id)"
                class="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all"
                [class]="selectedImportTab() === tab.id
                  ? (theme.isDark() ? 'bg-white text-zinc-900' : 'bg-zinc-900 text-white')
                  : (theme.isDark() ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200')">
                <i [class]="'pi ' + tab.icon" [style.color]="selectedImportTab() === tab.id ? '' : tab.color"></i>
                {{ tab.label }}
              </button>
            }
          </div>

          <!-- Tab Content -->
          <div class="max-w-2xl mx-auto">
            <!-- YouTube Tab -->
            @if (selectedImportTab() === 'youtube') {
              <div class="space-y-4">
                <div class="relative">
                  <input
                    [(ngModel)]="youtubeUrl"
                    (keyup.enter)="submitYoutubeUrl()"
                    type="url"
                    placeholder="https://youtube.com/watch?v=abc"
                    class="w-full px-4 py-4 rounded-xl text-base border-2 transition-colors"
                    [class]="theme.isDark()
                      ? 'bg-zinc-900 border-zinc-700 focus:border-cyan-500 text-white placeholder-zinc-500'
                      : 'bg-white border-zinc-200 focus:border-zinc-400 text-zinc-900 placeholder-zinc-400'" />
                  @if (youtubeUrl()) {
                    <button
                      (click)="submitYoutubeUrl()"
                      [disabled]="youtubeLoading()"
                      class="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg font-medium transition-colors"
                      [class]="theme.isDark()
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-zinc-900'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-white'">
                      @if (youtubeLoading()) {
                        <i class="pi pi-spin pi-spinner"></i>
                      } @else {
                        분석하기
                      }
                    </button>
                  }
                </div>
                @if (youtubeError()) {
                  <p class="text-sm text-red-500">{{ youtubeError() }}</p>
                }
              </div>
            }

            <!-- PDF Tab -->
            @if (selectedImportTab() === 'pdf') {
              <div
                class="border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer"
                [class]="theme.isDark()
                  ? 'border-zinc-700 hover:border-orange-500/50 bg-zinc-900/50'
                  : 'border-zinc-300 hover:border-orange-400 bg-zinc-50'"
                (click)="pdfInputRef?.nativeElement?.click()"
                (dragover)="onDragOver($event)"
                (drop)="onPdfDrop($event)">
                <div class="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                     [class]="theme.isDark() ? 'bg-orange-500/20' : 'bg-orange-100'">
                  <i class="pi pi-file-pdf text-xl"
                     [class]="theme.isDark() ? 'text-orange-400' : 'text-orange-600'"></i>
                </div>
                <button
                  class="px-5 py-2.5 rounded-lg font-medium mb-2 transition-colors text-sm"
                  [class]="theme.isDark()
                    ? 'bg-orange-500 hover:bg-orange-400 text-white'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'">
                  PDF 업로드
                </button>
                <p class="text-xs opacity-50">
                  또는 여기에 PDF 파일을 드롭하세요
                </p>
              </div>
              <input
                #pdfInput
                type="file"
                accept=".pdf,application/pdf"
                (change)="onPdfSelected($event)"
                class="hidden" />
            }

            <!-- Website Tab -->
            @if (selectedImportTab() === 'website') {
              <div class="space-y-4">
                <div class="relative">
                  <input
                    [(ngModel)]="externalUrl"
                    (keyup.enter)="submitExternalUrl()"
                    type="url"
                    placeholder="https://www.example.com"
                    class="w-full px-4 py-4 rounded-xl text-base border-2 transition-colors"
                    [class]="theme.isDark()
                      ? 'bg-zinc-900 border-zinc-700 focus:border-cyan-500 text-white placeholder-zinc-500'
                      : 'bg-white border-zinc-200 focus:border-zinc-400 text-zinc-900 placeholder-zinc-400'" />
                  @if (externalUrl()) {
                    <button
                      (click)="submitExternalUrl()"
                      [disabled]="urlLoading()"
                      class="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg font-medium transition-colors"
                      [class]="theme.isDark()
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-zinc-900'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-white'">
                      @if (urlLoading()) {
                        <i class="pi pi-spin pi-spinner"></i>
                      } @else {
                        분석하기
                      }
                    </button>
                  }
                </div>
                @if (urlError()) {
                  <p class="text-sm text-red-500">{{ urlError() }}</p>
                }
              </div>
            }

            <!-- File Upload Tab (Audio/Video) -->
            @if (selectedImportTab() === 'file') {
              <div
                class="border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer"
                [class]="theme.isDark()
                  ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-900/50'
                  : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50'"
                (click)="fileInputRef?.nativeElement?.click()"
                (dragover)="onDragOver($event)"
                (drop)="onFileDrop($event)">
                <button
                  class="px-5 py-2.5 rounded-lg font-medium mb-2 transition-colors text-sm"
                  [class]="theme.isDark()
                    ? 'bg-white text-zinc-900 hover:bg-zinc-100'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800'">
                  업로드
                </button>
                <p class="text-xs opacity-50">
                  또는 여기에 파일을 드롭하세요 (.mp3 / .mp4 / .wav 등)
                </p>
              </div>
              <input
                #fileInput
                type="file"
                accept="audio/*,video/*"
                (change)="onFileSelected($event, 'audio')"
                class="hidden" />
            }

            <!-- Recording Tab -->
            @if (selectedImportTab() === 'recording') {
              <div
                class="border-2 border-dashed rounded-xl p-5 text-center transition-colors"
                [class]="theme.isDark() ? 'border-zinc-700 bg-zinc-900/50' : 'border-zinc-300 bg-zinc-50'">
                <div class="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                     [class]="theme.isDark() ? 'bg-cyan-500/20' : 'bg-zinc-200'">
                  <i class="pi pi-microphone text-xl"
                     [class]="theme.isDark() ? 'text-cyan-400' : 'text-zinc-600'"></i>
                </div>
                <p class="mb-3 text-sm opacity-70">브라우저 탭의 오디오를 실시간으로 캡처합니다</p>
                <button
                  (click)="goToRecord()"
                  class="px-5 py-2.5 rounded-lg font-medium transition-colors text-sm"
                  [class]="theme.isDark()
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-zinc-900'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white'">
                  <i class="pi pi-play mr-2"></i>
                  녹음 시작
                </button>
              </div>
            }
          </div>
        </section>
        }

        <!-- Projects Section (hidden when "새 프로젝트" clicked) -->
        @if (!isNewProjectMode()) {
        <section>
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-semibold">{{ sectionTitle() }}</h2>

            <!-- View Toggle -->
            <div class="flex items-center gap-1 p-1 rounded-lg"
                 [class]="theme.isDark() ? 'bg-zinc-800' : 'bg-zinc-100'">
              <button
                (click)="viewMode.set('grid')"
                class="px-3 py-1.5 text-sm rounded-md transition-all"
                [class]="viewMode() === 'grid'
                  ? (theme.isDark() ? 'bg-zinc-700 text-white' : 'bg-white text-zinc-900 shadow-sm')
                  : 'text-zinc-500'">
                <i class="pi pi-th-large text-xs mr-1.5"></i>그리드
              </button>
              <button
                (click)="viewMode.set('list')"
                class="px-3 py-1.5 text-sm rounded-md transition-all"
                [class]="viewMode() === 'list'
                  ? (theme.isDark() ? 'bg-zinc-700 text-white' : 'bg-white text-zinc-900 shadow-sm')
                  : 'text-zinc-500'">
                <i class="pi pi-list text-xs mr-1.5"></i>목록
              </button>
            </div>
          </div>

          <!-- Search & Filters -->
          <div class="flex flex-wrap items-center gap-3 mb-6">
            <div class="relative flex-1 min-w-[200px] max-w-md">
              <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"></i>
              <input
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange($event)"
                type="text"
                placeholder="검색..."
                class="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-colors"
                [class]="theme.isDark()
                  ? 'bg-zinc-800 border-zinc-700 focus:border-cyan-500 text-white placeholder-zinc-500'
                  : 'bg-white border-zinc-200 focus:border-zinc-400 text-zinc-900 placeholder-zinc-400'"
                style="border-width: 1px;" />
            </div>

            <!-- Type Filter -->
            <div class="relative">
              <button
                (click)="showTypeDropdown = !showTypeDropdown"
                class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-colors"
                [class]="theme.isDark()
                  ? 'border-zinc-700 hover:bg-zinc-800'
                  : 'border-zinc-200 hover:bg-zinc-50'">
                <span>{{ getSelectedFilterLabel() }}</span>
                <i class="pi pi-chevron-down text-xs"></i>
              </button>

              @if (showTypeDropdown) {
                <div class="absolute left-0 top-full mt-2 w-48 rounded-xl shadow-xl overflow-hidden z-40 border"
                     [class]="theme.isDark() ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'">
                  @for (option of typeFilterOptions; track option.value) {
                    <button
                      (click)="setTypeFilter(option.value)"
                      class="w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2"
                      [class]="theme.isDark() ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'">
                      <i [class]="'pi ' + option.icon" [style.color]="option.color"></i>
                      <span>{{ option.label }}</span>
                      @if (selectedTypeFilter() === option.value) {
                        <i class="pi pi-check ml-auto text-cyan-500"></i>
                      }
                    </button>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Loading -->
          @if (loading()) {
            <div class="text-center py-20">
              <i class="pi pi-spin pi-spinner text-3xl text-cyan-500 mb-4"></i>
              <p class="opacity-50">불러오는 중...</p>
            </div>
          } @else if (distillations().length === 0) {
            <!-- Empty State -->
            <div class="text-center py-20 rounded-2xl border-2 border-dashed"
                 [class]="theme.isDark() ? 'border-zinc-800' : 'border-zinc-200'">
              <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                   [class]="theme.isDark() ? 'bg-zinc-800' : 'bg-zinc-100'">
                <i class="pi pi-inbox text-2xl opacity-40"></i>
              </div>
              <h3 class="text-lg font-medium mb-2">아직 프로젝트가 없습니다</h3>
              <p class="opacity-50 mb-6">첫 번째 프로젝트를 만들어보세요!</p>
              <button
                (click)="isNewProjectMode.set(true)"
                class="px-5 py-2.5 rounded-xl font-medium transition-colors"
                [class]="theme.isDark()
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-zinc-900'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white'">
                <i class="pi pi-plus mr-2"></i>
                시작하기
              </button>
            </div>
          } @else {
            <!-- Grid View -->
            @if (viewMode() === 'grid') {
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                @for (item of distillations(); track item.id) {
                  <div
                    class="group relative rounded-xl p-5 cursor-pointer transition-all border"
                    [class]="theme.isDark()
                      ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
                      : 'bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-lg'"
                    (click)="openDistillation(item.id)">
                    <!-- Delete Button -->
                    <button
                      (click)="confirmDelete($event, item)"
                      class="absolute top-3 right-3 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      [class]="theme.isDark()
                        ? 'hover:bg-zinc-700 text-zinc-500 hover:text-red-400'
                        : 'hover:bg-zinc-100 text-zinc-400 hover:text-red-500'">
                      <i class="pi pi-trash text-sm"></i>
                    </button>

                    <!-- Source Badge & Status -->
                    <div class="flex items-center gap-2 mb-3 flex-wrap">
                      <span
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                        [style.backgroundColor]="getSourceTypeColor(item.sourceType) + '18'"
                        [style.color]="getSourceTypeColor(item.sourceType)">
                        <i [class]="'pi ' + getSourceTypeIcon(item.sourceType)" class="text-xs"></i>
                        {{ getSourceTypeLabel(item.sourceType) }}
                      </span>
                      <!-- Status Badges -->
                      @if (item.status === 'processing') {
                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs
                                   bg-amber-500/15 text-amber-500">
                          <i class="pi pi-spin pi-spinner text-xs"></i>
                          분석 중
                        </span>
                      } @else if (item.status === 'crystallized') {
                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs
                                   bg-emerald-500/15 text-emerald-500">
                          <i class="pi pi-check-circle text-xs"></i>
                          완료
                        </span>
                      } @else if (item.status === 'failed') {
                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs
                                   bg-red-500/15 text-red-500">
                          <i class="pi pi-times-circle text-xs"></i>
                          실패
                        </span>
                      }
                      <!-- AI Suggestion Badge -->
                      @if (item.aiSuggestedCategoryId && !item.categoryConfirmed) {
                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs
                                   bg-violet-500/15 text-violet-500">
                          <i class="pi pi-sparkles text-xs"></i>
                          AI 추천
                        </span>
                      }
                    </div>

                    <!-- Title -->
                    <h3 class="font-medium truncate mb-3 group-hover:text-cyan-500 transition-colors">
                      {{ item.title }}
                    </h3>

                    <!-- Meta -->
                    <div class="flex items-center gap-3 text-xs opacity-50">
                      @if (item.durationSeconds) {
                        <span class="flex items-center gap-1">
                          <i class="pi pi-clock"></i>
                          {{ formatDuration(item.durationSeconds) }}
                        </span>
                      }
                      <span>{{ formatDate(item.createdAt) }}</span>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <!-- List View -->
              <div class="rounded-xl overflow-hidden border"
                   [class]="theme.isDark() ? 'border-zinc-800' : 'border-zinc-200'">
                @for (item of distillations(); track item.id; let last = $last) {
                  <div
                    class="group flex items-center gap-4 px-4 py-3.5 cursor-pointer transition-colors"
                    [class]="theme.isDark()
                      ? 'hover:bg-zinc-800/50' + (!last ? ' border-b border-zinc-800' : '')
                      : 'hover:bg-zinc-50' + (!last ? ' border-b border-zinc-100' : '')"
                    (click)="openDistillation(item.id)">
                    <!-- Icon -->
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                         [style.backgroundColor]="getSourceTypeColor(item.sourceType) + '18'">
                      <i [class]="'pi ' + getSourceTypeIcon(item.sourceType)"
                         [style.color]="getSourceTypeColor(item.sourceType)"></i>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                      <h3 class="text-sm font-medium truncate group-hover:text-cyan-500 transition-colors">
                        {{ item.title }}
                      </h3>
                      <div class="flex items-center gap-2 text-xs opacity-50 mt-0.5">
                        <span>{{ getSourceTypeLabel(item.sourceType) }}</span>
                        <span>•</span>
                        <span>{{ formatDate(item.createdAt) }}</span>
                      </div>
                    </div>

                    <!-- Status Badges -->
                    <div class="flex items-center gap-2 shrink-0">
                      @if (item.status === 'processing') {
                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs
                                   bg-amber-500/15 text-amber-500">
                          <i class="pi pi-spin pi-spinner text-xs"></i>
                          분석 중
                        </span>
                      } @else if (item.status === 'crystallized') {
                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs
                                   bg-emerald-500/15 text-emerald-500">
                          <i class="pi pi-check-circle text-xs"></i>
                          완료
                        </span>
                      } @else if (item.status === 'failed') {
                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs
                                   bg-red-500/15 text-red-500">
                          <i class="pi pi-times-circle text-xs"></i>
                          실패
                        </span>
                      }
                      @if (item.aiSuggestedCategoryId && !item.categoryConfirmed) {
                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs
                                   bg-violet-500/15 text-violet-500">
                          <i class="pi pi-sparkles text-xs"></i>
                          AI 추천
                        </span>
                      }
                    </div>

                    <!-- Delete -->
                    <button
                      (click)="confirmDelete($event, item)"
                      class="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      [class]="theme.isDark()
                        ? 'hover:bg-zinc-700 text-zinc-500 hover:text-red-400'
                        : 'hover:bg-zinc-100 text-zinc-400 hover:text-red-500'">
                      <i class="pi pi-trash text-sm"></i>
                    </button>
                  </div>
                }
              </div>
            }
          }
        </section>
        }
        </main>
      </div>

      <!-- Import Dialog -->
      <p-dialog
        header="자료 가져오기"
        [(visible)]="showImportDialog"
        [modal]="true"
        [style]="{ width: '640px' }"
        [styleClass]="theme.isDark() ? 'dialog-dark' : 'dialog-light'">
        <div class="grid grid-cols-3 gap-3 py-2">
          <!-- YouTube -->
          <button
            (click)="openYoutubeDialog()"
            class="flex flex-col items-center gap-3 p-4 rounded-xl border transition-all"
            [class]="theme.isDark()
              ? 'border-zinc-700 hover:border-red-500/50 hover:bg-red-500/10'
              : 'border-zinc-200 hover:border-red-300 hover:bg-red-50'">
            <div class="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center">
              <i class="pi pi-youtube text-xl text-red-500"></i>
            </div>
            <div class="text-center">
              <p class="font-medium">유튜브</p>
              <p class="text-xs opacity-50">URL로 가져오기</p>
            </div>
          </button>

          <!-- PDF -->
          <button
            (click)="openPdfUpload()"
            class="flex flex-col items-center gap-3 p-4 rounded-xl border transition-all"
            [class]="theme.isDark()
              ? 'border-zinc-700 hover:border-orange-500/50 hover:bg-orange-500/10'
              : 'border-zinc-200 hover:border-orange-300 hover:bg-orange-50'">
            <div class="w-12 h-12 rounded-xl bg-orange-500/15 flex items-center justify-center">
              <i class="pi pi-file-pdf text-xl text-orange-500"></i>
            </div>
            <div class="text-center">
              <p class="font-medium">PDF</p>
              <p class="text-xs opacity-50">문서 업로드</p>
            </div>
          </button>

          <!-- URL -->
          <button
            (click)="openUrlDialog()"
            class="flex flex-col items-center gap-3 p-4 rounded-xl border transition-all"
            [class]="theme.isDark()
              ? 'border-zinc-700 hover:border-blue-500/50 hover:bg-blue-500/10'
              : 'border-zinc-200 hover:border-blue-300 hover:bg-blue-50'">
            <div class="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <i class="pi pi-link text-xl text-blue-500"></i>
            </div>
            <div class="text-center">
              <p class="font-medium">웹사이트</p>
              <p class="text-xs opacity-50">URL로 가져오기</p>
            </div>
          </button>

          <!-- Audio -->
          <button
            (click)="openFileUpload('audio')"
            class="flex flex-col items-center gap-3 p-4 rounded-xl border transition-all"
            [class]="theme.isDark()
              ? 'border-zinc-700 hover:border-emerald-500/50 hover:bg-emerald-500/10'
              : 'border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50'">
            <div class="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <i class="pi pi-volume-up text-xl text-emerald-500"></i>
            </div>
            <div class="text-center">
              <p class="font-medium">음성 파일</p>
              <p class="text-xs opacity-50">mp3, wav, m4a</p>
            </div>
          </button>

          <!-- Video -->
          <button
            (click)="openFileUpload('video')"
            class="flex flex-col items-center gap-3 p-4 rounded-xl border transition-all"
            [class]="theme.isDark()
              ? 'border-zinc-700 hover:border-purple-500/50 hover:bg-purple-500/10'
              : 'border-zinc-200 hover:border-purple-300 hover:bg-purple-50'">
            <div class="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <i class="pi pi-video text-xl text-purple-500"></i>
            </div>
            <div class="text-center">
              <p class="font-medium">영상 파일</p>
              <p class="text-xs opacity-50">mp4, webm, mov</p>
            </div>
          </button>

          <!-- Recording -->
          <button
            (click)="goToRecord(); showImportDialog = false"
            class="flex flex-col items-center gap-3 p-4 rounded-xl border transition-all"
            [class]="theme.isDark()
              ? 'border-zinc-700 hover:border-cyan-500/50 hover:bg-cyan-500/10'
              : 'border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50'">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center"
                 [class]="theme.isDark() ? 'bg-cyan-500/15' : 'bg-zinc-100'">
              <i class="pi pi-microphone text-xl"
                 [class]="theme.isDark() ? 'text-cyan-500' : 'text-zinc-600'"></i>
            </div>
            <div class="text-center">
              <p class="font-medium">실시간 녹음</p>
              <p class="text-xs opacity-50">탭 오디오 캡처</p>
            </div>
          </button>
        </div>

        <input #audioInput type="file" accept="audio/*" (change)="onFileSelected($event, 'audio')" class="hidden" />
        <input #videoInput type="file" accept="video/*" (change)="onFileSelected($event, 'video')" class="hidden" />
        <input #dialogPdfInput type="file" accept=".pdf,application/pdf" (change)="onDialogPdfSelected($event)" class="hidden" />
      </p-dialog>

      <!-- YouTube Dialog -->
      <p-dialog
        header="유튜브 영상 가져오기"
        [(visible)]="showYoutubeDialog"
        [modal]="true"
        [style]="{ width: '420px' }"
        [styleClass]="theme.isDark() ? 'dialog-dark' : 'dialog-light'">
        <div class="py-2">
          <p class="text-sm opacity-60 mb-4">YouTube URL을 입력하면 자동으로 분석합니다.</p>
          <div class="relative">
            <i class="pi pi-youtube absolute left-3 top-1/2 -translate-y-1/2 text-red-500"></i>
            <input
              [(ngModel)]="youtubeUrl"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              class="w-full pl-10 pr-4 py-3 rounded-xl text-sm border transition-colors"
              [class]="theme.isDark()
                ? 'bg-zinc-800 border-zinc-700 focus:border-cyan-500 text-white'
                : 'bg-white border-zinc-200 focus:border-zinc-400'" />
          </div>
          @if (youtubeError()) {
            <p class="text-xs text-red-500 mt-2">{{ youtubeError() }}</p>
          }
        </div>
        <ng-template pTemplate="footer">
          <div class="flex justify-end gap-2">
            <button
              (click)="showYoutubeDialog = false"
              class="px-4 py-2 text-sm rounded-lg transition-colors"
              [class]="theme.isDark() ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'">
              취소
            </button>
            <button
              (click)="submitYoutubeUrl()"
              [disabled]="!youtubeUrl() || youtubeLoading()"
              class="px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50"
              [class]="theme.isDark()
                ? 'bg-cyan-500 hover:bg-cyan-400 text-zinc-900'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white'">
              @if (youtubeLoading()) {
                <i class="pi pi-spin pi-spinner mr-2"></i>
              }
              가져오기
            </button>
          </div>
        </ng-template>
      </p-dialog>

      <!-- URL Dialog -->
      <p-dialog
        header="웹사이트에서 가져오기"
        [(visible)]="showUrlDialog"
        [modal]="true"
        [style]="{ width: '420px' }"
        [styleClass]="theme.isDark() ? 'dialog-dark' : 'dialog-light'">
        <div class="py-2">
          <p class="text-sm opacity-60 mb-4">오디오/비디오가 있는 URL을 입력하세요.</p>
          <div class="relative">
            <i class="pi pi-link absolute left-3 top-1/2 -translate-y-1/2 text-blue-500"></i>
            <input
              [(ngModel)]="externalUrl"
              type="url"
              placeholder="https://example.com/audio.mp3"
              class="w-full pl-10 pr-4 py-3 rounded-xl text-sm border transition-colors"
              [class]="theme.isDark()
                ? 'bg-zinc-800 border-zinc-700 focus:border-cyan-500 text-white'
                : 'bg-white border-zinc-200 focus:border-zinc-400'" />
          </div>
          @if (urlError()) {
            <p class="text-xs text-red-500 mt-2">{{ urlError() }}</p>
          }
        </div>
        <ng-template pTemplate="footer">
          <div class="flex justify-end gap-2">
            <button
              (click)="showUrlDialog = false"
              class="px-4 py-2 text-sm rounded-lg transition-colors"
              [class]="theme.isDark() ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'">
              취소
            </button>
            <button
              (click)="submitExternalUrl()"
              [disabled]="!externalUrl() || urlLoading()"
              class="px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50"
              [class]="theme.isDark()
                ? 'bg-cyan-500 hover:bg-cyan-400 text-zinc-900'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white'">
              @if (urlLoading()) {
                <i class="pi pi-spin pi-spinner mr-2"></i>
              }
              가져오기
            </button>
          </div>
        </ng-template>
      </p-dialog>

      <!-- Delete Dialog -->
      <p-dialog
        header="프로젝트 삭제"
        [(visible)]="showDeleteDialog"
        [modal]="true"
        [style]="{ width: '380px' }"
        [styleClass]="theme.isDark() ? 'dialog-dark' : 'dialog-light'">
        <div class="py-2">
          <p><span class="font-medium">{{ deleteTarget()?.title }}</span>을(를) 삭제하시겠습니까?</p>
          <p class="text-sm opacity-50 mt-2">삭제된 프로젝트는 복구할 수 없습니다.</p>
        </div>
        <ng-template pTemplate="footer">
          <div class="flex justify-end gap-2">
            <button
              (click)="showDeleteDialog = false"
              class="px-4 py-2 text-sm rounded-lg transition-colors"
              [class]="theme.isDark() ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'">
              취소
            </button>
            <button
              (click)="deleteDistillation()"
              [disabled]="deleting()"
              class="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50">
              @if (deleting()) {
                <i class="pi pi-spin pi-spinner mr-2"></i>
              }
              삭제
            </button>
          </div>
        </ng-template>
      </p-dialog>

      <!-- Upload Dialog -->
      <p-dialog
        header="파일 업로드"
        [(visible)]="showUploadDialog"
        [modal]="true"
        [style]="{ width: '380px' }"
        [closable]="!uploadLoading()"
        [styleClass]="theme.isDark() ? 'dialog-dark' : 'dialog-light'">
        <div class="py-4 text-center">
          @if (uploadLoading()) {
            <i class="pi pi-spin pi-spinner text-3xl text-cyan-500 mb-4"></i>
            <p class="font-medium mb-2">{{ uploadFileName() }}</p>
            <p class="text-sm opacity-50 mb-4">업로드 중...</p>
            <div class="w-full rounded-full h-2 overflow-hidden"
                 [class]="theme.isDark() ? 'bg-zinc-700' : 'bg-zinc-200'">
              <div class="h-full bg-cyan-500 transition-all" [style.width.%]="uploadProgress()"></div>
            </div>
            <p class="text-xs opacity-50 mt-2">{{ uploadProgress() }}%</p>
          } @else if (uploadError()) {
            <i class="pi pi-times-circle text-3xl text-red-500 mb-4"></i>
            <p class="text-red-500">{{ uploadError() }}</p>
          }
        </div>
      </p-dialog>

      <!-- Overlays -->
      @if (showTypeDropdown) {
        <div (click)="showTypeDropdown = false" class="fixed inset-0 z-30"></div>
      }
      @if (showUserMenu()) {
        <div (click)="showUserMenu.set(false)" class="fixed inset-0 z-40"></div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    /* Dark Dialog */
    ::ng-deep .dialog-dark .p-dialog {
      background: #18181b !important;
      border: 1px solid #3f3f46 !important;
      border-radius: 16px !important;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
    }
    ::ng-deep .dialog-dark .p-dialog-header {
      background: #18181b !important;
      color: #fafafa !important;
      border-bottom: 1px solid #27272a !important;
      padding: 1rem 1.25rem !important;
    }
    ::ng-deep .dialog-dark .p-dialog-content {
      background: #18181b !important;
      color: #fafafa !important;
      padding: 1rem 1.25rem !important;
    }
    ::ng-deep .dialog-dark .p-dialog-footer {
      background: #18181b !important;
      border-top: 1px solid #27272a !important;
      padding: 0.75rem 1.25rem !important;
    }
    ::ng-deep .dialog-dark .p-dialog-header-icons .p-dialog-header-icon {
      color: #71717a !important;
    }
    ::ng-deep .dialog-dark .p-dialog-header-icons .p-dialog-header-icon:hover {
      background: #27272a !important;
      color: #fafafa !important;
    }

    /* Light Dialog */
    ::ng-deep .dialog-light .p-dialog {
      background: #ffffff !important;
      border: 1px solid #e4e4e7 !important;
      border-radius: 16px !important;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15) !important;
    }
    ::ng-deep .dialog-light .p-dialog-header {
      background: #ffffff !important;
      color: #18181b !important;
      border-bottom: 1px solid #f4f4f5 !important;
      padding: 1rem 1.25rem !important;
    }
    ::ng-deep .dialog-light .p-dialog-content {
      background: #ffffff !important;
      color: #18181b !important;
      padding: 1rem 1.25rem !important;
    }
    ::ng-deep .dialog-light .p-dialog-footer {
      background: #ffffff !important;
      border-top: 1px solid #f4f4f5 !important;
      padding: 0.75rem 1.25rem !important;
    }
    ::ng-deep .dialog-light .p-dialog-header-icons .p-dialog-header-icon {
      color: #71717a !important;
    }
    ::ng-deep .dialog-light .p-dialog-header-icons .p-dialog-header-icon:hover {
      background: #f4f4f5 !important;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private supabase = inject(SupabaseService);
  private api = inject(ApiService);
  theme = inject(ThemeService);
  folderState = inject(FolderStateService);

  private searchSubject = new Subject<string>();

  @ViewChild('audioInput') audioInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('videoInput') videoInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('pdfInput') pdfInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('dialogPdfInput') dialogPdfInputRef!: ElementRef<HTMLInputElement>;

  // Import Tabs
  importTabs = [
    { id: 'youtube', label: '유튜브', icon: 'pi-youtube', color: '#dc2626' },
    { id: 'pdf', label: 'PDF', icon: 'pi-file-pdf', color: '#f97316' },
    { id: 'website', label: '웹사이트', icon: 'pi-globe', color: '#3b82f6' },
    { id: 'file', label: '영상 / 음성 파일', icon: 'pi-file', color: '#8b5cf6' },
    { id: 'recording', label: '실시간 녹음', icon: 'pi-microphone', color: '#06b6d4' },
  ];
  selectedImportTab = signal<string>('youtube');

  // State
  showUserMenu = signal(false);
  sidebarOpen = signal(false);
  isNewProjectMode = signal(false);  // "새 프로젝트" 클릭 시 true
  loading = signal(true);
  distillations = signal<Distillation[]>([]);
  searchQuery = signal('');
  selectedTypeFilter = signal<SourceType | null>(null);
  viewMode = signal<'grid' | 'list'>('grid');
  showTypeDropdown = false;

  // Dialogs
  showImportDialog = false;
  showYoutubeDialog = false;
  showUrlDialog = false;
  showDeleteDialog = false;
  showUploadDialog = false;

  // YouTube
  youtubeUrl = signal('');
  youtubeError = signal('');
  youtubeLoading = signal(false);

  // URL
  externalUrl = signal('');
  urlError = signal('');
  urlLoading = signal(false);

  // Delete
  deleteTarget = signal<Distillation | null>(null);
  deleting = signal(false);

  // Upload
  uploadFileName = signal('');
  uploadProgress = signal(0);
  uploadError = signal('');
  uploadLoading = signal(false);

  // Computed: Section title based on selected menu
  sectionTitle = computed(() => {
    const smartFolderId = this.folderState.selectedSmartFolderId();
    const categoryId = this.folderState.selectedCategoryId();

    if (categoryId) {
      const category = this.folderState.categories().find(c => c.id === categoryId);
      return category?.name || '프로젝트';
    }

    switch (smartFolderId) {
      case 'dashboard': return '최근 프로젝트';
      case 'all': return '전체 프로젝트';
      case 'recent': return '최근 7일';
      default: return '프로젝트';
    }
  });

  // Type filter options
  typeFilterOptions = [
    { label: '전체', value: null, icon: 'pi-list', color: '#71717a' },
    { label: '유튜브', value: 'youtube' as SourceType, icon: 'pi-youtube', color: '#dc2626' },
    { label: 'PDF', value: 'pdf' as SourceType, icon: 'pi-file-pdf', color: '#f97316' },
    { label: '음성 파일', value: 'audio' as SourceType, icon: 'pi-volume-up', color: '#10b981' },
    { label: '영상 파일', value: 'video' as SourceType, icon: 'pi-video', color: '#8b5cf6' },
    { label: '웹사이트', value: 'url' as SourceType, icon: 'pi-link', color: '#3b82f6' },
    { label: '녹음', value: 'recording' as SourceType, icon: 'pi-microphone', color: '#06b6d4' },
  ];

  ngOnInit() {
    this.loadDistillations();
    this.searchSubject.pipe(debounceTime(300)).subscribe(() => this.loadDistillations());
  }

  loadDistillations() {
    this.loading.set(true);
    const params: { sourceType?: SourceType; search?: string } = {};
    if (this.searchQuery()) params.search = this.searchQuery();
    if (this.selectedTypeFilter()) params.sourceType = this.selectedTypeFilter()!;

    this.api.getLectures(params).subscribe({
      next: (res) => { this.distillations.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onSearchChange(q: string) { this.searchQuery.set(q); this.searchSubject.next(q); }

  setTypeFilter(type: SourceType | null) {
    this.selectedTypeFilter.set(type);
    this.showTypeDropdown = false;
    this.loadDistillations();
  }

  getSelectedFilterLabel(): string {
    const opt = this.typeFilterOptions.find(o => o.value === this.selectedTypeFilter());
    return opt?.label || '전체';
  }

  getSourceTypeLabel(type: SourceType | undefined): string {
    const map: Record<string, string> = {
      youtube: '유튜브', audio: '음성', video: '영상', url: '웹', recording: '녹음', pdf: 'PDF', website: '웹', text: '텍스트'
    };
    return map[type || ''] || '녹음';
  }

  getSourceTypeIcon(type: SourceType | undefined): string {
    const map: Record<string, string> = {
      youtube: 'pi-youtube', audio: 'pi-volume-up', video: 'pi-video', url: 'pi-link', recording: 'pi-microphone', pdf: 'pi-file-pdf', website: 'pi-globe', text: 'pi-file'
    };
    return map[type || ''] || 'pi-microphone';
  }

  getSourceTypeColor(type: SourceType | undefined): string {
    const map: Record<string, string> = {
      youtube: '#dc2626', audio: '#10b981', video: '#8b5cf6', url: '#3b82f6', recording: '#06b6d4', pdf: '#f97316', website: '#3b82f6', text: '#71717a'
    };
    return map[type || ''] || '#06b6d4';
  }

  userEmail() { return this.supabase.user()?.email || 'User'; }
  userInitial() { return this.userEmail().charAt(0).toUpperCase(); }
  toggleUserMenu() { this.showUserMenu.update(v => !v); }

  async signOut() {
    await this.supabase.signOut();
    this.router.navigate(['/auth/login']);
  }

  goToRecord() { this.router.navigate(['/record']); }
  openDistillation(id: string) { this.router.navigate(['/lecture', id]); }

  selectImportTab(tabId: string) {
    this.selectedImportTab.set(tabId);
    this.youtubeError.set('');
    this.urlError.set('');
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.handleFileUpload(file);
    }
  }

  onPdfDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type === 'application/pdf') {
      this.handlePdfUpload(file);
    }
  }

  onPdfSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.handlePdfUpload(file);
    }
    (event.target as HTMLInputElement).value = '';
  }

  handlePdfUpload(file: File) {
    if (file.size > 100 * 1024 * 1024) {
      alert('PDF 파일 크기는 100MB를 초과할 수 없습니다.');
      return;
    }

    this.uploadFileName.set(file.name);
    this.uploadProgress.set(0);
    this.uploadError.set('');
    this.uploadLoading.set(true);
    this.showUploadDialog = true;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.pdf$/i, ''));
    formData.append('sourceType', 'pdf');
    const categoryId = this.folderState.selectedCategoryId();
    if (categoryId) formData.append('categoryId', categoryId);

    this.api.uploadFile(formData, (p) => this.uploadProgress.set(Math.round(p))).subscribe({
      next: (res) => {
        this.uploadLoading.set(false);
        this.showUploadDialog = false;
        this.router.navigate(['/lecture', res.data.id]);
      },
      error: (err) => {
        this.uploadError.set(err.error?.message || 'PDF 업로드 실패');
        this.uploadLoading.set(false);
      }
    });
  }

  handleFileUpload(file: File) {
    if (file.size > 500 * 1024 * 1024) {
      alert('파일 크기는 500MB를 초과할 수 없습니다.');
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const type = isVideo ? 'video' : 'audio';

    this.uploadFileName.set(file.name);
    this.uploadProgress.set(0);
    this.uploadError.set('');
    this.uploadLoading.set(true);
    this.showUploadDialog = true;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
    formData.append('sourceType', type);
    const categoryId = this.folderState.selectedCategoryId();
    if (categoryId) formData.append('categoryId', categoryId);

    this.api.uploadFile(formData, (p) => this.uploadProgress.set(Math.round(p))).subscribe({
      next: (res) => {
        this.uploadLoading.set(false);
        this.showUploadDialog = false;
        this.router.navigate(['/lecture', res.data.id]);
      },
      error: (err) => {
        this.uploadError.set(err.error?.message || '업로드 실패');
        this.uploadLoading.set(false);
      }
    });
  }

  confirmDelete(e: Event, item: Distillation) {
    e.stopPropagation();
    this.deleteTarget.set(item);
    this.showDeleteDialog = true;
  }

  deleteDistillation() {
    const target = this.deleteTarget();
    if (!target) return;
    this.deleting.set(true);
    this.api.deleteLecture(target.id).subscribe({
      next: () => {
        this.distillations.update(items => items.filter(d => d.id !== target.id));
        this.showDeleteDialog = false;
        this.deleteTarget.set(null);
        this.deleting.set(false);
      },
      error: () => this.deleting.set(false)
    });
  }

  openYoutubeDialog() {
    this.showImportDialog = false;
    this.youtubeUrl.set(''); this.youtubeError.set('');
    this.showYoutubeDialog = true;
  }

  submitYoutubeUrl() {
    const url = this.youtubeUrl().trim();
    if (!url) return;
    if (!/^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/.test(url)) {
      this.youtubeError.set('올바른 YouTube URL을 입력해주세요.');
      return;
    }
    this.youtubeLoading.set(true); this.youtubeError.set('');
    const categoryId = this.folderState.selectedCategoryId() || undefined;
    this.api.createFromYoutube(url, categoryId).subscribe({
      next: (res) => { this.youtubeLoading.set(false); this.showYoutubeDialog = false; this.router.navigate(['/lecture', res.data.id]); },
      error: (err) => { this.youtubeError.set(err.error?.message || '가져오기 실패'); this.youtubeLoading.set(false); }
    });
  }

  openUrlDialog() {
    this.showImportDialog = false;
    this.externalUrl.set(''); this.urlError.set('');
    this.showUrlDialog = true;
  }

  submitExternalUrl() {
    const url = this.externalUrl().trim();
    if (!url) return;
    try { new URL(url); } catch { this.urlError.set('올바른 URL을 입력해주세요.'); return; }
    this.urlLoading.set(true); this.urlError.set('');
    const categoryId = this.folderState.selectedCategoryId() || undefined;
    this.api.createFromUrl(url, categoryId).subscribe({
      next: (res) => { this.urlLoading.set(false); this.showUrlDialog = false; this.router.navigate(['/lecture', res.data.id]); },
      error: (err) => { this.urlError.set(err.error?.message || '가져오기 실패'); this.urlLoading.set(false); }
    });
  }

  openFileUpload(type: 'audio' | 'video') {
    this.showImportDialog = false;
    if (type === 'audio') this.audioInputRef?.nativeElement?.click();
    else this.videoInputRef?.nativeElement?.click();
  }

  openPdfUpload() {
    this.showImportDialog = false;
    this.dialogPdfInputRef?.nativeElement?.click();
  }

  onDialogPdfSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.handlePdfUpload(file);
    }
    (event.target as HTMLInputElement).value = '';
  }

  onFileSelected(event: Event, _type: 'audio' | 'video') {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.handleFileUpload(file);
    (event.target as HTMLInputElement).value = '';
  }

  formatDuration(s: number | null): string {
    if (!s) return '00:00';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}` : `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
  }

  formatDate(d: string): string {
    return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(d));
  }

  // Sidebar event handlers
  onSmartFolderSelected(smart: SmartFolder) {
    this.isNewProjectMode.set(false);  // 메뉴 선택 시 새 프로젝트 모드 해제
    this.selectedTypeFilter.set(null);
    this.loadDistillationsWithFilter({ smartFolder: smart });
  }

  onCategorySelected(category: CategoryWithCount) {
    this.isNewProjectMode.set(false);  // 카테고리 선택 시 새 프로젝트 모드 해제
    this.selectedTypeFilter.set(null);
    this.loadDistillationsWithFilter({ categoryId: category.id });
  }

  onDashboardRequested() {
    this.isNewProjectMode.set(true);  // "새 프로젝트" 클릭 시 프로젝트 리스트 숨김
  }

  private loadDistillationsWithFilter(filter: {
    smartFolder?: SmartFolder;
    categoryId?: string;
  }) {
    this.loading.set(true);
    const params: { categoryId?: string; status?: string; sourceType?: SourceType; search?: string } = {};

    if (this.searchQuery()) params.search = this.searchQuery();

    if (filter.smartFolder) {
      switch (filter.smartFolder.id) {
        case 'dashboard':
        case 'all':
          // No filter - show all
          break;
        case 'recent':
          // Recent 7 days - handled on server or filter client-side
          break;
      }
    } else if (filter.categoryId) {
      params.categoryId = filter.categoryId;
    }

    this.api.getLectures(params).subscribe({
      next: (res) => { this.distillations.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
