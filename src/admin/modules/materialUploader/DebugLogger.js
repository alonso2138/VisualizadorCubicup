// Debug and logging utilities for MaterialUploader
export class DebugLogger {
    constructor(debugMode = false) {
        this.debugMode = debugMode;
    }

    log(message, type = 'info', data = null) {
        if (!this.debugMode) return;
        
        const timestamp = new Date().toISOString();
        const prefix = `[MaterialUploader ${timestamp}]`;
        
        switch(type) {
            case 'error':
                console.error(prefix, message, data);
                break;
            case 'warn':
                console.warn(prefix, message, data);
                break;
            default:
                console.log(prefix, message, data);
        }
    }

    enableDebugMode() {
        this.debugMode = true;
        this.log('Debug mode enabled', 'info');
        console.log('MaterialUploader debug mode enabled.');
    }

    disableDebugMode() {
        this.debugMode = false;
        console.log('MaterialUploader debug mode disabled');
    }

    enableTemporaryLogging(duration = 10000) {
        this.debugMode = true;
        this.log('Temporary logging enabled', 'info');
        
        setTimeout(() => {
            this.debugMode = false;
            console.log('Temporary logging disabled');
        }, duration);
    }
}
