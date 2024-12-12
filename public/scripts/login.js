document.addEventListener('DOMContentLoaded', async () => {
    // 检查是否在Chrome扩展环境中
    const isInExtension = window.chrome && chrome.runtime && chrome.runtime.sendMessage;

    // 首先检查URL中是否有来自扩展的标记
    const urlParams = new URLSearchParams(window.location.search);
    const fromExtension = urlParams.get('from') === 'extension';
    const debugMode = urlParams.get('debug') === 'true';

    if (isInExtension) {
        try {
            // 从chrome.storage.local获取登录状态
            chrome.storage.local.get(['token', 'userid'], async (result) => {
                const { token, userid } = result;
                
                if (token && userid) {
                    try {
                        // 验证token
                        const response = await fetch('/auth/verify-token', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        const data = await response.json();

                        if (data.success) {
                            console.log('用户已登录，同步Chrome状态');
                            
                            // 如果是从扩展打开的页面，发送消息给扩展
                            if (fromExtension) {
                                chrome.runtime.sendMessage({
                                    type: 'LOGIN_SUCCESS',
                                    token: token,
                                    userid: userid
                                }, (response) => {
                                    if (response && response.success) {
                                        console.log('Chrome状态同步成功');
                                    } else {
                                        console.error('Chrome状态同步失败');
                                    }
                                    // 跳转到状态页面
                                    window.location.href = '/status.html';
                                });
                            } else {
                                // 不是从扩展打开的，直接跳转
                                window.location.href = '/status.html';
                            }
                        } else {
                            // token无效，清除存储
                            chrome.storage.local.remove(['token', 'userid'], () => {
                                console.log('已清除无效的登录状态');
                            });
                        }
                    } catch (error) {
                        console.error('验证token失败:', error);
                        // 出错时也清除存储
                        chrome.storage.local.remove(['token', 'userid'], () => {
                            console.log('发生错误，已清除登录状态');
                        });
                    }
                }
            });
        } catch (error) {
            console.error('访问chrome.storage失败:', error);
        }
    }

    const loginForm = document.getElementById('loginForm');
    const phoneInput = document.getElementById('phone');
    const codeInput = document.getElementById('code');
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    const messageDiv = document.getElementById('message');
    const messagePara = messageDiv.querySelector('p');
    
    // SMS Debug Elements
    const smsDebug = document.getElementById('smsDebug');
    const smsTimestamp = document.getElementById('smsTimestamp');
    const smsRequestDetails = document.getElementById('smsRequestDetails');
    const smsResponseDetails = document.getElementById('smsResponseDetails');
    const smsError = document.getElementById('smsError');

    let countdown = 60;
    let countdownTimer = null;

    // 显示调试信息
    function showDebugInfo(data) {
        // 只在调试模式下显示调试信息
        if (!debugMode) {
            console.log('调试信息:', data);  // 仍然在控制台输出调试信息
            return;
        }

        console.log('显示调试信息:', data);
        
        const smsDebug = document.getElementById('smsDebug');
        const smsTimestamp = document.getElementById('smsTimestamp');
        const smsRequestDetails = document.getElementById('smsRequestDetails');
        const smsResponseDetails = document.getElementById('smsResponseDetails');
        const smsError = document.getElementById('smsError');

        if (!smsDebug) {
            console.error('调试信息显示失败: smsDebug元素不存在');
            return;
        }

        smsDebug.classList.remove('hidden');
        
        // 显示时间戳
        if (smsTimestamp && data.debugInfo?.timestamp) {
            smsTimestamp.innerHTML = `
                <div class="font-medium mb-1">请求时间</div>
                ${new Date(data.debugInfo.timestamp).toLocaleString()}
            `;
        }

        // 显示请求详情
        if (smsRequestDetails && data.debugInfo?.requestDetails) {
            const { requestDetails } = data.debugInfo;
            const requestInfo = {
                手机号: requestDetails.body?.phone_num || '未知',
                请求URL: requestDetails.url || '未知',
                请求方法: requestDetails.method || '未知',
                请求头: {
                    'Content-Type': requestDetails.headers?.['content-type'] || 'application/json'
                },
                请求体: requestDetails.body || {}
            };

            smsRequestDetails.innerHTML = `
                <div class="font-medium mb-1">请求信息</div>
                <pre class="whitespace-pre-wrap break-words bg-gray-50 p-2 rounded">${JSON.stringify(requestInfo, null, 2)}</pre>
            `;
        }

        // 显示响应详情
        if (smsResponseDetails && data.debugInfo?.responseDetails) {
            const { responseDetails } = data.debugInfo;
            const responseInfo = {
                状态: responseDetails.verificationStatus || '未知',
                消息: responseDetails.message || data.message || '未知',
                验证详情: responseDetails.details ? {
                    输入的验证码: responseDetails.details.inputCode || '未知',
                    系统存储的验证码: responseDetails.details.storedCode || '未知',
                    是否已过期: responseDetails.details.isExpired ? '是' : '否',
                    剩余有效时间: responseDetails.details.timeRemaining || '0秒',
                    验证码生成时间: responseDetails.details.codeTimestamp || '未知'
                } : '未知'
            };

            smsResponseDetails.innerHTML = `
                <div class="font-medium mb-1">响应信息</div>
                <pre class="whitespace-pre-wrap break-words bg-gray-50 p-2 rounded">${JSON.stringify(responseInfo, null, 2)}</pre>
            `;
        }

        // 显示错误信息
        if (smsError && (data.debugInfo?.error || !data.success)) {
            const errorInfo = {
                错误类型: data.debugInfo?.errorName || '验证失败',
                错误代码: data.debugInfo?.errorCode || 'UNKNOWN_ERROR',
                错误消息: data.debugInfo?.error || data.message || '未知错误',
                错误详情: data.debugInfo?.responseDetails?.details || {}
            };

            smsError.classList.remove('hidden');
            smsError.innerHTML = `
                <div class="font-medium mb-1 text-red-600">错误详情</div>
                <pre class="whitespace-pre-wrap break-words bg-red-50 p-2 rounded">${JSON.stringify(errorInfo, null, 2)}</pre>
            `;
        } else if (smsError) {
            smsError.classList.add('hidden');
        }
    }

    // 显示消息
    function showMessage(message, isError = false) {
        const messageDiv = document.getElementById('message');
        const messagePara = messageDiv.querySelector('p');
        
        if (!messageDiv || !messagePara) {
            console.error('消息显示元素未找到');
            return;
        }

        messagePara.textContent = message;
        messagePara.className = isError ? 'text-red-600' : 'text-green-600';
        messageDiv.classList.remove('hidden');
        messageDiv.classList.add('message-show');
    }

    // 开始倒计时
    function startCountdown() {
        sendCodeBtn.disabled = true;
        sendCodeBtn.classList.add('countdown');
        
        countdownTimer = setInterval(() => {
            sendCodeBtn.textContent = `${countdown}秒后重试`;
            countdown--;

            if (countdown < 0) {
                clearInterval(countdownTimer);
                sendCodeBtn.disabled = false;
                sendCodeBtn.classList.remove('countdown');
                sendCodeBtn.textContent = '发送验证码';
                countdown = 60;
            }
        }, 1000);
    }

    // 验证手机号格式
    function validatePhone(phone) {
        const phoneRegex = /^1[3-9]\d{9}$/;
        return phoneRegex.test(phone);
    }

    // 发送验证码
    sendCodeBtn.addEventListener('click', async () => {
        const phone = phoneInput.value.trim();

        if (!validatePhone(phone)) {
            showMessage('请输入正确的手机号', true);
            showDebugInfo({
                success: false,
                message: '手机号格式不正确',
                debugInfo: {
                    timestamp: new Date().toISOString(),
                    requestDetails: {
                        url: '/auth/send-code',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: { phone }
                    },
                    error: '手机号格式不正确',
                    errorName: 'ValidationError'
                }
            });
            return;
        }

        try {
            sendCodeBtn.disabled = true;
            console.log('发送验证码请求:', { phone });

            const response = await fetch('/auth/send-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone_num: phone }),
            });

            const data = await response.json();
            console.log('验证码响应:', data);

            // 显示调试信息
            showDebugInfo({
                success: data.success,
                message: data.message,
                debugInfo: {
                    timestamp: new Date().toISOString(),
                    requestDetails: {
                        url: '/auth/send-code',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: { phone_num: phone }
                    },
                    responseDetails: {
                        verificationStatus: data.success ? '成功' : '失败',
                        message: data.message,
                        details: data.debugInfo?.details || {
                            phoneNumber: phone,
                            sendTime: new Date().toISOString(),
                            requestId: data.debugInfo?.requestId || '未知',
                            bizId: data.debugInfo?.bizId || '未知'
                        }
                    },
                    error: data.success ? null : (data.message || '发送失败'),
                    errorName: data.success ? null : 'SendSMSError',
                    errorCode: data.success ? null : (data.debugInfo?.errorCode || 'UNKNOWN_ERROR')
                }
            });

            if (data.success) {
                showMessage('验证码已发送');
                startCountdown();
            } else {
                showMessage(data.message || '发送验证码失败', true);
                sendCodeBtn.disabled = false;
            }
        } catch (error) {
            console.error('发送验证码失败:', error);
            showMessage('发送验证码失败，请稍后重试', true);
            sendCodeBtn.disabled = false;

            // 显示错误调试信息
            showDebugInfo({
                success: false,
                message: '发送验证码请求失败',
                debugInfo: {
                    timestamp: new Date().toISOString(),
                    requestDetails: {
                        url: '/auth/send-code',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: { phone_num: phone }
                    },
                    error: error.message,
                    errorName: error.name,
                    errorStack: error.stack
                }
            });
        }
    });

    // 提交表单
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const phone = phoneInput.value.trim();
        const code = codeInput.value.trim();
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;

        if (!phone || !code) {
            messagePara.textContent = '请输入手机号和验证码';
            messageDiv.classList.remove('hidden');
            messageDiv.classList.remove('bg-green-100');
            messageDiv.classList.add('bg-red-100');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = '验证中...';
            
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ phone_num: phone, code })
            });

            const data = await response.json();

            if (data.success) {
                messagePara.textContent = '登录成功';
                messageDiv.classList.remove('hidden');
                messageDiv.classList.remove('bg-red-100');
                messageDiv.classList.add('bg-green-100');
                
                if (isInExtension) {
                    // 保存到chrome.storage.local
                    chrome.storage.local.set({
                        token: data.token,
                        userid: data.userid,
                        lastUpdated: new Date().toISOString()
                    }, () => {
                        console.log('登录状态已保存到chrome.storage');
                        
                        // 如果是从扩展打开的页面，发送消息给扩展
                        if (fromExtension) {
                            chrome.runtime.sendMessage({
                                type: 'LOGIN_SUCCESS',
                                token: data.token,
                                userid: data.userid
                            }, (response) => {
                                if (response && response.success) {
                                    console.log('Chrome状态同步成功');
                                } else {
                                    console.error('Chrome状态同步失败');
                                }
                                // 延迟跳转，让用户看到成功消息
                                setTimeout(() => {
                                    window.location.href = '/status.html';
                                }, 1000);
                            });
                        } else {
                            // 不是从扩展打开的，直接跳转
                            setTimeout(() => {
                                window.location.href = '/status.html';
                            }, 1000);
                        }
                    });
                } else {
                    // 不在Chrome扩展环境中，直接跳转
                    setTimeout(() => {
                        window.location.href = '/status.html';
                    }, 1000);
                }
            } else {
                // 登录失败
                messagePara.textContent = data.message || '登录失败';
                messageDiv.classList.remove('hidden');
                messageDiv.classList.remove('bg-green-100');
                messageDiv.classList.add('bg-red-100');

                // 恢复按钮状态
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;

                // 显示调试信息
                if (data.debugInfo) {
                    showDebugInfo({
                        success: false,
                        message: data.message,
                        debugInfo: {
                            ...data.debugInfo,
                            responseDetails: {
                                verificationStatus: data.debugInfo.responseDetails?.verificationStatus || '失败',
                                message: data.debugInfo.responseDetails?.message || data.message,
                                details: data.debugInfo.responseDetails?.details || {}
                            }
                        }
                    });
                }
            }
        } catch (error) {
            console.error('登录请求失败:', error);
            messagePara.textContent = '登录请求失败，请稍后重试';
            messageDiv.classList.remove('hidden');
            messageDiv.classList.remove('bg-green-100');
            messageDiv.classList.add('bg-red-100');

            // 恢复按钮状态
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;

            // 显示错误调试信息
            showDebugInfo({
                success: false,
                message: '登录请求失败',
                debugInfo: {
                    timestamp: new Date().toISOString(),
                    requestDetails: {
                        url: '/auth/login',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: {
                            phone_num: phone,
                            code: code
                        }
                    },
                    error: error.message,
                    errorName: error.name,
                    errorStack: error.stack
                }
            });
        }
    });
});
