const ReasoningEngine = require('../src/api/reasoning-engine');

class ReasoningTester {
    constructor() {
        this.engine = new ReasoningEngine();
        this.testPrompts = {
            simple: "What is 2 + 2?",
            medium: "Explain the concept of machine learning and its applications in healthcare.",
            complex: "Design a sustainable city that addresses climate change while maintaining economic growth. Consider multiple perspectives and potential challenges."
        };
        
        this.testConfigs = {
            low: { effort: 'low', temperature: 0.3 },
            medium: { effort: 'medium', temperature: 0.7 },
            high: { effort: 'high', temperature: 0.8 },
            mathBias: { 
                effort: 'medium', 
                expertBias: { math: 0.9, logic: 0.7 },
                temperature: 0.5 
            },
            creativeBias: { 
                effort: 'high', 
                expertBias: { creative: 0.9, analysis: 0.6 },
                temperature: 0.8 
            },
            parallel: {
                effort: 'high',
                parallelTracks: true,
                temperature: 0.7
            }
        };
    }

    async runAllTests() {
        console.log('🎼 Neural Symphony Reasoning Test Suite');
        console.log('=' * 60);
        
        try {
            await this.initializeEngine();
            await this.runBasicTests();
            await this.runExpertBiasTests();
            await this.runStreamingTests();
            await this.runParallelTrackTests();
            
            console.log('\n✅ All tests completed successfully!');
            console.log('\n📊 Test Summary:');
            this.printTestSummary();
            
        } catch (error) {
            console.error('\n❌ Test suite failed:', error.message);
            if (error.details) {
                console.error('Details:', error.details);
            }
        } finally {
            await this.cleanup();
        }
    }

    async initializeEngine() {
        console.log('\n🔄 Initializing reasoning engine...');
        
        const startTime = Date.now();
        await this.engine.initialize();
        const initTime = Date.now() - startTime;
        
        console.log(`✅ Engine initialized in ${initTime}ms`);
        
        const modelInfo = this.engine.getModelInfo();
        console.log(`📋 Model: ${modelInfo.name}`);
        console.log(`📋 Initialized: ${modelInfo.initialized}`);
    }

    async runBasicTests() {
        console.log('\n🧪 Running basic reasoning tests...');
        
        for (const [promptName, prompt] of Object.entries(this.testPrompts)) {
            for (const [configName, config] of Object.entries(this.testConfigs)) {
                if (configName.includes('Bias') || configName === 'parallel') continue;
                
                console.log(`\n  Testing: ${promptName} prompt with ${configName} effort`);
                
                const startTime = Date.now();
                const result = await this.engine.reason(prompt, config);
                const duration = Date.now() - startTime;
                
                this.validateResult(result, prompt, config);
                
                console.log(`    ⏱️  Duration: ${duration}ms`);
                console.log(`    📏 Analysis: ${result.response.channels.analysis.length} chars`);
                console.log(`    📏 Final: ${result.response.channels.final.length} chars`);
                console.log(`    🧠 Reasoning steps: ${result.response.reasoning.totalSteps}`);
                console.log(`    📊 Complexity: ${(result.response.reasoning.complexity * 100).toFixed(1)}%`);
                
                await this.delay(1000);
            }
        }
    }

    async runExpertBiasTests() {
        console.log('\n🎯 Running expert bias tests...');
        
        const mathPrompt = "Calculate the compound interest on $10,000 at 5% annual rate for 3 years, and explain the mathematical principles involved.";
        const creativePrompt = "Design an innovative solution for reducing plastic waste in oceans.";
        
        console.log('\n  Testing math bias on mathematical problem...');
        const mathResult = await this.engine.reason(mathPrompt, this.testConfigs.mathBias);
        
        console.log('    Expert activity:');
        for (const [expert, activity] of Object.entries(mathResult.response.expertActivity)) {
            console.log(`      ${expert}: ${(activity.totalScore * 100).toFixed(1)}% (${activity.count} matches)`);
        }
        
        console.log('\n  Testing creative bias on creative problem...');
        const creativeResult = await this.engine.reason(creativePrompt, this.testConfigs.creativeBias);
        
        console.log('    Expert activity:');
        for (const [expert, activity] of Object.entries(creativeResult.response.expertActivity)) {
            console.log(`      ${expert}: ${(activity.totalScore * 100).toFixed(1)}% (${activity.count} matches)`);
        }
        
        this.validateExpertBias(mathResult, 'math');
        this.validateExpertBias(creativeResult, 'creative');
    }

