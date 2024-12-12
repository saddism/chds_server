import dotenv from 'dotenv'
import sql, { reconnect, testConnection, query } from '../db.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// 从.env文件加载环境变量
dotenv.config()

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 设置测试环境变量
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test'

// 读取数据库架构文件
const schemaPath = path.join(__dirname, '..', 'schema.sql')
const schema = fs.readFileSync(schemaPath, 'utf8')

// 初始化测试数据库
export async function setupDatabase() {
  try {
    // 重新连接数据库
    const sql = reconnect()
    
    // 测试数据库连接
    const isConnected = await testConnection()
    if (!isConnected) {
      throw new Error('数据库连接测试失败')
    }

    // 清理现有表
    await query`DROP TABLE IF EXISTS myuser CASCADE`
    
    // 创建数据库表
    await sql.unsafe(schema)
    console.log('数据库表创建成功')
    
    return sql
  } catch (error) {
    console.error('数据库初始化错误:', error)
    throw error
  }
}

// 清理数据库
export async function cleanupDatabase() {
  try {
    await query`TRUNCATE myuser RESTART IDENTITY CASCADE`
    console.log('数据库清理成功')
  } catch (error) {
    console.error('数据库清理错误:', error)
    throw error
  }
}

// 关闭数据库连接
export async function closeDatabase() {
  try {
    await sql.end({ timeout: 5 })
    console.log('数据库连接已关闭')
  } catch (error) {
    console.error('关闭数据库连接错误:', error)
    throw error
  }
}

// 执行数据库初始化
await setupDatabase()
