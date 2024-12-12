import CozeAIProvider from './providers/coze.js';

// AI 服务工厂类
class AIServiceFactory {
    constructor() {
        this.providers = new Map();
        this.initializeProviders();
    }

    initializeProviders() {
        // 初始化 Coze 客户端
        const cozeProvider = new CozeAIProvider();
        this.providers.set('coze', cozeProvider);
    }

    getProvider(name) {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`Provider ${name} not found`);
        }
        return provider;
    }

    async sendMessage(providerName, message, options = {}) {
        const provider = this.getProvider(providerName);
        return await provider.sendMessage(message, options);
    }
}

// 创建 AI 服务工厂实例
const aiFactory = new AIServiceFactory();

export default aiFactory;
