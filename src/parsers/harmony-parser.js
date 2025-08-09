class HarmonyParser {
    constructor() {
        this.analysisMarkers = {
            start: ['<analysis>', '<thinking>', '<reasoning>', '<thought>'],
            end: ['</analysis>', '</thinking>', '</reasoning>', '</thought>']
        };
        
        this.finalMarkers = {
            start: ['<final>', '<answer>', '<response>', '<output>'],
            end: ['</final>', '</answer>', '</response>', '</output>']
        };
        
        this.expertPatterns = {
            math: /(?:mathematical|calculation|equation|formula|arithmetic|algebra|geometry|statistics)/gi,
            creative: /(?:creative|imaginative|artistic|innovative|original|inventive|design)/gi,
            logic: /(?:logical|reasoning|deduction|inference|conclusion|analysis|systematic)/gi,
            analysis: /(?:analyze|examine|evaluate|assess|investigate|study|review)/gi
        };
    }

    parseResponse(text) {
        const channels = this.extractChannels(text);
        const expertActivity = this.detectExpertActivity(text);
        const reasoning = this.extractReasoningFlow(text);
        
        return {
            channels,
            expertActivity,
            reasoning,
            metadata: {
                totalLength: text.length,
                analysisRatio: channels.analysis.length / text.length,
                finalRatio: channels.final.length / text.length,
                expertCount: Object.keys(expertActivity).length,
                reasoningDepth: reasoning.steps.length
            }
        };
    }

    extractChannels(text) {
        const channels = {
            analysis: '',
            final: '',
            raw: text,
            mixed: false
        };

        const analysisBlocks = this.extractBlocks(text, this.analysisMarkers);
        const finalBlocks = this.extractBlocks(text, this.finalMarkers);

        channels.analysis = analysisBlocks.join('\n\n');
        channels.final = finalBlocks.join('\n\n');

        if (!channels.analysis && !channels.final) {
            const segments = this.inferChannels(text);
            channels.analysis = segments.thinking;
            channels.final = segments.conclusion;
            channels.mixed = true;
        }

        if (!channels.final && channels.analysis) {
            channels.final = this.extractImplicitFinal(text, channels.analysis);
        }

        if (!channels.analysis && channels.final) {
            channels.analysis = this.extractImplicitAnalysis(text, channels.final);
        }

        return channels;
    }

    extractBlocks(text, markers) {
        const blocks = [];
        
        for (const startMarker of markers.start) {
            for (const endMarker of markers.end) {
                const regex = new RegExp(
                    `${this.escapeRegex(startMarker)}(.*?)${this.escapeRegex(endMarker)}`,
                    'gsi'
                );
                
                const matches = text.matchAll(regex);
                for (const match of matches) {
                    blocks.push(match[1].trim());
                }
            }
        }

        if (blocks.length === 0) {
            const singleMarkerRegex = new RegExp(
                `(${markers.start.map(m => this.escapeRegex(m)).join('|')})([\\s\\S]*?)(?=${markers.end.map(m => this.escapeRegex(m)).join('|')}|$)`,
                'gi'
            );
            
            const matches = text.matchAll(singleMarkerRegex);
            for (const match of matches) {
                blocks.push(match[2].trim());
            }
        }

        return blocks;
    }

    inferChannels(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
        const thinking = [];
        const conclusion = [];
        
        const thinkingIndicators = [
            'let me think', 'i need to', 'first', 'then', 'therefore', 'because',
            'since', 'given that', 'considering', 'if we', 'we can see',
            'this means', 'so', 'thus', 'hence', 'as a result'
        ];
        
        const conclusionIndicators = [
            'in conclusion', 'to summarize', 'overall', 'final', 'answer',
            'solution', 'result', 'recommendation', 'best', 'should',
            'the key', 'ultimately', 'in the end'
        ];

        const midpoint = Math.floor(sentences.length * 0.7);

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i].toLowerCase().trim();
            
            const hasThinkingIndicator = thinkingIndicators.some(indicator => 
                sentence.includes(indicator)
            );
            
            const hasConclusionIndicator = conclusionIndicators.some(indicator => 
                sentence.includes(indicator)
            );
            
            if (hasConclusionIndicator || i >= midpoint) {
                conclusion.push(sentences[i].trim());
            } else if (hasThinkingIndicator || i < midpoint) {
                thinking.push(sentences[i].trim());
            } else {
                thinking.push(sentences[i].trim());
            }
        }

        return {
            thinking: thinking.join('. ') + '.',
            conclusion: conclusion.join('. ') + '.'
        };
    }

    extractImplicitFinal(text, analysis) {
        const withoutAnalysis = text.replace(analysis, '').trim();
        if (withoutAnalysis.length > 50) {
            return withoutAnalysis;
        }
        
        const lines = text.split('\n').filter(line => line.trim());
        const finalLines = lines.slice(-Math.ceil(lines.length * 0.3));
        return finalLines.join('\n');
    }

    extractImplicitAnalysis(text, final) {
        const withoutFinal = text.replace(final, '').trim();
        if (withoutFinal.length > 50) {
            return withoutFinal;
        }
        
        const lines = text.split('\n').filter(line => line.trim());
        const analysisLines = lines.slice(0, Math.floor(lines.length * 0.7));
        return analysisLines.join('\n');
    }

    detectExpertActivity(text) {
        const activity = {};
        const totalLength = text.length;
        
        for (const [expert, pattern] of Object.entries(this.expertPatterns)) {
            const matches = text.match(pattern) || [];
            activity[expert] = {
                count: matches.length,
                intensity: matches.length / (totalLength / 1000),
                keywords: [...new Set(matches.map(m => m.toLowerCase()))]
            };
        }

        const semanticAnalysis = this.analyzeSemanticContent(text);
        for (const [expert, score] of Object.entries(semanticAnalysis)) {
            if (activity[expert]) {
                activity[expert].semanticScore = score;
                activity[expert].totalScore = (activity[expert].intensity + score) / 2;
            }
        }

        return activity;
    }

    analyzeSemanticContent(text) {
        const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        const wordCount = words.length;
        
        const semanticCategories = {
            math: ['number', 'calculate', 'compute', 'solve', 'equation', 'formula', 'result', 'value', 'sum', 'average'],
            creative: ['imagine', 'design', 'create', 'innovative', 'unique', 'original', 'artistic', 'beautiful', 'inspiring'],
            logic: ['reason', 'logical', 'deduce', 'conclude', 'infer', 'evidence', 'proof', 'valid', 'argument'],
            analysis: ['analyze', 'examine', 'evaluate', 'compare', 'contrast', 'assess', 'review', 'study']
        };

        const scores = {};
        for (const [category, keywords] of Object.entries(semanticCategories)) {
            const matches = words.filter(word => keywords.some(keyword => 
                word.includes(keyword) || keyword.includes(word)
            ));
            scores[category] = matches.length / wordCount;
        }

        return scores;
    }

    extractReasoningFlow(text) {
        const steps = [];
        const transitions = [
            'first', 'then', 'next', 'after', 'following', 'subsequently',
            'therefore', 'thus', 'hence', 'as a result', 'consequently',
            'however', 'but', 'although', 'despite', 'nevertheless',
            'finally', 'lastly', 'in conclusion', 'to summarize'
        ];

        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
        
        let currentStep = {
            content: '',
            type: 'analysis',
            confidence: 0.5,
            transitions: []
        };

        for (const sentence of sentences) {
            const lowerSentence = sentence.toLowerCase().trim();
            const foundTransitions = transitions.filter(t => lowerSentence.includes(t));
            
            if (foundTransitions.length > 0) {
                if (currentStep.content.trim()) {
                    currentStep.confidence = this.calculateStepConfidence(currentStep.content);
                    steps.push({ ...currentStep });
                }
                
                currentStep = {
                    content: sentence.trim(),
                    type: this.classifyStepType(sentence),
                    confidence: 0.5,
                    transitions: foundTransitions
                };
            } else {
                currentStep.content += (currentStep.content ? ' ' : '') + sentence.trim();
            }
        }

        if (currentStep.content.trim()) {
            currentStep.confidence = this.calculateStepConfidence(currentStep.content);
            steps.push(currentStep);
        }

        return {
            steps,
            totalSteps: steps.length,
            complexity: this.calculateReasoningComplexity(steps)
        };
    }

    classifyStepType(text) {
        const lower = text.toLowerCase();
        
        if (lower.includes('question') || lower.includes('problem') || lower.includes('what')) {
            return 'problem_identification';
        } else if (lower.includes('because') || lower.includes('since') || lower.includes('due to')) {
            return 'causal_reasoning';
        } else if (lower.includes('if') || lower.includes('then') || lower.includes('would')) {
            return 'conditional_reasoning';
        } else if (lower.includes('compare') || lower.includes('versus') || lower.includes('difference')) {
            return 'comparative_analysis';
        } else if (lower.includes('therefore') || lower.includes('thus') || lower.includes('conclude')) {
            return 'conclusion';
        } else {
            return 'analysis';
        }
    }

    calculateStepConfidence(content) {
        let confidence = 0.5;
        
        const qualityIndicators = [
            /specific.*detail/gi,
            /evidence/gi,
            /example/gi,
            /data/gi,
            /research/gi,
            /study/gi
        ];

        const lowQualityIndicators = [
            /maybe/gi,
            /probably/gi,
            /might/gi,
            /could be/gi,
            /unclear/gi,
            /uncertain/gi
        ];

        for (const indicator of qualityIndicators) {
            if (indicator.test(content)) confidence += 0.1;
        }

        for (const indicator of lowQualityIndicators) {
            if (indicator.test(content)) confidence -= 0.1;
        }

        return Math.max(0, Math.min(1, confidence));
    }

    calculateReasoningComplexity(steps) {
        if (steps.length === 0) return 0;

        const baseComplexity = steps.length / 10;
        const typeVariety = new Set(steps.map(s => s.type)).size / 6;
        const avgConfidence = steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length;
        const transitionDensity = steps.reduce((sum, s) => sum + s.transitions.length, 0) / steps.length;

        return Math.min(1, (baseComplexity + typeVariety + avgConfidence + transitionDensity) / 4);
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    streamParse(chunk, context = {}) {
        if (!context.buffer) {
            context.buffer = '';
            context.activeChannel = null;
            context.channels = { analysis: '', final: '', raw: '' };
        }

        context.buffer += chunk;
        context.channels.raw += chunk;

        const analysisStart = this.analysisMarkers.start.find(marker => 
            context.buffer.includes(marker)
        );
        const analysisEnd = this.analysisMarkers.end.find(marker => 
            context.buffer.includes(marker)
        );
        const finalStart = this.finalMarkers.start.find(marker => 
            context.buffer.includes(marker)
        );
        const finalEnd = this.finalMarkers.end.find(marker => 
            context.buffer.includes(marker)
        );

        if (analysisStart && !context.activeChannel) {
            context.activeChannel = 'analysis';
        } else if (finalStart && !context.activeChannel) {
            context.activeChannel = 'final';
        }

        if (context.activeChannel === 'analysis') {
            if (analysisEnd) {
                context.activeChannel = null;
            } else {
                context.channels.analysis += chunk;
            }
        } else if (context.activeChannel === 'final') {
            if (finalEnd) {
                context.activeChannel = null;
            } else {
                context.channels.final += chunk;
            }
        }

        return {
            channels: { ...context.channels },
            activeChannel: context.activeChannel,
            expertActivity: this.detectExpertActivity(context.buffer),
            isComplete: context.buffer.includes('[DONE]') || 
                        (analysisEnd && finalEnd) ||
                        chunk.trim() === ''
        };
    }
}

module.exports = HarmonyParser;