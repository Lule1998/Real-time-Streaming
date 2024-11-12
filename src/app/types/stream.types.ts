export interface StreamResponse {
    text?: string;
    done?: boolean;
    error?: string;
  }
  
  export interface StreamState {
    isLoading: boolean;
    error: string | null;
    retryCount: number;
  }