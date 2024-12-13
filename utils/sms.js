import Core from '@alicloud/pop-core';
import dotenv from 'dotenv';
import util from 'util';

dotenv.config();

// 创建阿里云客户端实例
const client = new Core({
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
    endpoint: 'https://dysmsapi.aliyuncs.com',
    apiVersion: '2017-05-25'
});

// 请求选项
const requestOption = {
    method: 'POST',
    formatParams: true,  // 改为 true，让 SDK 自动处理参数格式
    timeout: 10000  // 10秒超时
};

// 存储验证码的 Map（在实际生产环境中应该使用 Redis 等数据库）
const verificationCodes = new Map();

// 生成验证码
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 验证手机号格式
function validatePhoneNumber(phone_num) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone_num);
}

// 检查是否在60秒内重复发送
function isWithin60Seconds(timestamp) {
    return (Date.now() - timestamp) <= 60 * 1000;
}

// 存储验证码
function setVerificationCode(phone_num, code) {
    const currentTime = Date.now();
    const existingCode = verificationCodes.get(phone_num);
    
    if (existingCode && isWithin60Seconds(existingCode.timestamp)) {
        return false;
    }
    
    verificationCodes.set(phone_num, {
        code,
        timestamp: currentTime
    });
    return true;
}

// 验证验证码
export function verifyCode(phone_num, code) {
    const storedData = verificationCodes.get(phone_num);
    
    // 构建基础响应对象
    const response = {
        success: false,
        message: '',
        details: {
            phone_num,
            inputCode: code,
            storedCode: storedData?.code,
            timestamp: storedData?.timestamp || 0,
            currentTime: Date.now(),
            isExpired: false,
            timeRemaining: 0
        }
    };

    // 检查是否存在验证码记录
    if (!storedData) {
        response.message = '验证码不存在或已过期';
        return response;
    }

    // 计算验证码是否过期
    const timeDiff = Date.now() - storedData.timestamp;
    const timeLimit = 5 * 60 * 1000; // 5分钟
    const isExpired = timeDiff > timeLimit;
    
    response.details.isExpired = isExpired;
    response.details.timeRemaining = Math.max(0, timeLimit - timeDiff);

    // 验证码已过期
    if (isExpired) {
        response.message = '验证码已过期';
        verificationCodes.delete(phone_num); // 清除过期验证码
        return response;
    }

    // 验证码不匹配
    if (storedData.code !== code) {
        response.message = '验证码错误';
        return response;
    }

    // 验证成功
    response.success = true;
    response.message = '验证成功';
    verificationCodes.delete(phone_num); // 验证成功后删除验证码
    
    return response;
}

// 发送验证码
export async function sendVerificationCode(phone_num) {
    console.log('=== SMS发送开始 ===');
    console.log('手机号:', phone_num);
    
    // 验证手机号格式
    if (!validatePhoneNumber(phone_num)) {
        console.error('无效的手机号格式');
        throw new Error('无效的手机号格式');
    }
    
    try {
        // 检查必要的环境变量
        if (!process.env.ALIYUN_ACCESS_KEY_ID || !process.env.ALIYUN_ACCESS_KEY_SECRET) {
            throw new Error('阿里云访问密钥未配置');
        }
        if (!process.env.SMS_SIGN_NAME || !process.env.SMS_TEMPLATE_CODE) {
            throw new Error('短信服务配置未完成');
        }

        const code = generateVerificationCode();
        console.log('生成的验证码:', code);
        
        // 检查是否可以发送验证码（60秒限制）
        if (!setVerificationCode(phone_num, code)) {
            return {
                success: false,
                message: '发送太过频繁，请稍后再试！',
                debugInfo: {
                    timestamp: new Date().toISOString(),
                    phone_num: phone_num,
                    error: '发送频率限制',
                    errorName: 'RateLimit',
                }
            };
        }

        const params = {
            "RegionId": "cn-hangzhou",
            "SignName": process.env.SMS_SIGN_NAME,
            "TemplateCode": process.env.SMS_TEMPLATE_CODE,
            "PhoneNumbers": phone_num,
            "TemplateParam": JSON.stringify({
                code: code
            })
        };

        console.log('请求参数:', JSON.stringify(params, null, 2));

        const result = await client.request('SendSms', params, requestOption);
        console.log('阿里云SMS响应:', JSON.stringify(result, null, 2));

        // 检查响应结果
        if (result.Code !== 'OK') {
            // 发送失败，删除验证码
            verificationCodes.delete(phone_num);
            
            return {
                success: false,
                message: `发送失败: ${result.Message}`,
                debugInfo: {
                    timestamp: new Date().toISOString(),
                    phone_num: phone_num,
                    requestDetails: {
                        signName: process.env.SMS_SIGN_NAME,
                        templateCode: process.env.SMS_TEMPLATE_CODE,
                        phone_num: phone_num,
                        url: '/auth/send-code',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: { phone_num: phone_num }
                    },
                    responseDetails: {
                        requestId: result.RequestId,
                        bizId: result.BizId,
                        code: result.Code,
                        message: result.Message
                    },
                    error: result.Message,
                    errorName: 'SendSMSError',
                    errorCode: result.Code
                }
            };
        }

        console.log('验证码发送成功');
        console.log('=== SMS发送结束 ===');
        
        return {
            success: true,
            message: '验证码已发送',
            debugInfo: {
                timestamp: new Date().toISOString(),
                phone_num: phone_num,
                requestDetails: {
                    signName: process.env.SMS_SIGN_NAME,
                    templateCode: process.env.SMS_TEMPLATE_CODE,
                    phone_num: phone_num,
                    url: '/auth/send-code',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: { phone_num: phone_num }
                },
                responseDetails: {
                    requestId: result.RequestId,
                    bizId: result.BizId,
                    code: result.Code,
                    message: result.Message,
                    verificationStatus: '成功'
                }
            }
        };
    } catch (error) {
        console.error('发送验证码异常:', error);
        console.log('=== SMS发送结束 ===');
        
        // 发送异常时删除验证码
        verificationCodes.delete(phone_num);

        // 处理特定错误类型
        let errorMessage = '发送验证码失败，请稍后重试';
        if (error.name === 'isv.BUSINESS_LIMIT_CONTROLError') {
            errorMessage = '发送次数已达上限，请稍后再试（每小时限制5条）';
        }
        
        return {
            success: false,
            message: errorMessage,
            debugInfo: {
                timestamp: new Date().toISOString(),
                phone_num: phone_num,
                error: error.message,
                errorName: error.name,
                errorStack: error.stack,
                requestDetails: {
                    signName: process.env.SMS_SIGN_NAME,
                    templateCode: process.env.SMS_TEMPLATE_CODE,
                    phone_num: phone_num,
                    url: '/auth/send-code',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: { phone_num: phone_num }
                }
            }
        };
    }
}