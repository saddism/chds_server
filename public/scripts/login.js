document.addEventListener('DOMContentLoaded', () => {
    const EXTENSION_ID = 'jbipifegmbaljbkfambickjajngcmhjl';
    const loginForm = document.getElementById('loginForm');
    const phoneInput = document.getElementById('phone');
    const codeInput = document.getElementById('code');
    const submitBtn = document.getElementById('submitBtn');
    const messageDiv = document.getElementById('message');
    const messagePara = document.getElementById('messagePara');
    const sendCodeBtn = document.getElementById('sendCodeBtn');

    // 存储用户数据
    function storeUserData(data) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userid', String(data.userid));
        localStorage.setItem('phone_num', data.phone_num);
        localStorage.setItem('is_member', String(data.is_member));
        localStorage.setItem('expiry_date', data.expiry_date || '');
    }

    // 处理登录表单提交
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        messageDiv.classList.add('hidden');
        
        const phone = phoneInput.value.trim();
        const code = codeInput.value.trim();

        if (!phone || !code) {
            messagePara.textContent = '请输入手机号和验证码';
            messageDiv.classList.remove('hidden');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = '登录中...';

            // 1. 发送登录请求
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ phone_num: phone, code })
            });

            const data = await response.json();
            console.log('[登录页面] 登录响应原始数据:', JSON.stringify(data, null, 2));

            if (!data.success) {
                throw new Error(data.message || '登录失败');
            }

            // 提取用户数据，直接使用后端返回的格式
            const userData = {
                type: 'LOGIN_SUCCESS',
                token: data.token,
                userid: data.userid || 1,  // 确保是数字类型
                phone_num: data.phone_num,
                is_member: data.is_member === true,
                expiry_date: data.expiry_date
            };

            console.log('[登录页面] 发送给扩展的消息:', JSON.stringify(userData, null, 2));

            // 2. 存储数据到localStorage
            localStorage.setItem('token', userData.token);
            localStorage.setItem('userid', String(userData.userid));
            localStorage.setItem('phone_num', userData.phone_num);
            localStorage.setItem('is_member', String(userData.is_member));
            localStorage.setItem('expiry_date', userData.expiry_date || '');

            // 3. 通过 postMessage 发送消息给 content.js
            try {
                window.postMessage(userData, '*');
                console.log('[登录页面] 消息已通过 postMessage 发送');
            } catch (error) {
                console.warn('[登录页面] 发送消息过程中出错:', error);
            }

            // 等待一小段时间，让消息有机会被处理
            await new Promise(resolve => setTimeout(resolve, 500));

            // 4. 跳转到状态页
            console.log('[登录页面] 准备跳转到状态页');
           // alert('登录成功');
            window.location.replace('/status.html?from=login');

        } catch (error) {
            console.error('[登录页面] 错误:', error);
            messagePara.textContent = error.message || '登录失败，请重试';
            messageDiv.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = '登录';
        }
    });

    // 发送验证码按钮点击处理
    let countdown = 0;
    let timer = null;

    const updateButtonText = () => {
        if (countdown > 0) {
            sendCodeBtn.disabled = true;
            sendCodeBtn.textContent = `重新发送(${countdown}s)`;
            countdown--;
            timer = setTimeout(updateButtonText, 1000);
        } else {
            sendCodeBtn.disabled = false;
            sendCodeBtn.textContent = '发送验证码';
            timer = null;
        }
    };

    sendCodeBtn.addEventListener('click', async () => {
        const phone = phoneInput.value.trim();

        if (!phone) {
            messagePara.textContent = '请输入手机号';
            messageDiv.classList.remove('hidden');
            return;
        }

        try {
            const response = await fetch('/auth/send-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone_num: phone })
            });

            const data = await response.json();
            
            if (data.success) {
                // 开始60秒倒计时
                countdown = 60;
                updateButtonText();
                messagePara.textContent = '验证码已发送';
                messageDiv.classList.remove('hidden');
            } else {
                messagePara.textContent = data.message || '发送失败，请重试';
                messageDiv.classList.remove('hidden');
            }
        } catch (error) {
            console.error('[登录页面] 发送验证码失败:', error);
            messagePara.textContent = error.message || '发送失败，请重试';
            messageDiv.classList.remove('hidden');
        }
    });

    // 页面卸载时清理定时器
    window.addEventListener('unload', () => {
        if (timer) {
            clearTimeout(timer);
        }
    });
});
