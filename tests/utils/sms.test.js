import { jest } from '@jest/globals';
import { sendVerificationCode, verifyCode } from '../../utils/sms.js';

describe('短信服务测试', () => {
    const testPhone = '13800138000';
    
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('sendVerificationCode', () => {
        it('应该成功发送验证码', async () => {
            const result = await sendVerificationCode(testPhone);
            expect(result.success).toBe(true);
            expect(result.message).toBe('验证码已发送');
            expect(result.requestId).toBeDefined();
        });

        it('应该处理无效手机号', async () => {
            const result = await sendVerificationCode('invalid');
            expect(result.success).toBe(false);
            expect(result.message).toBe('发送失败');
            expect(result.error).toBeDefined();
        });
    });

    describe('verifyCode', () => {
        it('应该成功验证正确的验证码', async () => {
            // 先发送验证码
            const sendResult = await sendVerificationCode(testPhone);
            expect(sendResult.success).toBe(true);
            
            // 获取发送的验证码 (这里需要手动输入收到的验证码)
            const code = '123456'; // 替换为实际收到的验证码
            
            const result = await verifyCode(testPhone, code);
            expect(result.success).toBe(true);
            expect(result.message).toBe('验证成功');
        });

        it('应该拒绝错误的验证码', async () => {
            // 先发送验证码
            const sendResult = await sendVerificationCode(testPhone);
            expect(sendResult.success).toBe(true);
            
            const result = await verifyCode(testPhone, 'wrong-code');
            expect(result.success).toBe(false);
            expect(result.message).toBe('验证码错误');
        });

        it('应该处理过期的验证码', async () => {
            // 先发送验证码
            const sendResult = await sendVerificationCode(testPhone);
            expect(sendResult.success).toBe(true);
            
            // 快进6分钟（超过5分钟的过期时间）
            jest.advanceTimersByTime(6 * 60 * 1000);
            
            const code = '123456'; // 替换为实际收到的验证码
            const result = await verifyCode(testPhone, code);
            expect(result.success).toBe(false);
            expect(result.message).toBe('验证码已过期');
        });

        it('应该处理不存在的验证码', async () => {
            const result = await verifyCode('13900139000', '123456');
            expect(result.success).toBe(false);
            expect(result.message).toBe('验证码已过期');
        });
    });
});
