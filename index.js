// 导入必要的依赖
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import sql from './db.js'
import authRoutes from './routes/auth.js'
import apiRoutes from './routes/api.js'
import aiRoutes from './routes/ai.js'
import path from 'path'
import { fileURLToPath } from 'url'

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 加载环境变量
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// 中间件配置
app.use(cors({
  origin: function (origin, callback) {
    // 允许 Chrome 扩展和本地开发
    if (!origin || origin.startsWith('chrome-extension://') || origin === 'http://localhost:3000') {
      callback(null, true)
    } else {
      callback(new Error('不允许的来源'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))  // 启用跨域请求
app.use(express.json())  // 解析JSON请求体

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')))
app.use('/docs', express.static(path.join(__dirname, 'docs')))

// 根路由
app.get('/', (req, res) => {
  res.redirect('/status.html')
})

// 路由配置
app.use('/auth', authRoutes)  // 用户认证相关路由
app.use('/api', apiRoutes)    // API相关路由
app.use('/ai', aiRoutes)  // AI相关路由

// 数据库连接测试路由
app.get('/test', async (req, res) => {
  try {
    const result = await sql`SELECT NOW()`
    res.json({ success: true, time: result[0].now })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  })
})

// 仅在非测试环境下启动服务器
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`)
  })
}

export default app
