import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StreamingService } from '../../services/streaming.service';

interface TimeRange {
    start: Date | null;
    end: Date | null;
  }
  
interface MessageGroup {
    label: string;
    messages: Message[];
    count: number;
  }


interface Message {
  id: number;
  type: 'sse' | 'socket';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-message-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow-md p-6 mt-6">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold text-gray-700">Message Manager</h2>
        
        <!-- Actions -->
        <div class="flex space-x-2">
          <button 
            (click)="exportMessages()"
            class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Export
          </button>
          <button 
            (click)="clearMessages()"
            class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            Clear All
          </button>
        </div>
      </div>

     <!-- Filters -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
  <!-- Postojeći filteri -->
  <div class="flex space-x-4">
    <!-- Search -->
    <input 
      type="text"
      [(ngModel)]="searchTerm"
      (ngModelChange)="filterMessages()"
      placeholder="Search messages..."
      class="px-4 py-2 border border-gray-300 rounded-md flex-grow"
    >
  </div>

  <!-- Type Filters -->
  <div class="flex items-center space-x-4">
    <label class="flex items-center">
      <input 
        type="checkbox"
        [(ngModel)]="showSSE"
        (change)="filterMessages()"
        class="mr-2"
      >
      <span>SSE</span>
    </label>
    <label class="flex items-center">
      <input 
        type="checkbox"
        [(ngModel)]="showSocket"
        (change)="filterMessages()"
        class="mr-2"
      >
      <span>Socket.io</span>
    </label>
  </div>

  <!-- Grouping Dropdown -->
  <select 
    [(ngModel)]="groupingMode"
    (change)="applyGrouping()"
    class="px-4 py-2 border border-gray-300 rounded-md"
  >
    <option value="none">No Grouping</option>
    <option value="type">Group by Type</option>
    <option value="minute">Group by Minute</option>
    <option value="hour">Group by Hour</option>
  </select>
</div>

<!-- Time Range Filter -->
<div class="flex items-center space-x-4 mb-6">
  <div class="text-sm text-gray-600">Time Range:</div>
  <input 
    type="datetime-local"
    [(ngModel)]="timeRange.start"
    (change)="filterMessages()"
    class="px-4 py-2 border border-gray-300 rounded-md"
  >
  <span>to</span>
  <input 
    type="datetime-local"
    [(ngModel)]="timeRange.end"
    (change)="filterMessages()"
    class="px-4 py-2 border border-gray-300 rounded-md"
  >
  <button 
    (click)="clearTimeRange()"
    class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
  >
    Clear Range
  </button>
</div>

      <!-- Advanced Stats -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-blue-50 rounded-lg p-4">
          <div class="text-sm text-blue-600">Total Messages</div>
          <div class="text-2xl font-bold text-blue-700">
            {{ filteredMessages.length }}
          </div>
          <div class="text-sm text-blue-600 mt-1">
            Rate: {{ messageRate }}/s
          </div>
        </div>
        <div class="bg-green-50 rounded-lg p-4">
          <div class="text-sm text-green-600">Average Size</div>
          <div class="text-2xl font-bold text-green-700">
            {{ averageMessageSize }} chars
          </div>
          <div class="text-sm text-green-600 mt-1">
            Total: {{ totalMessageSize }} chars
          </div>
        </div>
        <div class="bg-purple-50 rounded-lg p-4">
          <div class="text-sm text-purple-600">Session Time</div>
          <div class="text-2xl font-bold text-purple-700">
            {{ sessionDuration }}
          </div>
          <div class="text-sm text-purple-600 mt-1">
            Started: {{ sessionStart | date:'HH:mm:ss' }}
          </div>
        </div>
        <div class="bg-yellow-50 rounded-lg p-4">
          <div class="text-sm text-yellow-600">Message Types</div>
          <div class="text-2xl font-bold text-yellow-700">
            {{ getSSECount() }}/{{ getSocketCount() }}
          </div>
          <div class="text-sm text-yellow-600 mt-1">
            SSE/Socket.io
          </div>
        </div>
      </div>

      <!-- Messages List -->
<div class="border rounded-lg">
  <div class="bg-gray-50 px-4 py-2 border-b">
    <div class="grid grid-cols-12 text-sm font-medium text-gray-500">
      <div class="col-span-2">Type</div>
      <div class="col-span-8">Message</div>
      <div class="col-span-2">Time</div>
    </div>
  </div>
  
