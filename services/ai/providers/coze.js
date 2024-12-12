import fetch from 'node-fetch';
import { URLSearchParams } from 'url';

class CozeAIProvider {
    constructor() {
        this.apiToken = process.env.COZE_API_TOKEN;
        this.botId = process.env.COZE_BOT_ID;
        this.baseUrl = 'https://api.coze.cn/v3/chat';
        this._conversationId = null;
    }

    async sendMessage(message, options = {}) {
        console.log('\n=== sendMessage 函数开始 ===');
        console.log('\n=== 准备发送消息到 Coze... ===');

        try {
            // 构建请求体
            const requestBody = {
                bot_id: options.bot_id || this.botId,
                user_id: options.user_id || 'node_app_user',
                stream: false,
                auto_save_history: options.auto_save_history ?? true,
                additional_messages: [{
                    role: 'user',
                    content: message,
                    content_type: 'text'
                }]
            };

            // 如果有会话ID，添加到请求体
            if (this._conversationId) {
                requestBody.conversation_id = this._conversationId;
            }

            // 发送POST请求
            const response = await this._makeRequest('', requestBody);
            
            if (response.code === 0 && response.data != null) {
                this._conversationId = response.data.conversation_id;
                const chatId = response.data.id;
                console.log('获取到聊天 ID:', chatId);
                const result = await this._pollForResponse(chatId, this._conversationId);
                console.log('\n=== sendMessage 函数结束 ===');
                return result;
            } else {
                console.error('API 错误:', response.msg, '(code:', response.code, ')');
                console.log('\n=== sendMessage 函数出错 ===');
                return null;
            }

        } catch (error) {
            console.error('发送消息异常:', error);
            console.error('堆栈:', error.stack);
            console.log('\n=== sendMessage 函数出错 ===');
            throw error;
        }
    }

    async _pollForResponse(chatId, conversationId) {
        console.log('\n=== _pollForResponse 函数开始 ===');
        console.log('\n=== 开始轮询响应 ===');
        console.log(`聊天ID: ${chatId}`);
        console.log(`会话ID: ${conversationId}`);

        let attempts = 0;
        const maxAttempts = 30;  // 最多轮询30次
        const delay = 1000;     // 每次轮询间隔1秒

        // 先等待1秒再开始第一次轮询
        await new Promise(resolve => setTimeout(resolve, delay));

        while (attempts < maxAttempts) {
            console.log(`\n=== 开始第 ${attempts + 1} 次轮询 ===`);
            
            try {
                const retrieveParams = new URLSearchParams({
                    chat_id: chatId,
                    conversation_id: conversationId
                });
                
                // 发送GET请求查询状态
                const response = await this._makeRequest('/retrieve?' + retrieveParams.toString());

                if (response.code === 0 && response.data != null) {
                    const status = response.data.status;
                    
                    if (status === 'completed') {
                        // 获取消息列表
                        const messagesParams = new URLSearchParams({
                            chat_id: chatId,
                            conversation_id: conversationId
                        });
                        
                        const messagesResponse = await this._makeRequest('/message/list?' + messagesParams.toString());
                        
                        if (messagesResponse.code === 0 && messagesResponse.data != null) {
                            // 查找最后一条助手消息
                            for (const message of messagesResponse.data) {
                                if (message.role === 'assistant' && 
                                    message.type === 'answer' &&
                                    message.content_type === 'text') {
                                    console.log('\n=== 找到答案，准备返回 ===');
                                    console.log('答案内容:', message.content);
                                    return message.content;
                                }
                            }
                        }
                        console.log('\n=== _pollForResponse 函数出错 ===');
                        const error = new Error('获取消息失败');
                        console.error('错误:', error);
                        throw error;
                    } else if (status === 'failed') {
                        console.error('对话失败:', response.data.last_error);
                        console.log('\n=== _pollForResponse 函数出错 ===');
                        return null;
                    }
                }

                console.log('未找到答案，等待1秒后继续轮询');
                console.log(`\n=== 第 ${attempts + 1} 次轮询结束，未找到答案 ===`);
                attempts++;
                // 每次轮询后等待1秒
                await new Promise(resolve => setTimeout(resolve, delay));
            } catch (error) {
                console.log('\n=== _pollForResponse 函数出错 ===');
                throw error;
            }
        }

        console.log('\n=== _pollForResponse 函数超时结束 ===');
        throw new Error('响应超时');
    }

    async _makeRequest(endpoint, body = null) {
        console.log('\n=== _makeRequest 函数开始 ===');
        const url = this.baseUrl + endpoint;

        try {
            const response = await fetch(url, {
                method: body ? 'POST' : 'GET',
                headers: {
                    ...(body && { 'Content-Type': 'application/json' }),
                    'Authorization': `Bearer ${this.apiToken}`
                },
                ...(body && { body: JSON.stringify(body) })
            });

            console.log('\n=== API Request ===');
            console.log('URL:', url);
            console.log('Method:', body ? 'POST' : 'GET');
            if (body) console.log('Body:', body);
            console.log('Status:', response.status);

            const data = await response.json();
            console.log('Response:', data);
            console.log('\n=== _makeRequest 函数结束 ===');
            return data;

        } catch (error) {
            console.error('请求失败:', error);
            console.log('\n=== _makeRequest 函数出错 ===');
            throw error;
        }
    }

    clearConversation() {
        this._conversationId = null;
    }
}

export default CozeAIProvider;
