// src/app/services/streaming.service.ts
import { Injectable, signal, computed, effect } from '@angular/core';
import { io, Socket } from 'socket.io-client';

interface StreamStats {
  messageCount: number;
  startTime: number;
  lastMessageTime: number | null;
  bytesSent: number;
  averageMessageSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class StreamingService {
  private socket!: Socket;
  private eventSource: EventSource | null = null;
  private readonly baseUrl = 'http://localhost:3000';
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private reconnectCount = 0;
  private reconnectTimeout: any;

  // Core state signals
  private _isConnected = signal<boolean>(false);
  private _messageCount = signal<number>(0);
  private _sseActive = signal<boolean>(false);
  private _socketActive = signal<boolean>(false);
  private _messageRate = signal<number>(0);

  // Stats signals
  private _sseStats = signal<StreamStats>({
    messageCount: 0,
    startTime: 0,
    lastMessageTime: null,
    bytesSent: 0,
    averageMessageSize: 0
  });

  private _socketStats = signal<StreamStats>({
    messageCount: 0,
    startTime: 0,
    lastMessageTime: null,
    bytesSent: 0,
    averageMessageSize: 0
  });

  // UI state signals
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  sseContent = signal<string>('');
  socketContent = signal<string>('');
  lastSSEMessage = signal<string>('');
  lastSocketMessage = signal<string>('');

  // Computed signals
  isConnected = computed(() => this._isConnected());
  messageCount = computed(() => this._messageCount());
  messageRate = computed(() => this._messageRate());
  isSSEActive = computed(() => this._sseActive());
  isSocketActive = computed(() => this._socketActive());

  sseStatus = computed(() => {
    if (this._sseActive()) {
      const stats = this._sseStats();
      const duration = Math.floor((Date.now() - stats.startTime) / 1000);
      return `Active (${duration}s, ${stats.messageCount} msgs)`;
    }
    if (this.isLoading()) return 'Connecting...';
    return 'Inactive';
  });

  socketStatus = computed(() => {
    if (this._socketActive()) {
      const stats = this._socketStats();
      const duration = Math.floor((Date.now() - stats.startTime) / 1000);
      return `Active (${duration}s, ${stats.messageCount} msgs)`;
    }
    if (this.isLoading()) return 'Connecting...';
    return 'Inactive';
  });

  constructor() {
    this.initializeSocket();
    this.setupAutoReconnect();
    this.startPerformanceMonitoring();
  }

  private initializeSocket(): void {
    this.socket = io(this.baseUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.MAX_RECONNECT_ATTEMPTS,
      timeout: 10000
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this._isConnected.set(true);
      this.error.set(null);
      this.reconnectCount = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this._isConnected.set(false);
      if (this._socketActive()) {
        this.error.set('Connection lost. Attempting to reconnect...');
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Connection error:', error);
      this.handleError(`Connection error: ${error.message}`);
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      this.handleError('Socket connection error occurred');
    });
  }

  private setupAutoReconnect(): void {
    effect(() => {
      if (!this._isConnected() && (this._socketActive() || this._sseActive())) {
        this.attemptReconnect();
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectCount < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectCount++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectCount - 1), 10000);
      
      console.log(`Attempting reconnect ${this.reconnectCount}/${this.MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }

      this.reconnectTimeout = setTimeout(() => {
        this.reconnect();
      }, delay);
    } else {
      this.handleError('Maximum reconnection attempts reached');
      this.stopAllStreams();
    }
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updateMessageRate();
    }, 1000);
  }

  private updateMessageRate(): void {
    const now = Date.now();
    const timeWindow = 5000; // 5 second window for rate calculation

    const sseStats = this._sseStats();
    const socketStats = this._socketStats();

    let recentMessages = 0;

    if (sseStats.lastMessageTime && now - sseStats.lastMessageTime < timeWindow) {
      recentMessages += sseStats.messageCount;
    }

    if (socketStats.lastMessageTime && now - socketStats.lastMessageTime < timeWindow) {
      recentMessages += socketStats.messageCount;
    }

    this._messageRate.set(Math.round((recentMessages / timeWindow) * 1000));
  }

  startSSEStream(): void {
    if (this.eventSource) {
      this.stopSSEStream();
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.sseContent.set('');
    this._sseActive.set(true);
    this._sseStats.set({
      messageCount: 0,
      startTime: Date.now(),
      lastMessageTime: null,
      bytesSent: 0,
      averageMessageSize: 0
    });

    try {
      this.eventSource = new EventSource(`${this.baseUrl}/stream`);

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.done) {
            this.stopSSEStream();
          } else if (data.text) {
            this.lastSSEMessage.set(data.text);
            this.sseContent.update(current => current + data.text);
            this._messageCount.update(count => count + 1);
            
            this._sseStats.update(stats => ({
              ...stats,
              messageCount: stats.messageCount + 1,
              lastMessageTime: Date.now(),
              bytesSent: stats.bytesSent + event.data.length,
              averageMessageSize: Math.round((stats.bytesSent + event.data.length) / (stats.messageCount + 1))
            }));
          }
        } catch (error) {
          this.handleError('Error processing SSE message');
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        this.handleError('Error receiving SSE stream');
        this.stopSSEStream();
      };

    } catch (error) {
      this.handleError('Failed to start SSE stream');
      this.stopSSEStream();
    }
  }

  startSocketStream(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.socketContent.set('');
    this._socketActive.set(true);
    this._socketStats.set({
      messageCount: 0,
      startTime: Date.now(),
      lastMessageTime: null,
      bytesSent: 0,
      averageMessageSize: 0
    });

    this.socket.emit('startStream');

    this.socket.on('streamData', (data: { text: string }) => {
      if (data.text) {
        this.lastSocketMessage.set(data.text);
        this.socketContent.update(current => current + data.text);
        this._messageCount.update(count => count + 1);
        
        const messageSize = JSON.stringify(data).length;
        this._socketStats.update(stats => ({
          ...stats,
          messageCount: stats.messageCount + 1,
          lastMessageTime: Date.now(),
          bytesSent: stats.bytesSent + messageSize,
          averageMessageSize: Math.round((stats.bytesSent + messageSize) / (stats.messageCount + 1))
        }));
      }
    });

    this.socket.on('streamEnd', () => {
      this.stopSocketStream();
    });
  }

  stopSSEStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this._sseActive.set(false);
    this.isLoading.set(false);
  }

  stopSocketStream(): void {
    this.socket.off('streamData');
    this.socket.off('streamEnd');
    this._socketActive.set(false);
    this.isLoading.set(false);
  }

  private stopAllStreams(): void {
    this.stopSSEStream();
    this.stopSocketStream();
  }

  reconnect(): void {
    console.log('Attempting manual reconnect...');
    if (!this._isConnected()) {
      this.socket.connect();
    }
  }

  private handleError(message: string): void {
    console.error(message);
    this.error.set(message);
    this.isLoading.set(false);
  }

  clearError(): void {
    this.error.set(null);
  }

  getStreamStats() {
    return {
      sse: this._sseStats(),
      socket: this._socketStats(),
      total: {
        messageCount: this._messageCount(),
        messageRate: this._messageRate(),
        sseActive: this._sseActive(),
        socketActive: this._socketActive(),
        isConnected: this._isConnected()
      }
    };
  }

  getConnectionStatus() {
    return {
      connected: this._isConnected(),
      sseActive: this._sseActive(),
      socketActive: this._socketActive(),
      reconnectAttempts: this.reconnectCount
    };
  }

  clearAllData(): void {
    this.stopAllStreams();
    this.sseContent.set('');
    this.socketContent.set('');
    this._messageCount.set(0);
    this._messageRate.set(0);
    this.lastSSEMessage.set('');
    this.lastSocketMessage.set('');
    this._sseStats.set({
      messageCount: 0,
      startTime: 0,
      lastMessageTime: null,
      bytesSent: 0,
      averageMessageSize: 0
    });
    this._socketStats.set({
      messageCount: 0,
      startTime: 0,
      lastMessageTime: null,
      bytesSent: 0,
      averageMessageSize: 0
    });
  }

  disconnect(): void {
    this.stopAllStreams();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.socket.disconnect();
  }
}