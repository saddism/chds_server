import express from 'express'
import jwt from 'jsonwebtoken'

const router = express.Router()

// JWT令牌验证中间件
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: '未提供令牌'
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: '无效的令牌'
    })
  }
}

// 内容修改接口
router.post('/modify', authenticateToken, async (req, res) => {
  const { content, translate, shorten } = req.body

  if (!content) {
    return res.status(400).json({
      success: false,
      error: '缺少必要的参数'
    })
  }

  try {
    let modifiedContent = content

    // 这里实现实际的内容修改逻辑
    // 目前返回模拟响应
    if (translate) {
      modifiedContent = `已翻译: ${modifiedContent}`
    }

    if (shorten) {
      modifiedContent = `已缩短: ${modifiedContent}`
    }

    res.json({
      success: true,
      content: modifiedContent
    })
  } catch (error) {
    console.error('内容修改接口错误:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
