import { Injectable } from '@angular/core';
import { Observable, throwError, timer } from 'rxjs';
import { retryWhen, mergeMap } from 'rxjs/operators';
import { STREAM_CONFIG } from '../config/stream.config';

@Injectable({
  providedIn: 'root'
})
export class RetryService {
  
  getRetryStrategy() {
    let retries = 0;
    
    return retryWhen(errors =>
      errors.pipe(
        mergeMap(error => {
          retries++;
          
          if (retries <= STREAM_CONFIG.MAX_RETRIES) {
            console.log(`Retry attempt ${retries}`);
            const backoffTime = STREAM_CONFIG.RETRY_DELAY * Math.pow(2, retries - 1);
            return timer(backoffTime);
          }
          
          return throwError(() => new Error(
            `Failed after ${STREAM_CONFIG.MAX_RETRIES} retries. Last error: ${error.message}`
          ));
        })
      )
    );
  }

  

  getSSERetryStrategy(eventSource: EventSource) {
    return new Promise((resolve, reject) => {
      let retries = 0;
      
      const retry = () => {
        if (retries >= STREAM_CONFIG.MAX_RETRIES) {
          reject(new Error(`Failed after ${STREAM_CONFIG.MAX_RETRIES} retries`));
          return;
        }

        retries++;
        console.log(`SSE retry attempt ${retries}`);
        
        eventSource.close();
        
        setTimeout(() => {
          resolve(true);
        }, STREAM_CONFIG.RETRY_DELAY * Math.pow(2, retries - 1));
      };

      eventSource.onerror = () => retry();
    });
  }

  
  getSocketRetryStrategy(socket: any) {
    return new Promise((resolve, reject) => {
      let retries = 0;
      
      const attemptReconnect = () => {
        if (retries >= STREAM_CONFIG.MAX_RETRIES) {
          reject(new Error(`Failed after ${STREAM_CONFIG.MAX_RETRIES} socket retries`));
          return;
        }

        retries++;
        console.log(`Socket.io retry attempt ${retries}`);
        
        setTimeout(() => {
          socket.connect();
        }, STREAM_CONFIG.RETRY_DELAY * Math.pow(2, retries - 1));
      };

      socket.on('connect_error', attemptReconnect);
      socket.on('connect', () => {
        socket.off('connect_error', attemptReconnect);
        resolve(true);
      });
    });
  }
}