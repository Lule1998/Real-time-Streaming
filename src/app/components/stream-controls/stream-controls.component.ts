// src/app/components/stream-controls/stream-controls.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StreamingService } from '../../services/streaming.service';

@Component({
  selector: 'app-stream-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow-md p-6 mt-6">
      <h2 class="text-xl font-semibold mb-4 text-gray-700 flex items-center justify-between">
        <span>Stream Controls</span>
        <div class="flex space-x-2">
          <button 
            (click)="exportData()"
            class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 
                   flex items-center text-sm">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Data
          </button>
          <button 
            (click)="clearData()"
            class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 
                   flex items-center text-sm">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Data
          </button>
        </div>
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Filters -->
        <div class="space-y-4">
          <h3 class="font-medium text-gray-700">Filters</h3>
          
          <div class="flex items-center space-x-2">
            <input 
              type="checkbox"
              [ngModel]="showSSE"
              (ngModelChange)="toggleSSE($event)"
              id="sseFilter"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            >
            <label for="sseFilter" class="text-sm text-gray-600">Show SSE Messages</label>
          </div>
          
          <div class="flex items-center space-x-2">
            <input 
              type="checkbox"
              [ngModel]="showSocket"
              (ngModelChange)="toggleSocket($event)"
              id="socketFilter"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            >
            <label for="socketFilter" class="text-sm text-gray-600">Show Socket.io Messages</label>
          </div>

          <div class="mt-4">
            <input 
              type="text"
              [(ngModel)]="searchTerm"
              (ngModelChange)="updateFilters()"
              placeholder="Search in messages..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md 
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
        </div>

        <!-- Statistics -->
        <div class="space-y-4">
          <h3 class="font-medium text-gray-700">Statistics</h3>
          
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gray-50 p-3 rounded-lg">
              <div class="text-sm text-gray-600">Filtered Messages</div>
              <div class="text-lg font-semibold">{{ filteredCount }}</div>
            </div>
            
            <div class="bg-gray-50 p-3 rounded-lg">
              <div class="text-sm text-gray-600">Average Length</div>
              <div class="text-lg font-semibold">{{ averageLength }} chars</div>
            </div>
          </div>

          <div class="bg-gray-50 p-3 rounded-lg">
            <div class="text-sm text-gray-600">Session Duration</div>
            <div class="text-lg font-semibold">{{ sessionDuration }}</div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class StreamControlsComponent {
  private streamService = inject(StreamingService);
  
  showSSE = true;
  showSocket = true;
  searchTerm = '';
  filteredCount = 0;
  averageLength = 0;
  sessionDuration = '0:00';

  private startTime = Date.now();
  private updateInterval: any;

  constructor() {
    this.startUpdateInterval();
  }

  private startUpdateInterval() {
    this.updateInterval = setInterval(() => {
      this.updateStatistics();
      this.updateSessionDuration();
    }, 1000);
  }

  private updateStatistics() {
    const stats = this.streamService.getStreamStats();
    this.filteredCount = this.getFilteredMessagesCount();
    this.averageLength = this.calculateAverageMessageLength();
  }

  private updateSessionDuration() {
    const duration = Math.floor((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    this.sessionDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private getFilteredMessagesCount(): number {
    let count = 0;
    if (this.showSSE) {
      count += this.streamService.sseContent()
        .split('\n')
        .filter(msg => msg.includes(this.searchTerm))
        .length;
    }
    if (this.showSocket) {
      count += this.streamService.socketContent()
        .split('\n')
        .filter(msg => msg.includes(this.searchTerm))
        .length;
    }
    return count;
  }

  private calculateAverageMessageLength(): number {
    let totalLength = 0;
    let messageCount = 0;

    if (this.showSSE) {
      const sseMessages = this.streamService.sseContent()
        .split('\n')
        .filter(msg => msg.includes(this.searchTerm));
      totalLength += sseMessages.reduce((acc, msg) => acc + msg.length, 0);
      messageCount += sseMessages.length;
    }

    if (this.showSocket) {
      const socketMessages = this.streamService.socketContent()
        .split('\n')
        .filter(msg => msg.includes(this.searchTerm));
      totalLength += socketMessages.reduce((acc, msg) => acc + msg.length, 0);
      messageCount += socketMessages.length;
    }

    return messageCount > 0 ? Math.round(totalLength / messageCount) : 0;
  }

  toggleSSE(value: boolean) {
    this.showSSE = value;
    this.updateFilters();
  }

  toggleSocket(value: boolean) {
    this.showSocket = value;
    this.updateFilters();
  }

  updateFilters() {
    this.updateStatistics();
  }

  exportData() {
    const data = {
      timestamp: new Date().toISOString(),
      statistics: this.streamService.getStreamStats(),
      sseMessages: this.showSSE ? this.streamService.sseContent() : null,
      socketMessages: this.showSocket ? this.streamService.socketContent() : null,
      filters: {
        searchTerm: this.searchTerm,
        showSSE: this.showSSE,
        showSocket: this.showSocket
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stream-data-${new Date().toISOString()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  clearData() {
    if (confirm('Are you sure you want to clear all stream data?')) {
      this.streamService['clearAllData']();
      this.searchTerm = '';
      this.updateFilters();
    }
  }

  ngOnDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}