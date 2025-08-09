#!/usr/bin/env node
/**
 * Climate Solution Conductor Demo
 * Demonstrates expert bias shifting, parallel reasoning, complexity scaling
 */

const WebSocket = require('ws');

class ClimateSolutionDemo {
    constructor() {
        this.apiUrl = process.env.API_URL || 'http://localhost:3001';
        this.wsUrl = process.env.WS_URL || 'ws://localhost:3002';
        this.ws = null;
        
        this.demoSteps = [
            {
                name: 'Basic Question',
                prompt: 'How can cities reduce carbon emissions?',
                config: { temperature: 0.7, expertBias: 'balanced' }
            },
            {
                name: 'Expert Bias: Environmental',
                prompt: 'Design a carbon-negative city that\'s economically profitable',
                config: { temperature: 0.8, expertBias: 'environmental', reasoning: 'high' }
            },
            {
                name: 'Expert Bias: Economic',
                prompt: 'Design a carbon-negative city that\'s economically profitable',
                config: { temperature: 0.7, expertBias: 'economic', reasoning: 'high' }
            },
            {
                name: 'Parallel Reasoning',
                prompt: 'Design a carbon-negative city that\'s economically profitable',
                config: { temperature: 0.75, expertBias: 'balanced', reasoning: 'high', parallel: true }
            },
            {
                name: 'Complex Integration',
                prompt: 'Create a comprehensive plan for a carbon-negative city of 1 million people that generates profit within 10 years, considering technology, policy, economics, and social factors.',
                config: { temperature: 0.8, expertBias: 'balanced', reasoning: 'maximum', parallel: true, complexity: 'high' }
            }
        ];
    }

    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            
            this.ws.on('open', () => {
                console.log('✅ Connected to Neural Symphony WebSocket');
                resolve();
            });
            
            this.ws.on('error', (error) => {
                console.error('❌ WebSocket connection failed:', error.message);
                reject(error);
            });
            
            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    console.error('❌ Failed to parse WebSocket message:', error);
                }
            });
        });
    }

    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'reasoning_stream':
                // Show live reasoning updates
                if (message.data.analysis) {
                    process.stdout.write('🧠 ');
                } else if (message.data.final) {
                    process.stdout.write('✨ ');
                } else {
                    process.stdout.write('💭 ');
                }
                break;
                
            case 'expert_activation':
                console.log(`🔥 Expert Activated: ${message.data.expert} (${message.data.intensity})`);
                break;
                
            case 'reasoning_complete':
                console.log('\n✅ Reasoning Complete');
                break;
                
            case 'error':
                console.error(`❌ Error: ${message.data.message}`);
                break;
        }
    }

    async runStep(step, stepNumber, totalSteps) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Step ${stepNumber}/${totalSteps}: ${step.name}`);
        console.log(`${'='.repeat(60)}`);
        console.log(`📝 Prompt: ${step.prompt}`);
        console.log(`⚙️  Config: ${JSON.stringify(step.config, null, 2)}`);
        console.log('');

        try {
            // Send reasoning request
            const requestData = {
                type: 'reasoning_request',
                data: {
                    prompt: step.prompt,
                    config: step.config,
                    demo: 'climate-solution'
                }
            };

            this.ws.send(JSON.stringify(requestData));

            // Wait for completion
            await this.waitForCompletion();
            
            console.log('\n✅ Step completed successfully');
            
            // Pause between steps
            if (stepNumber < totalSteps) {
                console.log('\n⏳ Pausing for 3 seconds...');
                await this.sleep(3000);
            }
            
        } catch (error) {
            console.error(`❌ Step failed: ${error.message}`);
            throw error;
        }
    }

    async waitForCompletion() {
        return new Promise((resolve) => {
            const handler = (data) => {
                try {
                    const message = JSON.parse(data);
                    if (message.type === 'reasoning_complete') {
                        this.ws.removeListener('message', handler);
                        resolve();
                    }
                } catch {
                    // Ignore parse errors
                }
            };
            
            this.ws.on('message', handler);
            
            // Timeout after 60 seconds
            setTimeout(() => {
                this.ws.removeListener('message', handler);
                resolve();
            }, 60000);
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runDemo() {
        console.log('🌍 Climate Solution Conductor Demo');
        console.log('==================================');
        console.log('This demo showcases:');
        console.log('• Expert bias shifting (Environmental ↔ Economic)');
        console.log('• Parallel reasoning approaches');
        console.log('• Complexity scaling for comprehensive solutions');
        console.log('• Live reasoning visualization');
        console.log('');

        try {
            // Connect to WebSocket
            console.log('🔌 Connecting to Neural Symphony...');
            await this.connectWebSocket();
            
            // Run through demo steps
            for (let i = 0; i < this.demoSteps.length; i++) {
                await this.runStep(this.demoSteps[i], i + 1, this.demoSteps.length);
            }
            
            console.log('\n🎉 Climate Solution Conductor Demo Complete!');
            console.log('');
            console.log('Key Observations:');
            console.log('• Environmental expert bias → Focus on sustainability & innovation');
            console.log('• Economic expert bias → Focus on profitability & market viability'); 
            console.log('• Parallel reasoning → Multiple solution approaches simultaneously');
            console.log('• Complex integration → Comprehensive multi-factor planning');
            console.log('');
            console.log('🎼 This demonstrates how AI reasoning can be conducted like music!');
            
        } catch (error) {
            console.error('❌ Demo failed:', error.message);
            return false;
        } finally {
            if (this.ws) {
                this.ws.close();
            }
        }
        
        return true;
    }
}

// Main execution
async function main() {
    const demo = new ClimateSolutionDemo();
    const success = await demo.runDemo();
    process.exit(success ? 0 : 1);
}

// Error handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\n🔄 Demo interrupted by user');
    process.exit(0);
});

// Run if called directly
if (require.main === module) {
    main().catch((error) => {
        console.error('❌ Demo failed:', error.message);
        process.exit(1);
    });
}

module.exports = ClimateSolutionDemo;