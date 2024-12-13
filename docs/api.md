# 长话短说 API 文档

## 目录

- [基础信息](#基础信息)
- [认证流程](#认证流程)
- [API 接口详情](#api-接口详情)
  - [发送验证码](#发送验证码)
  - [用户登录](#用户登录)
  - [验证 Token](#验证-token)
  - [更新付费状态](#更新付费状态)
  - [AI 文本处理](#ai-文本处理)
- [错误处理](#错误处理)
- [使用示例](#使用示例)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)
- [登录认证流程](#登录认证流程)
- [Token 验证](#token-验证)
- [错误响应](#错误响应)
- [Chrome 扩展集成说明](#chrome-扩展集成说明)
- [调试信息](#调试信息)
- [本地开发配置](#本地开发配置)
- [Chrome 扩展存储结构](#chrome-扩展存储结构)
- [前端页面结构](#前端页面结构)
- [页面功能](#页面功能)
- [状态管理](#状态管理)
- [错误处理](#错误处理-1)
- [调试模式](#调试模式)
- [安全考虑](#安全考虑)
- [AI 服务接口](#ai-服务接口)

## 基础信息

### 文档访问

- 在线文档地址：`http://localhost:3000/api_doc.html`
- Markdown 源文件：`/docs/api.md`

### 服务器信息
- **基础URL**: `http://localhost:3000`
- **协议**: HTTP/HTTPS
- **API版本**: v1
- **编码格式**: UTF-8

### 请求格式
- 请求体格式: JSON
- Content-Type: application/json
- 字符编码: UTF-8

### 认证方式
所有需要认证的接口都需要在请求头中携带 JWT token：
```http
Authorization: Bearer <your_token>
```

### 通用响应格式
所有 API 响应都遵循以下格式：
```json
{
  "success": true|false,        // 请求是否成功
  "message": "响应信息",        // 人类可读的响应消息
  "data": {},                   // 具体的响应数据（可选）
  "debugInfo": {}              // 调试信息（仅在开发环境）
}
```

## 认证流程

完整的用户认证流程如下：

1. 前端调用 `/auth/send-code` 发送验证码到用户手机
2. 用户收到验证码后，前端调用 `/auth/login` 进行登录
3. 登录成功后获取 JWT token
4. 后续请求在 Header 中携带 token
5. 可以随时调用 `/auth/verify-token` 验证 token 有效性

## API 接口详情

### 发送验证码

发送手机验证码用于登录验证。系统会生成一个 6 位数的验证码发送到指定手机号。

- **接口**: `/auth/send-code`
- **方法**: `POST`
- **认证**: 不需要

#### 请求参数
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|-------|------|-----|------|------|
| phone | string | 是 | 中国大陆手机号 | "13800138000" |

#### 请求示例
```http
POST /auth/send-code HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "phone": "13800138000"
}
```

#### 成功响应 (200)
```json
{
  "success": true,
  "message": "验证码发送成功",
  "data": {
    "phone": "13800138000",
    "expireTime": "300"  // 验证码有效期（秒）
  },
  "debugInfo": {
    "timestamp": "2024-12-12T05:48:02+08:00",
    "phoneNumber": "13800138000",
    "provider": "阿里云",
    "templateId": "SMS_123456789"
  }
}
```

#### 错误响应

##### 参数错误 (400)
```json
{
  "success": false,
  "message": "手机号格式不正确",
  "debugInfo": {
    "timestamp": "2024-12-12T05:48:02+08:00",
    "phoneNumber": "1380013800",
    "error": "手机号必须是11位数字",
    "errorName": "ValidationError"
  }
}
```

##### 服务器错误 (500)
```json
{
  "success": false,
  "message": "验证码发送失败",
  "debugInfo": {
    "timestamp": "2024-12-12T05:48:02+08:00",
    "phoneNumber": "13800138000",
    "error": "SMS service unavailable",
    "errorName": "ServiceError"
  }
}
```

#### 限制说明
- 同一手机号 60 秒内只能发送一次验证码
- 同一手机号每天最多发送 10 次验证码
- 验证码有效期为 5 分钟
- IP 限制：同一 IP 每小时最多发送 20 次验证码

### 用户登录

使用手机号和验证码进行登录，成功后返回 JWT token。

- **接口**: `/auth/login`
- **方法**: `POST`
- **认证**: 不需要

#### 请求参数
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|-------|------|-----|------|------|
| phone_num | string | 是 | 手机号 | "13800138000" |
| code | string | 是 | 验证码 | "123456" |

#### 请求示例
```http
POST /auth/login HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "phone_num": "13800138000",
  "code": "123456"
}
```

#### 成功响应 (200)
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "userid": 1,
      "phone_num": "13800138000",
      "is_paid": false,
      "valid_date": null,
      "created_at": "2024-12-12T05:48:02+08:00",
      "last_login": "2024-12-12T05:48:02+08:00"
    }
  }
}
```

#### 错误响应

##### 验证码错误 (400)
```json
{
  "success": false,
  "message": "验证码错误或已过期",
  "debugInfo": {
    "timestamp": "2024-12-12T05:48:02+08:00",
    "phoneNumber": "13800138000",
    "error": "Invalid verification code",
    "errorName": "ValidationError"
  }
}
```

##### 服务器错误 (500)
```json
{
  "success": false,
  "message": "登录失败",
  "debugInfo": {
    "timestamp": "2024-12-12T05:48:02+08:00",
    "error": "Database connection error",
    "errorName": "DatabaseError"
  }
}
```

#### Token 说明
- Token 采用 JWT 格式
- 有效期为 7 天
- Token 包含以下信息：
  - userid: 用户ID
  - iat: 签发时间
  - exp: 过期时间

### 验证 Token

验证用户 token 的有效性，同时返回最新的用户信息。

- **接口**: `/auth/verify-token`
- **方法**: `POST`
- **认证**: 需要

#### 请求头
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### 成功响应 (200)
```json
{
  "success": true,
  "message": "token有效",
  "data": {
    "user": {
      "userid": 1,
      "phone_num": "13800138000",
      "is_paid": false,
      "valid_date": null,
      "created_at": "2024-12-12T05:48:02+08:00",
      "last_login": "2024-12-12T05:48:02+08:00"
    },
    "token_info": {
      "issued_at": "2024-12-12T05:48:02+08:00",
      "expires_at": "2024-12-19T05:48:02+08:00"
    }
  }
}
```

#### 错误响应

##### Token 无效 (401)
```json
{
  "success": false,
  "message": "token无效",
  "error": "Invalid token format"
}
```

##### Token 过期 (401)
```json
{
  "success": false,
  "message": "token已过期",
  "error": "Token expired"
}
```

### 更新付费状态

更新用户的付费状态和会员有效期。

- **接口**: `/auth/update-paid-status`
- **方法**: `POST`
- **认证**: 需要

#### 请求参数
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|-------|------|-----|------|------|
| is_paid | boolean | 是 | 付费状态 | true |
| valid_date | string | 是 | 有效期 | "2024-12-31T23:59:59Z" |

#### 请求示例
```http
POST /auth/update-paid-status HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "is_paid": true,
  "valid_date": "2024-12-31T23:59:59Z"
}
```

#### 成功响应 (200)
```json
{
  "success": true,
  "message": "付费状态更新成功",
  "data": {
    "user": {
      "userid": 1,
      "phone_num": "13800138000",
      "is_paid": true,
      "valid_date": "2024-12-31T23:59:59Z",
      "updated_at": "2024-12-12T05:48:02+08:00"
    }
  }
}
```

#### 错误响应

##### 认证失败 (401)
```json
{
  "success": false,
  "message": "未授权访问",
  "error": "Unauthorized"
}
```

##### 参数错误 (400)
```json
{
  "success": false,
  "message": "参数错误",
  "debugInfo": {
    "timestamp": "2024-12-12T05:48:02+08:00",
    "error": "Invalid date format",
    "errorName": "ValidationError"
  }
}
```

### AI 文本处理

一键处理文本内容（总结/翻译）。

- **接口**: `/api/ai/process`
- **方法**: `POST`
- **认证**: 需要

#### 请求参数
| 参数名 | 必选 | 类型 | 说明 |
|--------|------|------|------|
| content | 是 | string | 需要处理的文本内容 |
| needSummary | 是 | boolean | 是否需要总结 |
| needTranslate | 是 | boolean | 是否需要翻译 |
| summaryLevel | 否 | number | 总结长度档位（5最长，1最短），默认3 |

#### 总结长度档位说明

| 档位 | 说明 | 字数限制 |
|------|------|----------|
| 5 | 很长 | 500字 |
| 4 | 长 | 300字 |
| 3 | 中等 | 200字 |
| 2 | 短 | 100字 |
| 1 | 很短 | 50字 |

#### 请求示例
```json
{
  "content": "要处理的文本内容...",
  "needSummary": true,
  "needTranslate": true,
  "summaryLevel": 3
}
```

#### 返回示例

成功响应：
```json
{
  "success": true,
  "data": "AI 处理后的内容"
}
```

错误响应：
```json
{
  "success": false,
  "error": "错误信息"
}
```

#### 调用示例

```javascript
// 使用 fetch
async function processText(text) {
  try {
    const response = await fetch('/ai/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: text,
        needSummary: true,    // 需要总结
        needTranslate: true,  // 需要翻译
        summaryLevel: 3       // 中等长度
      })
    });

    const result = await response.json();
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('处理失败:', error);
    throw error;
  }
}

// 使用 axios
async function processText(text) {
  try {
    const response = await axios.post('/ai/process', {
      content: text,
      needSummary: true,
      needTranslate: true,
      summaryLevel: 3
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error);
    }
  } catch (error) {
    console.error('处理失败:', error);
    throw error;
  }
}
```

#### 注意事项

1. 必须至少选择一种处理方式（总结或翻译）
2. 如果 `needSummary` 为 false，则 `summaryLevel` 参数无效
3. 翻译默认为中译英或英译中（自动检测源语言）
4. 建议控制输入文本长度在 4000 字以内
5. 如果同时选择总结和翻译，会先总结再翻译

#### 测试页面

可以访问 `/ai_convert_test.html` 来测试接口功能，包含：
- 文本输入框
- 处理选项（总结/翻译）
- 总结长度选择
- 实时结果显示

## 错误处理

### HTTP 状态码
| 状态码 | 说明 |
|-------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或认证失败 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

### 错误响应格式
```json
{
  "success": false,
  "message": "错误描述",
  "error": "错误类型",
  "debugInfo": {
    "timestamp": "错误发生时间",
    "errorName": "错误名称",
    "errorStack": "错误堆栈（仅在开发环境）"
  }
}
```

## 使用示例

### 完整的登录流程

```javascript
// 1. 发送验证码
async function sendVerificationCode(phone) {
  const response = await fetch('http://localhost:3000/auth/send-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ phone })
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message);
  }
  return result;
}

// 2. 登录
async function login(phone_num, code) {
  const response = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ phone_num, code })
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message);
  }
  
  // 保存 token
  localStorage.setItem('token', result.data.token);
  return result;
}

// 3. 验证 token
async function verifyToken() {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No token found');
  }
  
  const response = await fetch('http://localhost:3000/auth/verify-token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const result = await response.json();
  if (!result.success) {
    localStorage.removeItem('token');
    throw new Error(result.message);
  }
  return result;
}

// 4. 更新付费状态
async function updatePaidStatus(isPaid, validDate) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No token found');
  }
  
  const response = await fetch('http://localhost:3000/auth/update-paid-status', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      is_paid: isPaid,
      valid_date: validDate
    })
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message);
  }
  return result;
}

// 使用示例
async function example() {
  try {
    // 发送验证码
    await sendVerificationCode('13800138000');
    console.log('验证码已发送');
    
    // 用户输入验证码后登录
    const loginResult = await login('13800138000', '123456');
    console.log('登录成功:', loginResult);
    
    // 验证 token
    const verifyResult = await verifyToken();
    console.log('token 有效:', verifyResult);
    
    // 更新付费状态
    const updateResult = await updatePaidStatus(true, '2024-12-31T23:59:59Z');
    console.log('付费状态更新成功:', updateResult);
  } catch (error) {
    console.error('操作失败:', error.message);
  }
}
```

## 最佳实践

### 安全性建议
1. 始终使用 HTTPS 进行通信
2. 不要在客户端存储敏感信息
3. 定期刷新 token
4. 实现 token 黑名单机制
5. 使用合适的 token 过期时间

### 错误处理建议
1. 实现全局错误处理
2. 合理使用 HTTP 状态码
3. 提供有意义的错误消息
4. 在生产环境中隐藏敏感的错误信息

### 性能优化建议
1. 实现请求缓存
2. 使用合适的请求超时时间
3. 实现请求重试机制
4. 避免频繁的 token 验证

## 常见问题

### Q: token 过期了怎么办？
A: 当收到 401 状态码且错误信息为 "token已过期" 时，需要重新登录获取新的 token。

### Q: 如何处理验证码发送失败？
A: 可以根据返回的错误信息判断具体原因：
- 如果是频率限制，提示用户稍后重试
- 如果是服务器错误，可以实现重试机制

### Q: 如何确保 token 安全？
A: 
1. 使用 HTTPS
2. 设置合理的过期时间
3. 在客户端安全存储
4. 实现 token 撤销机制

### Q: 用户付费状态更新失败怎么办？
A: 
1. 检查 token 是否有效
2. 验证请求参数格式
3. 确保有效期格式正确
4. 实现失败重试机制

## 登录认证流程

### 1. 登录流程

#### 1.1 发送验证码
```http
POST /auth/send-code
Content-Type: application/json

{
    "phone": "13800138000"
}
```

响应：
```json
{
    "success": true,
    "message": "验证码已发送",
    "debugInfo": {
        "timestamp": "2024-12-12T06:22:47+08:00",
        "phoneNumber": "13800138000",
        "requestDetails": {
            "signName": "长话短说",
            "templateCode": "SMS_123456",
            "phoneNumber": "13800138000"
        }
    }
}
```

#### 1.2 验证登录
```http
POST /auth/verify
Content-Type: application/json

{
    "phone": "13800138000",
    "code": "123456"
}
```

响应：
```json
{
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
        "userid": "123",
        "phone_num": "13800138000",
        "is_paid": false,
        "valid_date": null,
        "created_at": "2024-12-12T06:22:47+08:00"
    }
}
```

### 2. Token 验证

#### 2.1 验证 Token
```http
POST /auth/verify-token
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json
```

响应：
```json
{
    "success": true,
    "user": {
        "userid": "123",
        "phone_num": "13800138000",
        "is_paid": false,
        "valid_date": null,
        "created_at": "2024-12-12T06:22:47+08:00"
    }
}
```

### 3. 错误响应

所有接口的错误响应格式如下：
```json
{
    "success": false,
    "error": "错误信息"
}
```

常见错误状态码：
- 400: 请求参数错误
- 401: 未认证或认证失败
- 500: 服务器内部错误

### 4. Chrome 扩展集成说明

#### 4.1 登录流程
1. 用户在扩展中点击登录，打开登录页面
2. 用户完成手机验证码登录
3. 登录成功后，页面会发送消息给扩展：
```javascript
chrome.runtime.sendMessage({
    type: 'LOGIN_SUCCESS',
    token: "eyJhbGciOiJIUzI1NiIs...",
    user: {
        userid: "123",
        phone_num: "13800138000",
        is_paid: false,
        valid_date: null,
        created_at: "2024-12-12T06:22:47+08:00"
    }
});
```

#### 4.2 Token 存储
- Token 应使用 `chrome.storage.local` 存储，而不是 localStorage
- 存储格式：
```javascript
chrome.storage.local.set({
    token: "JWT_TOKEN",
    user: {
        userid: "123",
        phone_num: "13800138000",
        is_paid: false,
        valid_date: null,
        created_at: "2024-12-12T06:22:47+08:00"
    },
    lastLoginTime: "2024-12-12T06:22:47+08:00"
});
```

#### 4.3 API 调用认证
所有需要认证的 API 调用都需要在 headers 中加入 token：
```javascript
const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
};
```

#### 4.4 Token 有效期和刷新
- Token 有效期为 7 天
- Token 过期后需要重新登录
- 可以通过 `/auth/verify-token` 接口检查 token 有效性

#### 4.5 安全建议
1. 始终使用 HTTPS 进行 API 调用
2. 不要在代码中硬编码 token
3. 定期验证 token 有效性
4. 使用 chrome.storage.local 而不是 localStorage
5. 在扩展卸载时清除存储的认证信息

### 5. 调试信息

开发环境下，所有接口都会返回详细的调试信息：
```json
{
    "debugInfo": {
        "timestamp": "ISO时间戳",
        "requestDetails": {
            "url": "请求URL",
            "method": "请求方法",
            "headers": {},
            "body": {}
        }
    }
}
```

### 6. 本地开发配置

- API 基础URL: `http://localhost:3000`
- 允许跨域的域名: `chrome-extension://*`
- 开发环境变量配置参考 `.env.example`

## Chrome 扩展存储结构

Chrome 扩展使用 `chrome.storage.local` 存储用户登录状态和相关信息。以下是存储的数据结构：

### 数据结构

```javascript
{
    // JWT Token，用于API认证
    "token": "eyJhbGciOiJIUzI1NiIs...",
    
    // 用户ID，用于标识用户
    "userid": "user_123456",
    
    // 上次更新时间（ISO 8601格式）
    "lastUpdated": "2024-12-12T07:21:54+08:00"
}
```

### 字段说明

- **token**
  - 类型：String
  - 说明：JWT认证令牌
  - 有效期：7天
  - 用途：用于API请求认证

- **userid**
  - 类型：String
  - 说明：用户唯一标识符
  - 格式：以 "user_" 开头的字符串
  - 用途：标识用户身份

- **lastUpdated**
  - 类型：String
  - 说明：数据最后更新时间
  - 格式：ISO 8601时间格式
  - 用途：追踪数据更新时间

### 使用示例

```javascript
// 存储数据
chrome.storage.local.set({
    token: "JWT_TOKEN",
    userid: "USER_ID",
    lastUpdated: new Date().toISOString()
}, () => {
    console.log('数据已保存');
});

// 读取数据
chrome.storage.local.get(['token', 'userid'], (result) => {
    const { token, userid } = result;
    // 使用token和userid
});

// 清除数据
chrome.storage.local.remove(['token', 'userid'], () => {
    console.log('数据已清除');
});
```

### 注意事项

1. **数据安全**
   - 不要存储敏感个人信息
   - Token 已经包含了必要的用户信息

2. **数据同步**
   - 在用户登录、登出时及时更新
   - 在 token 失效时主动清除

3. **错误处理**
   - 访问存储前检查 Chrome 扩展环境
   - 处理存储操作的异常情况

4. **存储限制**
   - 遵循 Chrome 存储限制（5MB）
   - 只存储必要的信息

## 前端页面结构

### 页面组成

1. **登录页面 (login.html)**
   - 登录表单
     - 手机号输入框
     - 验证码输入框
     - 发送验证码按钮
     - 登录按钮
   - 调试信息区域（仅在 debug 模式显示）
     - 请求详情
     - 响应详情
     - 错误信息

2. **状态页面 (status.html)**
   - 用户信息显示
     - 手机号
     - 会员状态
     - 到期时间
   - 功能按钮
     - 开通/续费会员按钮
     - 退出登录按钮
   - 会员购买模态框
     - 会员时长选择
     - 支付按钮

### 页面功能

1. **登录页面功能**
   ```javascript
   // 发送验证码
   async function sendVerificationCode(phone) {
       const response = await fetch('/auth/send-code', {
           method: 'POST',
           headers: {
               'Content-Type': 'application/json'
           },
           body: JSON.stringify({ phone_num: phone })
       });
       // 处理响应...
   }

   // 用户登录
   async function login(phone, code) {
       const response = await fetch('/auth/login', {
           method: 'POST',
           headers: {
               'Content-Type': 'application/json'
           },
           body: JSON.stringify({ phone_num: phone, code })
       });
       // 处理响应...
   }
   ```

2. **状态页面功能**
   ```javascript
   // 获取用户状态
   async function fetchUserStatus() {
       const response = await fetch('/api/user/status', {
           headers: {
               'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json'
           }
       });
       // 处理响应...
   }

   // 购买会员
   async function purchaseMembership(duration) {
       const response = await fetch('/api/user/purchase', {
           method: 'POST',
           headers: {
               'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json'
           },
           body: JSON.stringify({ duration })
       });
       // 处理响应...
   }
   ```

### 状态管理

1. **登录状态**
   ```javascript
   // 保存登录状态
   chrome.storage.local.set({
       token: "JWT_TOKEN",
       userid: "USER_ID",
       lastUpdated: new Date().toISOString()
   });

   // 检查登录状态
   chrome.storage.local.get(['token', 'userid'], (result) => {
       if (result.token && result.userid) {
           // 已登录，验证token
           verifyToken(result.token);
       } else {
           // 未登录，跳转到登录页
           redirectToLogin();
       }
   });

   // 清除登录状态
   chrome.storage.local.remove(['token', 'userid']);
   ```

2. **页面状态**
   ```javascript
   // 更新UI状态
   function updateUIState(data) {
       document.getElementById('phoneNumber').textContent = data.phone_num;
       document.getElementById('memberStatus').textContent = 
           data.is_member ? '已开通' : '未开通';
       document.getElementById('expiryDate').textContent = 
           data.expiry_date || '无';
   }

   // 处理加载状态
   function setLoading(isLoading) {
       const button = document.getElementById('submitButton');
       button.disabled = isLoading;
       button.textContent = isLoading ? '处理中...' : '确认';
   }
   ```

### 错误处理

1. **网络错误**
   ```javascript
   try {
       const response = await fetch('/api/endpoint');
       if (!response.ok) {
           throw new Error('网络请求失败');
       }
   } catch (error) {
       console.error('请求失败:', error);
       alert('网络错误，请稍后重试');
   }
   ```

2. **登录失效**
   ```javascript
   if (response.status === 401) {
       // 清除登录状态
       chrome.storage.local.remove(['token', 'userid'], () => {
           alert('登录已过期，请重新登录');
           window.location.href = '/login.html';
       });
   }
   ```

### 调试模式

1. **开启方式**
   - URL参数：`?debug=true`
   - 示例：`http://localhost:3000/login.html?debug=true`

2. **调试信息**
   ```javascript
   function showDebugInfo(info) {
       if (debugMode) {
           document.getElementById('debugInfo').classList.remove('hidden');
           document.getElementById('requestDetails').textContent = 
               JSON.stringify(info.request, null, 2);
           document.getElementById('responseDetails').textContent = 
               JSON.stringify(info.response, null, 2);
       }
   }
   ```

### 安全考虑

1. **Token 处理**
   - 只在必要时访问 token
   - 不在页面中显示 token
   - token 失效时立即清除

2. **敏感信息**
   - 调试信息只在开发环境显示
   - 避免在前端存储敏感数据
   - 使用 HTTPS 传输数据

## AI 服务接口

### 文本总结

将长文本总结为简短摘要。

**请求URL：** `/api/ai/summarize`

**请求方式：** POST

**请求参数：**

| 参数名    | 必选 | 类型   | 说明                                |
|-----------|------|--------|-------------------------------------|
| text      | 是   | string | 需要总结的文本内容                  |
| maxLength | 否   | number | 总结的最大长度，默认100字          |
| language  | 否   | string | 输出语言，'zh'为中文，'en'为英文   |

**请求示例：**
```json
{
    "text": "需要总结的长文本内容...",
    "maxLength": 100,
    "language": "zh"
}
```

**返回示例：**

```json
{
    "success": true,
    "data": {
        "content": "总结后的文本内容..."
    },
    "message": "Successfully got response from Coze"
}
```

**错误返回示例：**

```json
{
    "success": false,
    "message": "总结文本失败",
    "error": "具体错误信息"
}
```

### 文本翻译

将文本翻译成目标语言。

**请求URL：** `/api/ai/translate`

**请求方式：** POST

**请求参数：**

| 参数名     | 必选 | 类型   | 说明                                          |
|------------|------|--------|-----------------------------------------------|
| text       | 是   | string | 需要翻译的文本内容                            |
| targetLang | 否   | string | 目标语言，'zh'为中文，'en'为英文，默认'zh'   |
| style      | 否   | string | 翻译风格，可选：'normal'、'formal'、'casual'  |

**请求示例：**
```json
{
    "text": "Text to be translated...",
    "targetLang": "zh",
    "style": "normal"
}
```

**返回示例：**

```json
{
    "success": true,
    "data": {
        "content": "翻译后的文本内容..."
    },
    "message": "Successfully got response from Coze"
}
```

**错误返回示例：**

```json
{
    "success": false,
    "message": "翻译文本失败",
    "error": "具体错误信息"
}
```

### 错误码说明

| 状态码 | 说明                                           |
|--------|------------------------------------------------|
| 200    | 请求成功                                       |
| 400    | 请求参数错误（如缺少必要参数或参数格式错误）  |
| 401    | 未授权（如 API 密钥无效）                      |
| 429    | 请求过于频繁                                   |
| 500    | 服务器内部错误                                 |

### 注意事项

1. 所有请求都需要在 header 中携带有效的 token
2. 文本长度有限制，单次请求最大支持 4000 个字符
3. API 调用有频率限制，请合理控制请求频率
4. 建议在客户端做好错误处理和重试机制
5. 返回的内容可能包含 HTML 标签，请根据需要进行处理
