# 长话短说后台服务

这是长话短说 Chrome 扩展的后台服务，提供用户认证和会员管理功能。

## 功能特性

- 用户认证
  - 手机号登录
  - 验证码验证
  - 会员状态管理
- 安全性
  - JWT 令牌认证
  - 安全的数据传输
- 扩展集成
  - 与 Chrome 扩展无缝集成
  - 实时状态同步

## 技术栈

- 后端：Node.js
- 前端：原生 JavaScript
- 数据存储：localStorage
- 通信：postMessage API

## 目录结构

```
public/
├── images/          # 图片资源
├── scripts/         # JavaScript 文件
│   ├── login.js     # 登录逻辑
│   ├── logout.js    # 登出逻辑
│   └── status.js    # 状态页面逻辑
├── styles/          # CSS 样式文件
├── login.html       # 登录页面
├── logout.html      # 登出页面
└── status.html      # 状态页面
```

## 开发指南

1. 克隆仓库：
```bash
git clone https://github.com/yourusername/changhuaduanshuo.git
cd changhuaduanshuo
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm run dev
```

4. 访问：
- 登录页面：http://localhost:3000/login.html
- 状态页面：http://localhost:3000/status.html

## API 文档

### 发送验证码
- 端点：`/auth/send-code`
- 方法：POST
- 参数：`{ phone_num: string }`
- 响应：`{ success: boolean, message?: string }`

### 登录验证
- 端点：`/auth/verify`
- 方法：POST
- 参数：`{ phone_num: string, code: string }`
- 响应：`{ success: boolean, token?: string, ... }`

## 许可证

MIT License
