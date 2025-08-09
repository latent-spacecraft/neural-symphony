const fs = require('fs');
const path = require('path');

class Logger {
    constructor(options = {}) {
        this.level = options.level || process.env.LOG_LEVEL || 'info';
        this.logDir = options.logDir || process.env.LOG_DIR || './logs';
        this.filename = options.filename || 'neural-symphony.log';
        this.console = options.console !== false; // Default to true
        
        // Ensure log directory exists
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        
        this.logFile = path.join(this.logDir, this.filename);
        
        // Log levels
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        
        this.currentLevel = this.levels[this.level] || this.levels.info;
    }
    
    formatMessage(level, message, metadata = {}) {
        const timestamp = new Date().toISOString();
        const meta = Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : '';
        return `${timestamp} [${level.toUpperCase()}] ${message}${meta}`;
    }
    
    writeToFile(formattedMessage) {
        try {
            fs.appendFileSync(this.logFile, formattedMessage + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    
    log(level, message, metadata = {}) {
        if (this.levels[level] > this.currentLevel) {
            return;
        }
        
        const formattedMessage = this.formatMessage(level, message, metadata);
        
        if (this.console) {
            if (level === 'error') {
                console.error(formattedMessage);
            } else if (level === 'warn') {
                console.warn(formattedMessage);
            } else {
                console.log(formattedMessage);
            }
        }
        
        this.writeToFile(formattedMessage);
    }
    
    error(message, metadata = {}) {
        this.log('error', message, metadata);
    }
    
    warn(message, metadata = {}) {
        this.log('warn', message, metadata);
    }
    
    info(message, metadata = {}) {
        this.log('info', message, metadata);
    }
    
    debug(message, metadata = {}) {
        this.log('debug', message, metadata);
    }
    
    // Request logging helper
    logRequest(req, res, duration) {
        const metadata = {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.headers['user-agent'],
            ip: req.ip || req.connection.remoteAddress
        };
        
        this.info('HTTP Request', metadata);
    }
    
    // AI generation logging
    logGeneration(prompt, response, duration, error = null) {
        const metadata = {
            promptLength: prompt.length,
            responseLength: response ? response.length : 0,
            duration: `${duration}ms`,
            error: error ? error.message : null
        };
        
        if (error) {
            this.error('AI Generation Failed', metadata);
        } else {
            this.info('AI Generation Completed', metadata);
        }
    }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;