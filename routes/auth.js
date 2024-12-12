import express from 'express'
import jwt from 'jsonwebtoken'
import { query } from '../db.js'
import { sendVerificationCode, verifyCode } from '../utils/sms.js'

const router = express.Router()

// 发送验证码
router.post('/send-code', async (req, res) => {
  try {
    const { phone_num } = req.body

    if (!phone_num) {
      return res.status(400).json({
        success: false,
        message: '请提供手机号',
        debugInfo: {
          timestamp: new Date().toISOString(),
          requestDetails: {
            url: '/auth/send-code',
            method: 'POST',
            headers: req.headers,
            body: { phone_num }
          },
          error: '请提供手机号',
          errorName: 'ValidationError',
          errorCode: 'PHONE_REQUIRED'
        }
      })
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone_num)) {
      return res.status(400).json({
        success: false,
        message: '手机号格式不正确',
        debugInfo: {
          timestamp: new Date().toISOString(),
          requestDetails: {
            url: '/auth/send-code',
            method: 'POST',
            headers: req.headers,
            body: { phone_num }
          },
          error: '手机号格式不正确',
          errorName: 'ValidationError',
          errorCode: 'INVALID_PHONE_FORMAT'
        }
      })
    }

    const result = await sendVerificationCode(phone_num)
    console.log('短信发送结果:', result)

    // 如果是频率限制错误，返回 429 状态码
    if (result.debugInfo?.errorName === 'isv.BUSINESS_LIMIT_CONTROLError') {
      return res.status(429).json(result)
    }

    // 其他错误返回 500
    if (!result.success) {
      return res.status(500).json(result)
    }

    res.json(result)
  } catch (error) {
    console.error('发送验证码错误:', error)
    res.status(500).json({
      success: false,
      message: '发送验证码失败，请稍后重试',
      debugInfo: {
        timestamp: new Date().toISOString(),
        requestDetails: {
          url: '/auth/send-code',
          method: 'POST',
          headers: req.headers,
          body: { phone_num }
        },
        error: error.message,
        errorName: error.name,
        errorStack: error.stack,
        errorCode: 'INTERNAL_ERROR'
      }
    })
  }
})

// 登录接口
router.post('/login', async (req, res) => {
  try {
    const { phone_num, code } = req.body

    // 验证验证码
    const verifyResult = await verifyCode(phone_num, code)
    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        message: verifyResult.message,
        debugInfo: {
          timestamp: new Date().toISOString(),
          phoneNumber: phone_num,
          requestDetails: {
            url: '/auth/login',
            method: 'POST',
            headers: req.headers,
            body: { phone_num, code }
          },
          responseDetails: {
            verificationStatus: verifyResult.success ? '成功' : '失败',
            message: verifyResult.message,
            details: {
              inputCode: verifyResult.details.inputCode,
              storedCode: verifyResult.details.storedCode,
              isExpired: verifyResult.details.isExpired,
              timeRemaining: Math.floor(verifyResult.details.timeRemaining / 1000) + '秒',
              requestTime: new Date(verifyResult.details.currentTime).toISOString(),
              codeTimestamp: new Date(verifyResult.details.timestamp).toISOString()
            }
          },
          error: verifyResult.message,
          errorName: 'VerificationError',
          errorCode: verifyResult.details.isExpired ? 'CODE_EXPIRED' : 
                    !verifyResult.details.storedCode ? 'CODE_NOT_FOUND' : 
                    'CODE_MISMATCH'
        }
      })
    }

    // 查找用户
    let users = await query`
      SELECT * FROM myuser WHERE phone_num = ${phone_num}
    `

    let user
    if (users.length === 0) {
      // 创建新用户
      const result = await query`
        INSERT INTO myuser (phone_num, is_paid, valid_date)
        VALUES (${phone_num}, false, null)
        RETURNING *
      `
      user = result[0]
    } else {
      user = users[0]
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { userid: user.userid },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      success: true,
      token,
      user: {
        userid: user.userid,
        phone_num: user.phone_num,
        is_paid: user.is_paid,
        valid_date: user.valid_date
      }
    })
  } catch (error) {
    console.error('登录接口错误:', error)
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试',
      debugInfo: {
        timestamp: new Date().toISOString(),
        requestDetails: {
          url: '/auth/login',
          method: 'POST',
          headers: req.headers,
          body: { phone_num, code }
        },
        error: error.message,
        errorName: error.name,
        errorStack: error.stack,
        errorCode: 'INTERNAL_ERROR'
      }
    })
  }
})