    async runStreamingTests() {
        console.log('\n🌊 Running streaming tests...');
        
        const prompt = this.testPrompts.medium;
        const config = this.testConfigs.medium;
        
        let chunkCount = 0;
        let totalContent = '';
        
        console.log('  Testing streaming response...');
        const startTime = Date.now();
        
        const result = await this.engine.streamReason(prompt, config, (chunk) => {
            chunkCount++;
            totalContent += chunk.content || '';
            
            if (chunkCount % 10 === 0) {
                process.stdout.write('.');
            }
        });
        
        const duration = Date.now() - startTime;
        
        console.log(`\n    ✅ Streaming completed`);
        console.log(`    📦 Total chunks: ${chunkCount}`);
        console.log(`    ⏱️  Duration: ${duration}ms`);
        console.log(`    📏 Total content: ${totalContent.length} chars`);
        
        if (chunkCount === 0) {
            throw new Error('No chunks received during streaming');
        }
    }

    async runParallelTrackTests() {
        console.log('\n🏁 Running parallel track tests...');
        
        const prompt = this.testPrompts.complex;
        
        console.log('  Testing parallel reasoning tracks...');
        const startTime = Date.now();
        
        const result = await this.engine.runParallelReasoningTracks(prompt, {
            effort: 'high',
            temperature: 0.7
        });
        
        const duration = Date.now() - startTime;
        
        console.log(`    ✅ Parallel tracks completed`);
        console.log(`    🏁 Successful tracks: ${result.tracks.length}`);
        console.log(`    ❌ Failed tracks: ${result.errors.length}`);
        console.log(`    ⏱️  Duration: ${duration}ms`);
        
        if (result.combined) {
            console.log(`    📏 Combined analysis: ${result.combined.analysis.length} chars`);
            console.log(`    📏 Combined final: ${result.combined.final.length} chars`);
            console.log(`    🧠 Total reasoning steps: ${result.combined.reasoning.totalSteps}`);
        }
        
        if (result.tracks.length === 0) {
            throw new Error('No parallel tracks completed successfully');
        }
    }

    validateResult(result, prompt, config) {
        if (!result) {
            throw new Error('No result returned');
        }
        
        if (!result.response) {
            throw new Error('No response in result');
        }
        
        if (!result.response.channels) {
            throw new Error('No channels in response');
        }
        
        if (!result.response.channels.raw) {
            throw new Error('No raw content in channels');
        }
        
        if (result.response.channels.raw.length < 10) {
            throw new Error('Response too short');
        }
        
        if (!result.response.expertActivity) {
            throw new Error('No expert activity detected');
        }
        
        if (!result.response.reasoning) {
            throw new Error('No reasoning analysis');
        }
        
        if (result.latency > 30000) {
            console.warn(`    ⚠️  High latency: ${result.latency}ms`);
        }
    }

    validateExpertBias(result, expectedExpert) {
        const activities = result.response.expertActivity;
        const expectedActivity = activities[expectedExpert];
        
        if (!expectedActivity) {
            throw new Error(`No activity detected for expected expert: ${expectedExpert}`);
        }
        
        const otherExperts = Object.keys(activities).filter(e => e !== expectedExpert);
        const avgOtherActivity = otherExperts.reduce((sum, expert) => {
            return sum + (activities[expert]?.totalScore || 0);
        }, 0) / otherExperts.length;
        
        if (expectedActivity.totalScore <= avgOtherActivity) {
            console.warn(`    ⚠️  Expert bias not clearly demonstrated for ${expectedExpert}`);
            console.warn(`    ⚠️  ${expectedExpert} score: ${expectedActivity.totalScore.toFixed(3)}, avg others: ${avgOtherActivity.toFixed(3)}`);
        } else {
            console.log(`    ✅ Expert bias confirmed for ${expectedExpert}`);
        }
    }

    printTestSummary() {
        const stats = this.engine.getModelStats();
        
        console.log(`    Total requests: ${stats.reasoning.total}`);
        console.log(`    Completed: ${stats.reasoning.completed}`);
        console.log(`    Failed: ${stats.reasoning.failed}`);
        console.log(`    Success rate: ${(stats.reasoning.completed / stats.reasoning.total * 100).toFixed(1)}%`);
        console.log(`    Average latency: ${stats.reasoning.averageLatency.toFixed(0)}ms`);
        console.log(`    Average tokens: ${stats.reasoning.averageTokens.toFixed(0)}`);
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        await this.engine.shutdown();
    }
}

async function runSpecificTest(testName) {
    const tester = new ReasoningTester();
    
    try {
        await tester.initializeEngine();
        
        switch (testName) {
            case 'basic':
                await tester.runBasicTests();
                break;
            case 'expert':
                await tester.runExpertBiasTests();
                break;
            case 'streaming':
                await tester.runStreamingTests();
                break;
            case 'parallel':
                await tester.runParallelTrackTests();
                break;
            default:
                console.error('Unknown test:', testName);
                console.log('Available tests: basic, expert, streaming, parallel');
        }
        
        tester.printTestSummary();
        
    } catch (error) {
        console.error('Test failed:', error.message);
    } finally {
        await tester.cleanup();
    }
}

if (require.main === module) {
    const testName = process.argv[2];
    
    if (testName) {
        runSpecificTest(testName);
    } else {
        const tester = new ReasoningTester();
        tester.runAllTests();
    }
}

module.exports = ReasoningTester;