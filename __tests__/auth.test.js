import request from 'supertest'
import jwt from 'jsonwebtoken'
import { setupDatabase, cleanupDatabase, closeDatabase } from './setup.js'
import app from '../index.js'
import { query } from '../db.js'

describe('认证路由测试', () => {
  let token
  let userid

  beforeAll(async () => {
    await setupDatabase()
  })

  beforeEach(async () => {
    await cleanupDatabase()
  })

  afterAll(async () => {
    await closeDatabase()
  })

  describe('POST /auth/login - 登录接口', () => {
    it('应该创建新用户并返回令牌', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          phone_num: 'test123456789'
        })

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.token).toBeDefined()
      expect(res.body.user).toBeDefined()
      expect(res.body.user.phone_num).toBe('test123456789')
      expect(res.body.user.is_paid).toBe(false)
      expect(res.body.user.valid_date).toBeNull()

      // 验证用户是否已存入数据库
      const result = await query`SELECT * FROM myuser WHERE phone_num = ${'test123456789'}`
      expect(result).toHaveLength(1)
      expect(result[0].phone_num).toBe('test123456789')
    })

    it('应该为已存在的用户返回令牌', async () => {
      // 先创建用户
      await request(app)
        .post('/auth/login')
        .send({
          phone_num: 'test123456789'
        })

      // 再次登录
      const res = await request(app)
        .post('/auth/login')
        .send({
          phone_num: 'test123456789'
        })

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.token).toBeDefined()
      expect(res.body.user).toBeDefined()
      expect(res.body.user.phone_num).toBe('test123456789')
    })
  })

  describe('GET /auth/status - 状态检查接口', () => {
    beforeEach(async () => {
      // 创建测试用户
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

    it('应该返回有效令牌的用户状态', async () => {
      const res = await request(app)
        .get('/auth/status')
        .set('Authorization', `Bearer ${token}`)

      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.user).toBeDefined()
      expect(res.body.user.userid).toBe(userid)
      expect(res.body.user.phone_num).toBe('test123456789')
    })

    it('应该对无效令牌返回401错误', async () => {
      const res = await request(app)
        .get('/auth/status')
        .set('Authorization', 'Bearer invalid-token')

      expect(res.statusCode).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toBeDefined()
    })

    it('应该对缺少令牌返回401错误', async () => {
      const res = await request(app)
        .get('/auth/status')

      expect(res.statusCode).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toBeDefined()
    })

    describe('POST /auth/update-paid-status - 更新付费状态接口', () => {
      it('应该成功更新用户的付费状态', async () => {
        const validDate = new Date()
        validDate.setDate(validDate.getDate() + 30) // 30天后过期

        const res = await request(app)
          .post('/auth/update-paid-status')
          .set('Authorization', `Bearer ${token}`)
          .send({
            is_paid: true,
            valid_date: validDate
          })

        expect(res.statusCode).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.user.is_paid).toBe(true)
        expect(new Date(res.body.user.valid_date)).toBeInstanceOf(Date)

        // 验证数据库中的更新
        const result = await query`SELECT * FROM myuser WHERE userid = ${userid}`
        expect(result).toHaveLength(1)
        expect(result[0].is_paid).toBe(true)
        expect(new Date(result[0].valid_date)).toBeInstanceOf(Date)
      })
    })
  })
})