  <div class="divide-y max-h-96 overflow-auto">
    @if (groupingMode === 'none') {
      @for (message of filteredMessages; track message.id) {
        <div class="px-4 py-2 grid grid-cols-12 items-center hover:bg-gray-50">
          <div class="col-span-2">
            <span 
              class="px-2 py-1 rounded-full text-xs"
              [class.bg-blue-100.text-blue-800]="message.type === 'sse'"
              [class.bg-green-100.text-green-800]="message.type === 'socket'"
            >
              {{ message.type === 'sse' ? 'SSE' : 'Socket' }}
            </span>
          </div>
          <div class="col-span-8 text-sm text-gray-600">
            {{ message.content }}
          </div>
          <div class="col-span-2 text-sm text-gray-500">
            {{ message.timestamp | date:'HH:mm:ss' }}
          </div>
        </div>
      }
    } @else {
      @for (group of messageGroups; track group.label) {
        <!-- Group Header -->
        <div class="bg-gray-100 px-4 py-2 flex justify-between items-center">
          <span class="font-medium text-gray-700">{{ group.label }}</span>
          <span class="text-sm text-gray-500">{{ group.count }} messages</span>
        </div>
        <!-- Group Messages -->
        @for (message of group.messages; track message.id) {
          <div class="px-4 py-2 grid grid-cols-12 items-center hover:bg-gray-50 pl-8">
            <div class="col-span-2">
              <span 
                class="px-2 py-1 rounded-full text-xs"
                [class.bg-blue-100.text-blue-800]="message.type === 'sse'"
                [class.bg-green-100.text-green-800]="message.type === 'socket'"
              >
                {{ message.type === 'sse' ? 'SSE' : 'Socket' }}
              </span>
            </div>
            <div class="col-span-8 text-sm text-gray-600">
              {{ message.content }}
            </div>
            <div class="col-span-2 text-sm text-gray-500">
              {{ message.timestamp | date:'HH:mm:ss' }}
            </div>
          </div>
        }
      }
    }

  </div>
</div>
  `
})
export class MessageManagerComponent implements OnInit, OnDestroy {
messageGroups: any;
clearTimeRange() {
throw new Error('Method not implemented.');
}
groupingMode: any;
timeRange: any;
applyGrouping() {
throw new Error('Method not implemented.');
}
  private streamingService = inject(StreamingService);
  private updateInterval: any;
  private rateMeasurementInterval: any;
  
  messages: Message[] = [];
  filteredMessages: Message[] = [];
  
  searchTerm = '';
  showSSE = true;
  showSocket = true;
  
  sessionStart = new Date();
  messageRate = 0;
  private lastMessageCount = 0;

  ngOnInit() {
    this.startMessageCapture();
    this.startRateMeasurement();
  }

  private startMessageCapture() {
    this.updateInterval = setInterval(() => {
      const sseMessage = this.streamingService.lastSSEMessage();
      const socketMessage = this.streamingService.lastSocketMessage();

      if (sseMessage) {
        this.addMessage('sse', sseMessage);
      }
      if (socketMessage) {
        this.addMessage('socket', socketMessage);
      }
    }, 100);
  }

  private startRateMeasurement() {
    this.rateMeasurementInterval = setInterval(() => {
      const currentCount = this.messages.length;
      this.messageRate = currentCount - this.lastMessageCount;
      this.lastMessageCount = currentCount;
    }, 1000);
  }

  private addMessage(type: 'sse' | 'socket', content: string) {
    // Provjeri da li već imamo ovu poruku
    if (this.messages.some(m => m.content === content)) {
      return;
    }

    const message: Message = {
      id: Date.now(),
      type,
      content,
      timestamp: new Date()
    };

    this.messages.push(message);
    this.filterMessages();
  }

  filterMessages() {
    this.filteredMessages = this.messages.filter(message => {
      const matchesSearch = message.content.toLowerCase()
        .includes(this.searchTerm.toLowerCase());
      const matchesType = 
        (this.showSSE && message.type === 'sse') || 
        (this.showSocket && message.type === 'socket');
      
      return matchesSearch && matchesType;
    });

    // Sortiraj poruke po vremenu, najnovije prve
    this.filteredMessages.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  get averageMessageSize(): number {
    if (this.filteredMessages.length === 0) return 0;
    return Math.round(this.totalMessageSize / this.filteredMessages.length);
  }

  get totalMessageSize(): number {
    return this.filteredMessages.reduce((sum, msg) => sum + msg.content.length, 0);
  }

  get sessionDuration(): string {
    const seconds = Math.floor((new Date().getTime() - this.sessionStart.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }

  getSSECount(): number {
    return this.filteredMessages.filter(m => m.type === 'sse').length;
  }

  getSocketCount(): number {
    return this.filteredMessages.filter(m => m.type === 'socket').length;
  }

  exportMessages(): void {
    const data = {
      timestamp: new Date().toISOString(),
      sessionInfo: {
        start: this.sessionStart.toISOString(),
        duration: this.sessionDuration,
        totalMessages: this.messages.length,
        sseCount: this.getSSECount(),
        socketCount: this.getSocketCount(),
        averageSize: this.averageMessageSize
      },
      messages: this.filteredMessages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString()
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stream-messages-${new Date().toISOString()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  clearMessages() {
    this.messages = [];
    this.filterMessages();
  }

  ngOnDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.rateMeasurementInterval) {
      clearInterval(this.rateMeasurementInterval);
    }
  }
}