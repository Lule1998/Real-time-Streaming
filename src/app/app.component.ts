import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { StreamingService } from './services/streaming.service';
import { StreamMonitorComponent } from './components/stream-monitor/stream-monitor.component';
import { StreamGraphComponent } from './components/stream-graph/stream-graph.component';
import { MessageManagerComponent } from './components/message-manager/message-manager.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    StreamMonitorComponent,
    StreamGraphComponent,
    MessageManagerComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="container mx-auto px-4 max-w-7xl">
        <!-- Header -->
        <header class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-800">
            Real-time Streaming Demo
          </h1>
          <p class="mt-2 text-gray-600">
            Monitor and analyze SSE and Socket.io streams in real-time
          </p>
        </header>

        <!-- Connection Status Bar -->
        <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-6">
              <!-- Connection Indicator -->
              <div class="flex items-center">
                <div class="w-3 h-3 rounded-full mr-2"
                     [class.bg-green-500]="streamingService.isConnected()"
                     [class.bg-red-500]="!streamingService.isConnected()">
                </div>
                <span class="text-sm font-medium">
                  {{ streamingService.isConnected() ? 'Connected' : 'Disconnected' }}
                </span>
              </div>
              
              <!-- Message Counter -->
              <div class="text-sm text-gray-600">
                Messages: {{ streamingService.messageCount() }}
              </div>
              
              <!-- Active Streams -->
              <div class="text-sm text-gray-600">
                Active Streams: {{ activeStreams() }}
              </div>
            </div>

            <!-- Reconnect Button -->
            @if (!streamingService.isConnected()) {
              <button 
                (click)="reconnect()"
                class="text-sm text-blue-500 hover:text-blue-700 flex items-center 
                       transition-colors">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reconnect
              </button>
            }
          </div>
        </div>

        <!-- Stream Controls -->
        <div class="grid gap-6 md:grid-cols-2 mb-6">
          <!-- SSE Section -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold text-gray-700">
                Server-Sent Events (SSE)
              </h2>
              <div class="px-3 py-1 rounded-full text-sm"
                   [class.bg-green-100.text-green-800]="streamingService.isSSEActive()"
                   [class.bg-gray-100.text-gray-600]="!streamingService.isSSEActive()">
                {{ streamingService.sseStatus() }}
              </div>
            </div>
            
            <div class="flex space-x-3 mb-4">
              <button 
                (click)="startSSE()"
                [disabled]="streamingService.isLoading() || streamingService.isSSEActive()"
                class="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md
                       hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start SSE
              </button>
              
              <button 
                (click)="stopSSE()"
                [disabled]="!streamingService.isSSEActive()"
                class="flex items-center px-4 py-2 bg-red-500 text-white rounded-md
                       hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop SSE
              </button>
            </div>
            
            <div class="border rounded-lg p-4 min-h-[150px] bg-gray-50 font-mono text-sm 
                        overflow-auto">
              {{ streamingService.sseContent() || 'Waiting for SSE messages...' }}
            </div>
          </div>

          <!-- Socket.io Section -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold text-gray-700">
                Socket.io Stream
              </h2>
              <div class="px-3 py-1 rounded-full text-sm"
                   [class.bg-green-100.text-green-800]="streamingService.isSocketActive()"
                   [class.bg-gray-100.text-gray-600]="!streamingService.isSocketActive()">
                {{ streamingService.socketStatus() }}
              </div>
            </div>
            
            <div class="flex space-x-3 mb-4">
              <button 
                (click)="startSocket()"
                [disabled]="streamingService.isLoading() || streamingService.isSocketActive()"
                class="flex items-center px-4 py-2 bg-green-500 text-white rounded-md
                       hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Socket.io
              </button>
              
              <button 
                (click)="stopSocket()"
                [disabled]="!streamingService.isSocketActive()"
                class="flex items-center px-4 py-2 bg-red-500 text-white rounded-md
                       hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop Socket.io
              </button>
            </div>
            
            <div class="border rounded-lg p-4 min-h-[150px] bg-gray-50 font-mono text-sm 
                        overflow-auto">
              {{ streamingService.socketContent() || 'Waiting for Socket.io messages...' }}
            </div>
          </div>
        </div>

        <!-- Stream Monitor -->
        <app-stream-monitor></app-stream-monitor>

        <!-- Stream Graph -->
        <app-stream-graph></app-stream-graph>

        <!-- Message Manager -->
        <app-message-manager></app-message-manager>

        <!-- Error Display -->
        @if (streamingService.error()) {
          <div class="fixed top-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700
                      p-4 rounded shadow-lg max-w-md animate-slide-in">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{{ streamingService.error() }}</span>
              </div>
              <button 
                (click)="clearError()"
                class="ml-4 text-red-700 hover:text-red-900 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        }

        <!-- Loading Indicator -->
        @if (streamingService.isLoading()) {
          <div class="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md
                      shadow-lg animate-pulse flex items-center space-x-2">
            <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" 
                      stroke-width="4" />
              <path class="opacity-75" fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Streaming in progress...</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background-color: #f9fafb;
    }

    .animate-slide-in {
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `]
})
export class AppComponent implements OnDestroy {
  protected streamingService = inject(StreamingService);

  activeStreams(): number {
    return (this.streamingService.isSSEActive() ? 1 : 0) + 
           (this.streamingService.isSocketActive() ? 1 : 0);
  }

  startSSE(): void {
    this.streamingService.startSSEStream();
  }

  stopSSE(): void {
    this.streamingService.stopSSEStream();
  }

  startSocket(): void {
    this.streamingService.startSocketStream();
  }

  stopSocket(): void {
    this.streamingService.stopSocketStream();
  }

  reconnect(): void {
    this.streamingService.reconnect();
  }

  clearError(): void {
    this.streamingService.clearError();
  }

  ngOnDestroy(): void {
    this.streamingService.disconnect();
  }
}