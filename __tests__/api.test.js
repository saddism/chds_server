import request from 'supertest'
import jwt from 'jsonwebtoken'
import { setupDatabase, cleanupDatabase, closeDatabase } from './setup.js'
import app from '../index.js'
import { query } from '../db.js'

describe('API路由测试', () => {
  let token
  let userid

  beforeAll(async () => {
    await setupDatabase()
  })

  beforeEach(async () => {
    await cleanupDatabase()

    // 创建测试用户并获取令牌
    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        phone_num: 'test123456789'
      })

    expect(loginRes.body.success).toBe(true)
    expect(loginRes.body.user).toBeDefined()
    
    token = loginRes.body.token
    userid = loginRes.body.user.userid
  })

  afterAll(async () => {
    await closeDatabase()
  })

  describe('POST /api/modify - 内容修改接口', () => {
    it('应该在认证后修改内容', async () => {
      const res = await request(app)
        .post('/api/modify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: '这是一段测试内容',
          translate: true,
          shorten: true
        })

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.result).toBeDefined()
      expect(res.body.result.original).toBe('这是一段测试内容')
      expect(res.body.result.translated).toBeDefined()
      expect(res.body.result.shortened).toBeDefined()
    })

    it('应该对缺少令牌返回401错误', async () => {
      const res = await request(app)
        .post('/api/modify')
        .send({
          content: '这是一段测试内容',
          translate: true,
          shorten: true
        })

      expect(res.statusCode).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toBeDefined()
    })

    it('应该对无效令牌返回401错误', async () => {
      const res = await request(app)
        .post('/api/modify')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          content: '这是一段测试内容',
          translate: true,
          shorten: true
        })

      expect(res.statusCode).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toBeDefined()
    })

    it('应该处理缺少content参数的情况', async () => {
      const res = await request(app)
        .post('/api/modify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          translate: true,
          shorten: true
        })

      expect(res.statusCode).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toBeDefined()
    })

    it('应该处理不同的翻译和缩短组合', async () => {
      const testCases = [
        { translate: true, shorten: false },
        { translate: false, shorten: true },
        { translate: true, shorten: true }
      ]

      for (const testCase of testCases) {
        const res = await request(app)
          .post('/api/modify')
          .set('Authorization', `Bearer ${token}`)
          .send({
            content: '这是一段测试内容',
            ...testCase
          })

        expect(res.statusCode).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.result).toBeDefined()
        expect(res.body.result.original).toBe('这是一段测试内容')

        if (testCase.translate) {
          expect(res.body.result.translated).toBeDefined()
        }
        if (testCase.shorten) {
          expect(res.body.result.shortened).toBeDefined()
        }
      }
    })
  })
})
