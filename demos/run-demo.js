#!/usr/bin/env node
/**
 * Neural Symphony - Demo Runner
 * Interactive demo launcher for the AI Reasoning Orchestrator
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DEMOS = [
    {
        name: 'climate-solution-demo',
        title: '🌍 Climate Solution Conductor',
        description: 'Design a carbon-negative city that\'s economically profitable',
        file: './climate-solution-demo.js'
    },
    {
        name: 'creative-racing-demo',
        title: '🎨 Creative Problem Racing', 
        description: 'Invent a new form of entertainment for the year 2050',
        file: './creative-racing-demo.js'
    },
    {
        name: 'debugging-demo',
        title: '🔧 Real-time Debugging',
        description: 'Complex logic puzzle with interactive reasoning adjustment',
        file: './debugging-demo.js'
    }
];

class DemoRunner {
    constructor() {
        this.apiUrl = process.env.API_URL || 'http://localhost:3001';
        this.webUrl = process.env.WEB_URL || 'http://localhost';
    }

    async checkServerHealth() {
        try {
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(`${this.apiUrl}/api/health`);
            return response.ok;
        } catch {
            return false;
        }
    }

    printHeader() {
        console.log('');
        console.log('🎼 Neural Symphony - Demo Runner');
        console.log('=================================');
        console.log('AI Reasoning Orchestrator Demos');
        console.log('');
    }

    printDemos() {
        console.log('Available Demos:');
        console.log('');
        DEMOS.forEach((demo, index) => {
            console.log(`${index + 1}. ${demo.title}`);
            console.log(`   ${demo.description}`);
            console.log('');
        });
    }

    async runDemo(demoName) {
        const demo = DEMOS.find(d => d.name === demoName);
        if (!demo) {
            console.error(`❌ Demo '${demoName}' not found`);
            return false;
        }

        const demoPath = path.join(__dirname, demo.file);
        if (!fs.existsSync(demoPath)) {
            console.error(`❌ Demo file not found: ${demo.file}`);
            console.log(`   Expected: ${demoPath}`);
            return false;
        }

        console.log(`🚀 Starting ${demo.title}...`);
        console.log('');

        try {
            const demoProcess = spawn('node', [demoPath], {
                stdio: 'inherit',
                env: {
                    ...process.env,
                    API_URL: this.apiUrl,
                    WEB_URL: this.webUrl
                }
            });

            return new Promise((resolve) => {
                demoProcess.on('close', (code) => {
                    console.log('');
                    if (code === 0) {
                        console.log(`✅ Demo completed successfully`);
                    } else {
                        console.log(`❌ Demo exited with code ${code}`);
                    }
                    resolve(code === 0);
                });
            });
        } catch (error) {
            console.error(`❌ Failed to run demo: ${error.message}`);
            return false;
        }
    }

    async runInteractive() {
        this.printHeader();

        // Check server health
        console.log('🔍 Checking server health...');
        const isHealthy = await this.checkServerHealth();
        
        if (!isHealthy) {
            console.log('⚠️  Neural Symphony server not responding');
            console.log(`   Expected at: ${this.apiUrl}`);
            console.log('   Please start the server first:');
            console.log('   > npm start');
            console.log('   > docker-compose up');
            console.log('');
        } else {
            console.log('✅ Server is healthy and ready');
            console.log('');
        }

        this.printDemos();

        // Interactive selection
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            readline.question('Select demo (1-3) or "all" to run all demos: ', async (answer) => {
                readline.close();
                
                if (answer.toLowerCase() === 'all') {
                    console.log('🎯 Running all demos...');
                    console.log('');
                    
                    for (const demo of DEMOS) {
                        await this.runDemo(demo.name);
                        console.log('');
                    }
                    resolve(true);
                } else {
                    const selection = parseInt(answer);
                    if (selection >= 1 && selection <= DEMOS.length) {
                        const demo = DEMOS[selection - 1];
                        const success = await this.runDemo(demo.name);
                        resolve(success);
                    } else {
                        console.log('❌ Invalid selection');
                        resolve(false);
                    }
                }
            });
        });
    }

    async runQuick(demoName) {
        console.log(`🎼 Neural Symphony - Quick Demo: ${demoName}`);
        console.log('');
        
        const success = await this.runDemo(demoName);
        return success;
    }

    printUsage() {
        console.log('Usage:');
        console.log('  node run-demo.js                    # Interactive mode');
        console.log('  node run-demo.js <demo-name>        # Run specific demo');
        console.log('  node run-demo.js all               # Run all demos');
        console.log('');
        console.log('Available demos:');
        DEMOS.forEach(demo => {
            console.log(`  ${demo.name.padEnd(25)} # ${demo.title}`);
        });
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const runner = new DemoRunner();

    if (args.length === 0) {
        // Interactive mode
        await runner.runInteractive();
    } else if (args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
        runner.printUsage();
    } else if (args[0] === 'all') {
        // Run all demos
        console.log('🎼 Neural Symphony - Running All Demos');
        console.log('');
        
        for (const demo of DEMOS) {
            await runner.runDemo(demo.name);
            console.log('');
        }
    } else {
        // Run specific demo
        const demoName = args[0];
        await runner.runQuick(demoName);
    }
}

// Error handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down demo runner...');
    process.exit(0);
});

// Run main function
if (require.main === module) {
    main().catch((error) => {
        console.error('❌ Demo runner failed:', error.message);
        process.exit(1);
    });
}

module.exports = DemoRunner;