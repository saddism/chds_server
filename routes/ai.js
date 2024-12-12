import express from 'express';
import aiFactory from '../services/ai/index.js';

const router = express.Router();

// 聊天接口
router.post('/chat', async (req, res) => {
    try {
        const { messages, stream, bot_id, user_id, conversation_id, auto_save_history } = req.body;
        
        if (!messages || !messages.length || !messages[0].content) {
            return res.status(400).json({
                success: false,
                message: '请提供消息内容'
            });
        }

        console.log('发送消息请求:', {
            messages,
            bot_id,
            user_id,
            conversation_id
        });

        // 使用工厂方法发送消息
        const result = await aiFactory.sendMessage('coze', messages[0].content, {
            bot_id,
            user_id,
            conversation_id,
            auto_save_history
        });

        if (!result) {
            return res.status(500).json({
                success: false,
                error: '请求失败'
            });
        }

        return res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('调用 Coze API 失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 查询对话状态
router.get('/chat/retrieve', async (req, res) => {
    try {
        const { chat_id, conversation_id } = req.query;

        if (!chat_id || !conversation_id) {
            return res.status(400).json({
                success: false,
                message: '需要提供 chat_id 和 conversation_id'
            });
        }

        console.log('查询状态请求:', {
            chat_id,
            conversation_id
        });

        const coze = aiFactory.getProvider('coze');
        const result = await coze.getChatStatus(chat_id, conversation_id);
        
        console.log('查询状态响应:', result);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('查询对话状态失败:', error);
        res.status(500).json({
            success: false,
            message: '查询对话状态失败',
            error: error.message
        });
    }
});

// 查询对话消息详情
router.get('/chat/:chatId/messages', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { conversation_id } = req.query;

        if (!conversation_id) {
            return res.status(400).json({
                success: false,
                message: '需要提供 conversation_id'
            });
        }

        console.log('查询消息请求:', {
            chatId,
            conversation_id
        });

        const coze = aiFactory.getProvider('coze');
        const result = await coze.getChatMessages(chatId, conversation_id);
        
        console.log('查询消息响应:', result);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('查询消息详情失败:', error);
        res.status(500).json({
            success: false,
            message: '查询消息详情失败',
            error: error.message
        });
    }
});

export default router;
