/**
 * Browser console logger with backend sync
 * Captures all console logs and sends them to the backend
 */

interface LogEntry {
  type: 'log' | 'error' | 'warn' | 'info';
  message: any[];
  timestamp: string;
  url: string;
  userAgent: string;
}

class ConsoleLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;
  private backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  private originalError?: (...args: any[]) => void;

  constructor() {
    this.initializeLogger();
  }

  private initializeLogger() {
    if (typeof window === 'undefined') {
      return;
    }

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    this.originalError = originalError;

    console.log = (...args: any[]) => {
      originalLog(...args);
      this.captureLog('log', args);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      this.captureLog('error', args);
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      this.captureLog('warn', args);
    };

    console.info = (...args: any[]) => {
      originalInfo(...args);
      this.captureLog('info', args);
    };

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.captureLog('error', [
        `Unhandled Error: ${event.error?.message || event.message}`,
        event.error,
      ]);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureLog('error', [
        `Unhandled Rejection: ${event.reason}`,
      ]);
    });
  }

  private captureLog(type: 'log' | 'error' | 'warn' | 'info', message: any[]) {
    const entry: LogEntry = {
      type,
      message,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    this.logs.push(entry);

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Send error logs immediately to backend
    if (type === 'error') {
      this.sendToBackend([entry]);
    }
  }

  private async sendToBackend(entries: LogEntry[]) {
    try {
      await fetch(`${this.backendUrl}/api/logs/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: entries }),
      });
    } catch (err) {
      // Fail silently - don't create recursive errors
      this.originalError?.('Failed to send logs to backend:', err);
    }
  }

  public getLogs(): LogEntry[] {
    return this.logs;
  }

  public downloadLogs() {
    const text = this.logs
      .map(
        (l) =>
          `[${l.timestamp}] ${l.type.toUpperCase()}: ${JSON.stringify(l.message)}`
      )
      .join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  public clearLogs() {
    this.logs = [];
  }

  public sendAllLogs() {
    this.sendToBackend(this.logs);
  }
}

// Create singleton instance
const logger = new ConsoleLogger();

// Expose to window for manual access
if (typeof window !== 'undefined') {
  (window as any).logger = {
    getLogs: () => logger.getLogs(),
    downloadLogs: () => logger.downloadLogs(),
    clearLogs: () => logger.clearLogs(),
    sendAllLogs: () => logger.sendAllLogs(),
  };
}

export default logger;
