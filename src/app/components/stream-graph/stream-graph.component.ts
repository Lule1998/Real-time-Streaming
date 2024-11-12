import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StreamingService } from '../../services/streaming.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-stream-graph',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-md p-6 mt-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold text-gray-700">Real-time Message Rate</h2>
        <div class="flex space-x-4">
          <div class="flex items-center">
            <div class="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span class="text-sm text-gray-600">SSE</span>
          </div>
          <div class="flex items-center">
            <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span class="text-sm text-gray-600">Socket.io</span>
          </div>
          <div class="flex items-center">
            <div class="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
            <span class="text-sm text-gray-600">Total</span>
          </div>
        </div>
      </div>

      <div class="w-full h-64">
        <canvas #chartCanvas></canvas>
      </div>

      <div class="grid grid-cols-3 gap-4 mt-6">
        <!-- SSE Stats -->
        <div class="bg-blue-50 rounded-lg p-4">
          <div class="text-sm text-blue-600 mb-1">SSE Messages</div>
          <div class="text-2xl font-bold text-blue-700">
            {{ sseStats.messageCount }}
          </div>
          <div class="text-sm text-blue-600 mt-2">
            Avg Size: {{ sseStats.averageSize }} bytes
          </div>
        </div>

        <!-- Socket.io Stats -->
        <div class="bg-green-50 rounded-lg p-4">
          <div class="text-sm text-green-600 mb-1">Socket.io Messages</div>
          <div class="text-2xl font-bold text-green-700">
            {{ socketStats.messageCount }}
          </div>
          <div class="text-sm text-green-600 mt-2">
            Avg Size: {{ socketStats.averageSize }} bytes
          </div>
        </div>

        <!-- Total Stats -->
        <div class="bg-purple-50 rounded-lg p-4">
          <div class="text-sm text-purple-600 mb-1">Total Throughput</div>
          <div class="text-2xl font-bold text-purple-700">
            {{ totalThroughput }} KB/s
          </div>
          <div class="text-sm text-purple-600 mt-2">
            Peak: {{ peakThroughput }} KB/s
          </div>
        </div>
      </div>
    </div>
  `
})
export class StreamGraphComponent implements OnInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef;
  
  private streamingService = inject(StreamingService);
  private chart: Chart | null = null;
  private updateInterval: any;

  sseStats = { messageCount: 0, averageSize: 0 };
  socketStats = { messageCount: 0, averageSize: 0 };
  totalThroughput = 0;
  peakThroughput = 0;

  private labels: string[] = [];
  private sseData: number[] = [];
  private socketData: number[] = [];
  private totalData: number[] = [];

  ngOnInit() {
    setTimeout(() => {
      this.initializeChart();
      this.startMonitoring();
    });
  }

  private initializeChart() {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.labels,
        datasets: [
          {
            label: 'SSE Rate',
            data: this.sseData,
            borderColor: '#3B82F6',
            tension: 0.4,
            fill: false
          },
          {
            label: 'Socket.io Rate',
            data: this.socketData,
            borderColor: '#10B981',
            tension: 0.4,
            fill: false
          },
          {
            label: 'Total Rate',
            data: this.totalData,
            borderColor: '#8B5CF6',
            tension: 0.4,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  private startMonitoring() {
    this.updateInterval = setInterval(() => {
      const stats = this.streamingService.getStreamStats();
      const now = new Date().toLocaleTimeString();

      // Update data arrays
      this.labels.push(now);
      this.sseData.push(stats.sse.messageCount - (this.sseStats.messageCount || 0));
      this.socketData.push(stats.socket.messageCount - (this.socketStats.messageCount || 0));
      this.totalData.push(stats.total.messageRate);

      // Keep last 30 points
      if (this.labels.length > 30) {
        this.labels.shift();
        this.sseData.shift();
        this.socketData.shift();
        this.totalData.shift();
      }

      // Update chart
      if (this.chart) {
        this.chart.update('none');
      }

      // Update stats
      this.sseStats = {
        messageCount: stats.sse.messageCount,
        averageSize: stats.sse.averageMessageSize
      };

      this.socketStats = {
        messageCount: stats.socket.messageCount,
        averageSize: stats.socket.averageMessageSize
      };

      // Calculate throughput
      const currentThroughput = 
        (stats.sse.bytesSent + stats.socket.bytesSent) / 1024;
      this.totalThroughput = Math.round(currentThroughput * 100) / 100;
      this.peakThroughput = Math.max(this.peakThroughput, this.totalThroughput);

    }, 1000);
  }

  ngOnDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.chart) {
      this.chart.destroy();
    }
  }
}