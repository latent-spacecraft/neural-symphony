class ConnectionManager {
  constructor() {
    this.isInitialized = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.baseDelay = 1000;
  }
  
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Check if backend is available
      await this.checkBackendHealth();
      
      // Initialize app start time for uptime calculation
      window.appStartTime = Date.now();
      
      this.isInitialized = true;
      console.log('✅ Connection manager initialized');
      
    } catch (error) {
      console.error('❌ Connection manager initialization failed:', error);
      throw error;
    }
  }
  
  async checkBackendHealth() {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
    
    try {
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(`Backend health check failed: ${response.status}`);
      }
      
      const healthData = await response.json();
      console.log('🏥 Backend health check passed:', healthData);
      
      return healthData;
      
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = this.baseDelay * Math.pow(2, this.retryCount - 1);
        
        console.log(`⏳ Retrying backend connection in ${delay}ms... (${this.retryCount}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.checkBackendHealth();
      }
      
      throw new Error(`Backend unreachable after ${this.maxRetries} attempts: ${error.message}`);
    }
  }
  
  async testModelAvailability() {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
    
    try {
      const response = await fetch(`${backendUrl}/api/model/info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Model info request failed: ${response.status}`);
      }
      
      const modelInfo = await response.json();
      console.log('🧠 Model availability check:', modelInfo);
      
      return modelInfo;
      
    } catch (error) {
      console.warn('⚠️ Model availability check failed:', error.message);
      return null;
    }
  }
  
  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.REACT_APP_WS_HOST || window.location.hostname;
    const port = process.env.REACT_APP_WS_PORT || '3001';
    
    return `${protocol}//${host}:${port}`;
  }
  
  async performStartupChecks() {
    const checks = {
      backend: false,
      model: false,
      websocket: false
    };
    
    try {
      // Backend health check
      await this.checkBackendHealth();
      checks.backend = true;
      
      // Model availability check
      const modelInfo = await this.testModelAvailability();
      checks.model = modelInfo?.initialized || false;
      
      // WebSocket connectivity check
      checks.websocket = await this.testWebSocketConnection();
      
      console.log('🚀 Startup checks completed:', checks);
      return checks;
      
    } catch (error) {
      console.error('❌ Startup checks failed:', error);
      return checks;
    }
  }
  
  async testWebSocketConnection() {
    return new Promise((resolve) => {
      const wsUrl = this.getWebSocketUrl();
      const testWs = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        testWs.close();
        resolve(false);
      }, 5000);
      
      testWs.onopen = () => {
        clearTimeout(timeout);
        testWs.close();
        resolve(true);
      };
      
      testWs.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
    });
  }
}

export const connectionManager = new ConnectionManager();