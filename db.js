import postgres from 'postgres'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

// 数据库连接配置
const connectionConfig = {
  ssl: {
    rejectUnauthorized: false
  },
  max: 10, // 连接池最大连接数
  idle_timeout: 20, // 空闲连接超时时间（秒）
  connect_timeout: 10, // 连接超时时间（秒）
  max_lifetime: 60 * 30, // 连接最大生命周期（秒）
  keepalive: true, // 保持连接活跃
  onnotice: () => {}, // 忽略通知
  onparameter: () => {}, // 忽略参数
  debug: false, // 调试模式
  transform: {
    undefined: null, // 将undefined转换为null
  }
}

// 创建数据库连接池
let sql = postgres(process.env.DATABASE_URL, connectionConfig)

// 重新连接函数
export function reconnect() {
  try {
    sql.end({ timeout: 5 })
  } catch (error) {
    console.error('关闭旧连接错误:', error)
  }
  sql = postgres(process.env.DATABASE_URL, connectionConfig)
  return sql
}

// 测试连接函数
export async function testConnection() {
  try {
    await sql`SELECT 1`
    console.log('数据库连接测试成功')
    return true
  } catch (error) {
    console.error('数据库连接测试失败:', error)
    return false
  }
}

// 查询函数
export async function query(strings, ...values) {
  let retries = 3
  let lastError

  while (retries > 0) {
    try {
      return await sql(strings, ...values)
    } catch (error) {
      lastError = error
      console.error(`查询错误 (剩余重试次数: ${retries - 1}):`, error)

      if (error.code === 'CONNECTION_ENDED') {
        sql = reconnect()
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      retries--
    }
  }

  throw lastError
}

export default sql