// 状态检查接口
router.get('/status', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供令牌',
        debugInfo: {
          timestamp: new Date().toISOString(),
          requestDetails: {
            url: '/auth/status',
            method: 'GET',
            headers: req.headers
          },
          error: '未提供令牌',
          errorName: 'UnauthorizedError',
          errorCode: 'TOKEN_REQUIRED'
        }
      })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const users = await query`
        SELECT * FROM myuser WHERE userid = ${decoded.userid}
      `

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: '用户不存在',
          debugInfo: {
            timestamp: new Date().toISOString(),
            requestDetails: {
              url: '/auth/status',
              method: 'GET',
              headers: req.headers
            },
            error: '用户不存在',
            errorName: 'NotFoundError',
            errorCode: 'USER_NOT_FOUND'
          }
        })
      }

      const user = users[0]
      res.json({
        success: true,
        user: {
          userid: user.userid,
          phone_num: user.phone_num,
          is_paid: user.is_paid,
          valid_date: user.valid_date
        }
      })
    } catch (error) {
      res.status(401).json({
        success: false,
        message: '无效令牌',
        debugInfo: {
          timestamp: new Date().toISOString(),
          requestDetails: {
            url: '/auth/status',
            method: 'GET',
            headers: req.headers
          },
          error: error.message,
          errorName: error.name,
          errorCode: 'INVALID_TOKEN'
        }
      })
    }
  } catch (error) {
    console.error('状态检查接口错误:', error)
    res.status(500).json({
      success: false,
      message: '状态检查失败，请稍后重试',
      debugInfo: {
        timestamp: new Date().toISOString(),
        requestDetails: {
          url: '/auth/status',
          method: 'GET',
          headers: req.headers
        },
        error: error.message,
        errorName: error.name,
        errorStack: error.stack,
        errorCode: 'INTERNAL_ERROR'
      }
    })
  }
})

// 更新付费状态接口
router.post('/update-paid-status', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供令牌',
        debugInfo: {
          timestamp: new Date().toISOString(),
          requestDetails: {
            url: '/auth/update-paid-status',
            method: 'POST',
            headers: req.headers
          },
          error: '未提供令牌',
          errorName: 'UnauthorizedError',
          errorCode: 'TOKEN_REQUIRED'
        }
      })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const { is_paid, valid_date } = req.body

      const result = await query`
        UPDATE myuser
        SET is_paid = ${is_paid}, valid_date = ${valid_date}
        WHERE userid = ${decoded.userid}
        RETURNING *
      `

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: '用户不存在',
          debugInfo: {
            timestamp: new Date().toISOString(),
            requestDetails: {
              url: '/auth/update-paid-status',
              method: 'POST',
              headers: req.headers
            },
            error: '用户不存在',
            errorName: 'NotFoundError',
            errorCode: 'USER_NOT_FOUND'
          }
        })
      }

      const user = result[0]
      res.json({
        success: true,
        user: {
          userid: user.userid,
          phone_num: user.phone_num,
          is_paid: user.is_paid,
          valid_date: user.valid_date
        }
      })
    } catch (error) {
      res.status(401).json({
        success: false,
        message: '无效令牌',
        debugInfo: {
          timestamp: new Date().toISOString(),
          requestDetails: {
            url: '/auth/update-paid-status',
            method: 'POST',
            headers: req.headers
          },
          error: error.message,
          errorName: error.name,
          errorCode: 'INVALID_TOKEN'
        }
      })
    }
  } catch (error) {
    console.error('更新付费状态接口错误:', error)
    res.status(500).json({
      success: false,
      message: '更新付费状态失败，请稍后重试',
      debugInfo: {
        timestamp: new Date().toISOString(),
        requestDetails: {
          url: '/auth/update-paid-status',
          method: 'POST',
          headers: req.headers
        },
        error: error.message,
        errorName: error.name,
        errorStack: error.stack,
        errorCode: 'INTERNAL_ERROR'
      }
    })
  }
})

