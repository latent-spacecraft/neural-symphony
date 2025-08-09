const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Utility helpers for Neural Symphony
 */

// Generate unique request ID
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate session ID
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

// Validate model name
function isValidModelName(name) {
    return /^[a-zA-Z0-9_-]+$/.test(name) && name.length > 0 && name.length < 100;
}

// Validate prompt input
function validatePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
        return { valid: false, error: 'Prompt must be a non-empty string' };
    }
    
    if (prompt.length > 50000) {
        return { valid: false, error: 'Prompt too long (max 50,000 characters)' };
    }
    
    if (prompt.trim().length === 0) {
        return { valid: false, error: 'Prompt cannot be empty or whitespace only' };
    }
    
    return { valid: true };
}

// Validate generation parameters
function validateGenerationParams(params) {
    const errors = [];
    
    if (params.temperature !== undefined) {
        if (typeof params.temperature !== 'number' || params.temperature < 0 || params.temperature > 2) {
            errors.push('Temperature must be a number between 0 and 2');
        }
    }
    
    if (params.topP !== undefined) {
        if (typeof params.topP !== 'number' || params.topP < 0 || params.topP > 1) {
            errors.push('Top-p must be a number between 0 and 1');
        }
    }
    
    if (params.maxTokens !== undefined) {
        if (typeof params.maxTokens !== 'number' || params.maxTokens < 1 || params.maxTokens > 8192) {
            errors.push('Max tokens must be a number between 1 and 8192');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Format duration
function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
}

// Safe JSON parse
function safeJsonParse(str, defaultValue = null) {
    try {
        return JSON.parse(str);
    } catch {
        return defaultValue;
    }
}

// Sleep utility
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry with exponential backoff
async function retry(fn, options = {}) {
    const {
        maxAttempts = 3,
        baseDelay = 1000,
        maxDelay = 10000,
        exponential = true
    } = options;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === maxAttempts) {
                throw error;
            }
            
            const delay = exponential 
                ? Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
                : baseDelay;
            
            await sleep(delay);
        }
    }
}

// Check if file exists and is readable
function isFileReadable(filepath) {
    try {
        fs.accessSync(filepath, fs.constants.R_OK);
        return true;
    } catch {
        return false;
    }
}

// Get model file info
function getModelInfo(modelPath) {
    if (!modelPath || !isFileReadable(modelPath)) {
        return null;
    }
    
    try {
        const stats = fs.statSync(modelPath);
        return {
            exists: true,
            size: stats.size,
            sizeFormatted: formatFileSize(stats.size),
            modified: stats.mtime,
            isDirectory: stats.isDirectory()
        };
    } catch {
        return { exists: false };
    }
}

// Sanitize filename
function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-z0-9.-]/gi, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '')
        .toLowerCase();
}

// Deep merge objects
function deepMerge(target, source) {
    const output = { ...target };
    
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            output[key] = deepMerge(output[key] || {}, source[key]);
        } else {
            output[key] = source[key];
        }
    }
    
    return output;
}

// Truncate string with ellipsis
function truncateString(str, maxLength, ellipsis = '...') {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - ellipsis.length) + ellipsis;
}

// Extract reasoning channels from GPT-oss response
function parseReasoningChannels(text) {
    const analysisMatch = text.match(/<analysis>(.*?)<\/analysis>/s);
    const finalMatch = text.match(/<final>(.*?)<\/final>/s);
    
    return {
        hasChannels: !!(analysisMatch || finalMatch),
        analysis: analysisMatch ? analysisMatch[1].trim() : '',
        final: finalMatch ? finalMatch[1].trim() : '',
        raw: text
    };
}

// Calculate token estimate (rough approximation)
function estimateTokens(text) {
    // Rough approximation: 1 token ≈ 4 characters for English
    return Math.ceil(text.length / 4);
}

// Rate limiter utility
class RateLimiter {
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = new Map();
    }
    
    isAllowed(identifier) {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        
        if (!this.requests.has(identifier)) {
            this.requests.set(identifier, []);
        }
        
        const userRequests = this.requests.get(identifier);
        
        // Clean old requests
        const validRequests = userRequests.filter(time => time > windowStart);
        this.requests.set(identifier, validRequests);
        
        // Check if under limit
        if (validRequests.length < this.maxRequests) {
            validRequests.push(now);
            return true;
        }
        
        return false;
    }
    
    getStatus(identifier) {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        const userRequests = this.requests.get(identifier) || [];
        const validRequests = userRequests.filter(time => time > windowStart);
        
        return {
            remaining: Math.max(0, this.maxRequests - validRequests.length),
            resetTime: validRequests.length > 0 ? validRequests[0] + this.windowMs : now + this.windowMs
        };
    }
}

module.exports = {
    generateRequestId,
    generateSessionId,
    isValidModelName,
    validatePrompt,
    validateGenerationParams,
    formatFileSize,
    formatDuration,
    safeJsonParse,
    sleep,
    retry,
    isFileReadable,
    getModelInfo,
    sanitizeFilename,
    deepMerge,
    truncateString,
    parseReasoningChannels,
    estimateTokens,
    RateLimiter
};