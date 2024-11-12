import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StreamingService } from '../../services/streaming.service';

@Component({
  selector: 'app-stream-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-md p-6 mt-6">
      <h2 class="text-xl font-semibold mb-4 text-gray-700">
        Stream Monitor
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <!-- Message Rate -->
        <div class="bg-blue-50 rounded-lg p-4">
          <div class="text-sm text-blue-600 mb-1">Message Rate</div>
          <div class="text-2xl font-bold text-blue-700">
            {{ streamService.messageRate() }}/s
          </div>
        </div>

        <!-- Total Messages -->
        <div class="bg-green-50 rounded-lg p-4">
          <div class="text-sm text-green-600 mb-1">Total Messages</div>
          <div class="text-2xl font-bold text-green-700">
            {{ streamService.messageCount() }}
          </div>
        </div>

        <!-- Active Streams -->
        <div class="bg-purple-50 rounded-lg p-4">
          <div class="text-sm text-purple-600 mb-1">Active Streams</div>
          <div class="text-2xl font-bold text-purple-700">
            {{ activeStreamsCount() }}
          </div>
        </div>
      </div>

      <!-- Stream Status -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- SSE Status -->
        <div class="border rounded-lg p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-600">SSE Stream</span>
            <span 
              class="text-xs px-2 py-1 rounded-full"
              [ngClass]="{
                'bg-green-100 text-green-800': streamService.isSSEActive(),
                'bg-gray-100 text-gray-800': !streamService.isSSEActive()
              }">
              {{ streamService.sseStatus() }}
            </span>
          </div>
          <div class="text-sm text-gray-500">
            Last message: {{ streamService.lastSSEMessage() || 'No messages' }}
          </div>
        </div>

        <!-- Socket.io Status -->
        <div class="border rounded-lg p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-600">Socket.io Stream</span>
            <span 
              class="text-xs px-2 py-1 rounded-full"
              [ngClass]="{
                'bg-green-100 text-green-800': streamService.isSocketActive(),
                'bg-gray-100 text-gray-800': !streamService.isSocketActive()
              }">
              {{ streamService.socketStatus() }}
            </span>
          </div>
          <div class="text-sm text-gray-500">
            Last message: {{ streamService.lastSocketMessage() || 'No messages' }}
          </div>
        </div>
      </div>
    </div>
  `
})
export class StreamMonitorComponent implements OnDestroy {
  protected streamService = inject(StreamingService);

  activeStreamsCount(): number {
    return (this.streamService.isSSEActive() ? 1 : 0) + 
           (this.streamService.isSocketActive() ? 1 : 0);
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }
}