// 验证码验证接口
router.post('/verify', async (req, res) => {
  try {
    const { phone, code } = req.body
    const result = await verifyCode(phone, code)

    if (!result.success) {
      return res.status(400).json(result)
    }

    // 查找或创建用户
    let users = await query`
      SELECT * FROM myuser WHERE phone_num = ${phone}
    `

    let user
    if (users.length === 0) {
      const result = await query`
        INSERT INTO myuser (phone_num, is_paid, valid_date)
        VALUES (${phone}, false, null)
        RETURNING *
      `
      user = result[0]
    } else {
      user = users[0]
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { userid: user.userid },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // 返回成功响应
    res.json({
      success: true,
      token,
      user: {
        userid: user.userid,
        phone_num: user.phone_num,
        is_paid: user.is_paid,
        valid_date: user.valid_date,
        created_at: user.created_at
      }
    })
  } catch (error) {
    console.error('验证接口错误:', error)
    res.status(500).json({
      success: false,
      message: '验证失败，请稍后重试',
      debugInfo: {
        timestamp: new Date().toISOString(),
        requestDetails: {
          url: '/auth/verify',
          method: 'POST',
          headers: req.headers,
          body: { phone, code }
        },
        error: error.message,
        errorName: error.name,
        errorStack: error.stack,
        errorCode: 'INTERNAL_ERROR'
      }
    })
  }
})

// Token验证接口
router.post('/verify-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供令牌',
        debugInfo: {
          timestamp: new Date().toISOString(),
          requestDetails: {
            url: '/auth/verify-token',
            method: 'POST',
            headers: req.headers
          },
          error: '未提供令牌',
          errorName: 'UnauthorizedError',
          errorCode: 'TOKEN_REQUIRED'
        }
      });
    }

    try {
      // 验证token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 获取用户信息
      const users = await query`
        SELECT * FROM myuser WHERE userid = ${decoded.userid}
      `;

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: '用户不存在',
          debugInfo: {
            timestamp: new Date().toISOString(),
            requestDetails: {
              url: '/auth/verify-token',
              method: 'POST',
              headers: req.headers
            },
            error: '用户不存在',
            errorName: 'NotFoundError',
            errorCode: 'USER_NOT_FOUND'
          }
        });
      }

      const user = users[0];
      res.json({
        success: true,
        user: {
          userid: user.userid,
          phone_num: user.phone_num,
          is_paid: user.is_paid,
          valid_date: user.valid_date,
          created_at: user.created_at
        }
      });
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: '无效的令牌',
          debugInfo: {
            timestamp: new Date().toISOString(),
            requestDetails: {
              url: '/auth/verify-token',
              method: 'POST',
              headers: req.headers
            },
            error: error.message,
            errorName: error.name,
            errorCode: 'INVALID_TOKEN'
          }
        });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: '令牌已过期',
          debugInfo: {
            timestamp: new Date().toISOString(),
            requestDetails: {
              url: '/auth/verify-token',
              method: 'POST',
              headers: req.headers
            },
            error: error.message,
            errorName: error.name,
            errorCode: 'TOKEN_EXPIRED'
          }
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Token验证错误:', error);
    res.status(500).json({
      success: false,
      message: 'Token验证失败，请稍后重试',
      debugInfo: {
        timestamp: new Date().toISOString(),
        requestDetails: {
          url: '/auth/verify-token',
          method: 'POST',
          headers: req.headers
        },
        error: error.message,
        errorName: error.name,
        errorStack: error.stack,
        errorCode: 'INTERNAL_ERROR'
      }
    });
  }
});

export default router
