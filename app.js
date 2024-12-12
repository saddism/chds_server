import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import aiRouter from './routes/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 路由
app.use('/ai', aiRouter);

// 错误处理
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: err.message
    });
});

// 启动服务器
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});
