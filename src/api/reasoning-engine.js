// Use Windows-optimized interface that supports both TensorRT-LLM and Transformers
const GPTOssInterface = process.platform === 'win32' 
    ? require('../models/gpt-oss-windows-interface')
    : require('../models/gpt-oss-interface');
const HarmonyParser = require('../parsers/harmony-parser');
const EventEmitter = require('events');

class ReasoningEngine extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.model = new GPTOssInterface(config);
        this.parser = new HarmonyParser();
        
        this.reasoningProfiles = {
            low: {
                temperature: 0.3,
                maxTokens: 512,
                systemPrompt: 'Provide a concise response with minimal reasoning steps.',
                guidedDecoding: false
            },
            medium: {
                temperature: 0.7,
                maxTokens: 1024,
                systemPrompt: 'Think through this step-by-step, showing your reasoning process using <analysis> tags for your thinking and <final> tags for your conclusion.',
                guidedDecoding: true
            },
            high: {
                temperature: 0.8,
                maxTokens: 2048,
                systemPrompt: 'Engage in deep, comprehensive reasoning. Use <analysis> tags to show detailed thinking, consider multiple perspectives, and use <final> tags for your well-reasoned conclusion.',
                guidedDecoding: true
            }
        };

        this.expertBiases = {
            math: 'Focus on mathematical and quantitative analysis.',
            creative: 'Emphasize creative and innovative thinking approaches.',
            logic: 'Prioritize logical reasoning and systematic analysis.',
            analysis: 'Concentrate on detailed analytical examination.'
        };

        this.activeRequests = new Map();
        this.requestStats = {
            total: 0,
            completed: 0,
            failed: 0,
            averageTokens: 0,
            averageLatency: 0
        };
    }

    async initialize() {
        console.log('🔄 Initializing Reasoning Engine...');
        
        try {
            await this.model.initialize();
            console.log('✅ Reasoning Engine initialized successfully');
            this.emit('initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Reasoning Engine:', error);
            this.emit('error', error);
            throw error;
        }
    }

    async reason(prompt, config = {}) {
        const requestId = this.generateRequestId();
        const startTime = Date.now();
        
        try {
            this.requestStats.total++;
            
            const reasoningConfig = this.buildReasoningConfig(config);
            const enhancedPrompt = this.enhancePrompt(prompt, reasoningConfig);
            
            console.log(`🧠 Starting reasoning request ${requestId} with effort: ${config.effort || 'medium'}`);
            
            const response = await this.model.generate(enhancedPrompt, {
                temperature: reasoningConfig.temperature,
                maxTokens: reasoningConfig.maxTokens,
                topP: reasoningConfig.topP || 0.9,
                stream: false
            });

            const parsed = this.parser.parseResponse(response.choices[0].message.content);
            
            const result = {
                requestId,
                prompt: prompt,
                config: reasoningConfig,
                response: parsed,
                rawResponse: response.choices[0].message.content,
                usage: response.usage,
                latency: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };

            this.requestStats.completed++;
            this.updateStats(result);
            
            console.log(`✅ Reasoning completed for request ${requestId} in ${result.latency}ms`);
            
            this.emit('reasoningComplete', result);
            return result;
            
        } catch (error) {
            this.requestStats.failed++;
            console.error(`❌ Reasoning failed for request ${requestId}:`, error);
            
            const errorResult = {
                requestId,
                prompt,
                config,
                error: error.message,
                latency: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };
            
            this.emit('reasoningError', errorResult);
            throw errorResult;
        }
    }

    async streamReason(prompt, config = {}, onChunk) {
        const requestId = this.generateRequestId();
        const startTime = Date.now();
        
        try {
            this.requestStats.total++;
            
            const reasoningConfig = this.buildReasoningConfig(config);
            const enhancedPrompt = this.enhancePrompt(prompt, reasoningConfig);
            
            console.log(`🧠 Starting streaming reasoning request ${requestId}`);
            
            let fullResponse = '';
            const parseContext = {};
            let chunkCount = 0;
            
            const generator = this.model.generateStream(enhancedPrompt, {
                temperature: reasoningConfig.temperature,
                maxTokens: reasoningConfig.maxTokens,
                topP: reasoningConfig.topP || 0.9
            });

            for await (const delta of generator) {
                if (delta.content) {
                    fullResponse += delta.content;
                    chunkCount++;
                    
                    const parsedChunk = this.parser.streamParse(delta.content, parseContext);
                    
                    const chunkData = {
                        requestId,
                        chunkId: chunkCount,
                        content: delta.content,
                        parsed: parsedChunk,
                        timestamp: Date.now() - startTime
                    };
                    
                    if (onChunk) {
                        onChunk(chunkData);
                    }
                    
                    this.emit('reasoningChunk', chunkData);
                    
                    if (parsedChunk.isComplete) {
                        break;
                    }
                }
            }

            const finalParsed = this.parser.parseResponse(fullResponse);
            
            const result = {
                requestId,
                prompt,
                config: reasoningConfig,
                response: finalParsed,
                rawResponse: fullResponse,
                chunkCount,
                latency: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };

            this.requestStats.completed++;
            this.updateStats(result);
            
            console.log(`✅ Stream reasoning completed for request ${requestId} with ${chunkCount} chunks`);
            
            this.emit('reasoningComplete', result);
            return result;
            
        } catch (error) {
            this.requestStats.failed++;
            console.error(`❌ Stream reasoning failed for request ${requestId}:`, error);
            
            const errorResult = {
                requestId,
                prompt,
                config,
                error: error.message,
                latency: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };
            
            this.emit('reasoningError', errorResult);
            throw errorResult;
        }
    }

    buildReasoningConfig(userConfig = {}) {
        const effort = userConfig.effort || 'medium';
        const profile = this.reasoningProfiles[effort] || this.reasoningProfiles.medium;
        
        const config = {
            ...profile,
            effort,
            expertBias: userConfig.expertBias || {},
            parallelTracks: userConfig.parallelTracks || false,
            complexityScale: userConfig.complexityScale || 'auto'
        };

        if (userConfig.temperature !== undefined) {
            config.temperature = userConfig.temperature;
        }
        
        if (userConfig.maxTokens !== undefined) {
            config.maxTokens = userConfig.maxTokens;
        }

        return config;
    }

    enhancePrompt(originalPrompt, config) {
        let enhancedPrompt = config.systemPrompt + '\n\n';
        
        if (Object.keys(config.expertBias).length > 0) {
            enhancedPrompt += 'Expert guidance:\n';
            for (const [expert, weight] of Object.entries(config.expertBias)) {
                if (weight > 0 && this.expertBiases[expert]) {
                    enhancedPrompt += `- ${this.expertBiases[expert]} (weight: ${weight})\n`;
                }
            }
            enhancedPrompt += '\n';
        }

        if (config.parallelTracks) {
            enhancedPrompt += 'Consider multiple approaches to this problem and show different reasoning paths.\n\n';
        }

        if (config.complexityScale === 'auto') {
            const complexity = this.estimatePromptComplexity(originalPrompt);
            if (complexity > 0.7) {
                enhancedPrompt += 'This appears to be a complex problem requiring deep analysis.\n\n';
            } else if (complexity < 0.3) {
                enhancedPrompt += 'This seems straightforward - provide a clear, concise response.\n\n';
            }
        }

        enhancedPrompt += `User Question: ${originalPrompt}`;
        
        return enhancedPrompt;
    }

    estimatePromptComplexity(prompt) {
        let complexity = 0;
        
        const complexityIndicators = [
            { pattern: /\b(?:analyze|evaluate|compare|synthesize|design|create)\b/gi, weight: 0.2 },
            { pattern: /\b(?:multiple|several|various|different|alternative)\b/gi, weight: 0.15 },
            { pattern: /\b(?:complex|complicated|sophisticated|advanced|detailed)\b/gi, weight: 0.25 },
            { pattern: /\?.*\?/g, weight: 0.1 },
            { pattern: /\b(?:why|how|what if|consider|explain)\b/gi, weight: 0.1 },
            { pattern: /\b(?:pros and cons|advantages and disadvantages|trade-offs)\b/gi, weight: 0.3 }
        ];

        for (const indicator of complexityIndicators) {
            const matches = (prompt.match(indicator.pattern) || []).length;
            complexity += matches * indicator.weight;
        }

        const wordCount = prompt.split(/\s+/).length;
        const lengthFactor = Math.min(wordCount / 100, 0.3);
        complexity += lengthFactor;

        return Math.min(complexity, 1);
    }

    async runParallelReasoningTracks(prompt, config) {
        const tracks = [
            { name: 'analytical', bias: { analysis: 0.8, logic: 0.6 } },
            { name: 'creative', bias: { creative: 0.8, analysis: 0.4 } },
            { name: 'mathematical', bias: { math: 0.8, logic: 0.7 } }
        ];

        const promises = tracks.map(track => 
            this.reason(prompt, {
                ...config,
                expertBias: track.bias,
                parallelTracks: false
            }).catch(error => ({ error, track: track.name }))
        );

        const results = await Promise.all(promises);
        
        return {
            tracks: results.filter(r => !r.error),
            errors: results.filter(r => r.error),
            combined: this.combineReasoningTracks(results.filter(r => !r.error))
        };
    }

    combineReasoningTracks(trackResults) {
        if (trackResults.length === 0) return null;
        
        const combined = {
            analysis: trackResults.map(t => t.response.channels.analysis).join('\n\n---\n\n'),
            final: this.selectBestFinalResponse(trackResults),
            expertActivity: this.mergeExpertActivity(trackResults.map(t => t.response.expertActivity)),
            reasoning: {
                steps: trackResults.flatMap(t => t.response.reasoning.steps),
                totalSteps: trackResults.reduce((sum, t) => sum + t.response.reasoning.totalSteps, 0),
                complexity: Math.max(...trackResults.map(t => t.response.reasoning.complexity))
            }
        };

        return combined;
    }

    selectBestFinalResponse(trackResults) {
        return trackResults.reduce((best, current) => {
            const currentScore = current.response.reasoning.complexity * 
                               current.response.channels.final.length * 
                               Object.values(current.response.expertActivity)
                                   .reduce((sum, expert) => sum + (expert.totalScore || 0), 0);
            
            const bestScore = best.response.reasoning.complexity * 
                             best.response.channels.final.length * 
                             Object.values(best.response.expertActivity)
                                 .reduce((sum, expert) => sum + (expert.totalScore || 0), 0);
            
            return currentScore > bestScore ? current : best;
        }).response.channels.final;
    }

    mergeExpertActivity(expertActivities) {
        const merged = {};
        const experts = ['math', 'creative', 'logic', 'analysis'];
        
        for (const expert of experts) {
            const activities = expertActivities.map(ea => ea[expert]).filter(Boolean);
            if (activities.length === 0) continue;
            
            merged[expert] = {
                count: activities.reduce((sum, a) => sum + a.count, 0),
                intensity: activities.reduce((sum, a) => sum + a.intensity, 0) / activities.length,
                semanticScore: activities.reduce((sum, a) => sum + (a.semanticScore || 0), 0) / activities.length,
                totalScore: activities.reduce((sum, a) => sum + (a.totalScore || 0), 0) / activities.length,
                keywords: [...new Set(activities.flatMap(a => a.keywords))]
            };
        }
        
        return merged;
    }

    updateStats(result) {
        if (result.usage) {
            const prevAvg = this.requestStats.averageTokens;
            const count = this.requestStats.completed;
            this.requestStats.averageTokens = (prevAvg * (count - 1) + result.usage.total_tokens) / count;
        }
        
        const prevLatencyAvg = this.requestStats.averageLatency;
        const count = this.requestStats.completed;
        this.requestStats.averageLatency = (prevLatencyAvg * (count - 1) + result.latency) / count;
    }

    generateRequestId() {
        return `reasoning_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    getModelInfo() {
        return this.model.getModelInfo();
    }

    getModelStats() {
        return {
            model: this.model.getStats(),
            reasoning: this.requestStats
        };
    }

    async shutdown() {
        console.log('🔄 Shutting down Reasoning Engine...');
        await this.model.shutdown();
        this.emit('shutdown');
    }
}

module.exports = ReasoningEngine;