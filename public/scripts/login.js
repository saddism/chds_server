document.addEventListener('DOMContentLoaded', async () => {
    console.log('[登录页面] 开始初始化...');
    
    // 测试 localStorage 是否可用
    try {
        window.localStorage.setItem('test', 'test');
        const testValue = window.localStorage.getItem('test');
        window.localStorage.removeItem('test');
        console.log('[登录页面] localStorage 测试:', testValue === 'test' ? '可用' : '不可用');
        if (testValue !== 'test') {
            throw new Error('localStorage 测试失败');
        }
    } catch (error) {
        console.error('[登录页面] localStorage 不可用:', error);
        alert('您的浏览器不支持或禁用了本地存储，请启用后重试');
        return;
    }
    
    // 检查是否在Chrome扩展环境中
    const isInExtension = !!(window.chrome && chrome.runtime && chrome.runtime.sendMessage);
    console.log('[登录页面] Chrome扩展环境检测:', isInExtension);

    // 检查现有登录状态
    const token = window.localStorage.getItem('token');
    const userid = window.localStorage.getItem('userid');
    
    if (token && userid) {
        console.log('[登录页面] 检测到现有登录状态，5秒后自动跳转');
        // 显示倒计时消息
        const messageDiv = document.getElementById('message');
        const messagePara = document.getElementById('messagePara');
        if (messageDiv && messagePara) {
            messageDiv.classList.remove('hidden');
            messageDiv.classList.remove('bg-red-100');
            messageDiv.classList.add('bg-green-100');
            
            // 开始倒计时
            let countdown = 5;
            messagePara.textContent = `检测到登录状态，${countdown} 秒后自动跳转...`;
            
            const timer = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                    messagePara.textContent = `检测到登录状态，${countdown} 秒后自动跳转...`;
                } else {
                    clearInterval(timer);
                    window.location.href = '/status.html';
                }
            }, 1000);
            
            // 如果在扩展环境中，同步状态到扩展
            if (isInExtension) {
                const loginData = {
                    token,
                    userid,
                    phone_num: window.localStorage.getItem('phone_num'),
                    is_member: window.localStorage.getItem('is_member'),
                    expiry_date: window.localStorage.getItem('expiry_date')
                };
                
                console.log('[登录页面] 同步现有登录状态到扩展');
                chrome.runtime.sendMessage({
                    type: 'LOGIN_SUCCESS',
                    data: loginData
                }, (response) => {
                    console.log('[登录页面] 扩展响应:', response);
                });
            }
        }
        return;
    }

    // 检查URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const fromExtension = urlParams.get('from') === 'extension';
    console.log('[登录页面] URL参数:', { fromExtension, search: window.location.search });

    // 检查登录状态
    const checkLoginStatus = async () => {
        console.log('[登录页面] 开始检查登录状态');
        const token = localStorage.getItem('token');
        const userid = localStorage.getItem('userid');
        console.log('[登录页面] localStorage中的数据:', { token, userid });

        if (token && userid) {
            try {
                console.log('[登录页面] 开始验证token');
                const response = await fetch('/auth/verify-token', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                console.log('[登录页面] token验证结果:', data);

                if (data.success) {
                    console.log('[登录页面] token有效，准备跳转');
                    window.location.href = '/status.html';
                    return true;
                } else {
                    console.log('[登录页面] token无效，清除存储');
                    localStorage.removeItem('token');
                    localStorage.removeItem('userid');
                    console.log('[登录页面] 已清除登录状态');
                }
            } catch (error) {
                console.error('[登录页面] 验证token失败:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('userid');
                console.log('[登录页面] 发生错误，已清除登录状态');
            }
        }
        return false;
    };

    if (isInExtension) {
        try {
            console.log('[登录页面] 开始检查localStorage');
            await checkLoginStatus();
        } catch (error) {
            console.error('[登录页面] 访问localStorage失败:', error);
        }
    } else {
        console.log('[登录页面] 非扩展环境，检查localStorage');
        await checkLoginStatus();
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
        console.log('[登录页面] 开始发送验证码');
        const phone = phoneInput.value.trim();

        if (!validatePhone(phone)) {
            console.log('[登录页面] 手机号格式不正确');
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
            console.log('[登录页面] 开始发送验证码请求');
            sendCodeBtn.disabled = true;
            const response = await fetch('/auth/send-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone_num: phone }),
            });

            const data = await response.json();
            console.log('[登录页面] 验证码响应:', data);

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
                console.log('[登录页面] 验证码发送成功');
                showMessage('验证码已发送');
                startCountdown();
            } else {
                console.log('[登录页面] 验证码发送失败');
                showMessage(data.message || '发送验证码失败', true);
                sendCodeBtn.disabled = false;
            }
        } catch (error) {
            console.error('[登录页面] 发送验证码失败:', error);
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

    // 登录成功后发送消息给扩展
    function notifyExtension(userData) {
        if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
            console.log('[登录页面] 发送登录成功消息到扩展:', userData);
            chrome.runtime.sendMessage({
                type: 'LOGIN_SUCCESS',
                data: userData
            }, (response) => {
                console.log('[登录页面] 扩展响应:', response);
                if (response && response.success) {
                    console.log('[登录页面] 数据同步成功，关闭窗口');
                    window.close();
                } else {
                    console.error('[登录页面] 数据同步失败:', response?.error || '未知错误');
                    window.close();
                }
            });
        } else {
            console.log('[登录页面] 不在扩展环境中，跳过通知扩展');
        }
    }

    // 在登录成功时处理用户数据
    function handleLoginSuccess(userData) {
        console.log('[登录页面] 处理登录成功:', userData);
        
        try {
            // 测试数据存储
            console.log('[登录页面] 检查localStorage状态');
            const storageTest = {
                available: false,
                writable: false,
                readable: false,
                error: null
            };

            try {
                // 测试是否可用
                storageTest.available = !!window.localStorage;
                
                // 测试是否可写
                window.localStorage.setItem('test_write', 'test');
                storageTest.writable = true;
                
                // 测试是否可读
                const testRead = window.localStorage.getItem('test_write');
                storageTest.readable = testRead === 'test';
                
                // 清理测试数据
                window.localStorage.removeItem('test_write');
            } catch (e) {
                storageTest.error = e;
            }

            console.log('[登录页面] localStorage状态:', storageTest);

            if (!storageTest.available || !storageTest.writable || !storageTest.readable) {
                throw new Error(`localStorage不可用: ${JSON.stringify(storageTest)}`);
            }

            // 如果测试成功，开始存储实际数据
            console.log('[登录页面] 开始存储登录数据');
            
            // 先尝试清除现有数据
            try {
                window.localStorage.clear();
                console.log('[登录页面] 已清除旧数据');
            } catch (e) {
                console.error('[登录页面] 清除旧数据失败:', e);
            }
            
            // 逐个存储并验证
            const items = {
                'token': userData.token,
                'userid': userData.userid,
                'phone_num': userData.phone_num,
                'is_member': String(userData.is_member),
                'expiry_date': userData.expiry_date || ''
            };
            
            const results = {};
            for (const [key, value] of Object.entries(items)) {
                try {
                    console.log(`[登录页面] 正在存储 ${key}:`, value);
                    window.localStorage.setItem(key, value);
                    const stored = window.localStorage.getItem(key);
                    results[key] = {
                        value,
                        stored,
                        success: stored === value
                    };
                    console.log(`[登录页面] ${key} 存储结果:`, results[key]);
                    
                    if (stored !== value) {
                        throw new Error(`存储验证失败: 期望 "${value}", 实际 "${stored}"`);
                    }
                } catch (e) {
                    results[key] = {
                        error: e.message,
                        success: false
                    };
                    throw new Error(`存储 ${key} 失败: ${e.message}`);
                }
            }

            console.log('[登录页面] 存储结果:', results);

            // 最后验证关键数据
            const token = window.localStorage.getItem('token');
            const userid = window.localStorage.getItem('userid');
            
            if (!token || !userid) {
                throw new Error(`关键数据丢失: token=${token}, userid=${userid}`);
            }

            console.log('[登录页面] 数据存储成功，准备跳转');
            
            // 存储成功后再处理跳转
            if (isInExtension) {
                console.log('[登录页面] 在扩展环境中，准备发送登录成功消息');
                        
                // 准备发送给扩展的数据
                const messageData = {
                    type: 'LOGIN_SUCCESS',
                    data: {
                        token: userData.token,
                        userid: userData.userid,
                        phone_num: userData.phone_num,
                        is_member: userData.is_member,
                        expiry_date: userData.expiry_date,
                        timestamp: Date.now()
                    }
                };
                        
                console.log('[登录页面] 发送给扩展的消息数据:', messageData);
                        
                // 发送消息给扩展
                try {
                    chrome.runtime.sendMessage(messageData, (response) => {
                        const lastError = chrome.runtime.lastError;
                        if (lastError) {
                            console.error('[登录页面] 发送消息给扩展失败:', lastError.message);
                            // 即使发送失败也继续跳转
                            window.location.href = '/status.html';
                            return;
                        }
                                
                        console.log('[登录页面] 收到扩展响应:', response);
                        if (response && response.success) {
                            console.log('[登录页面] 登录状态已成功同步到扩展');
                        } else {
                            console.warn('[登录页面] 扩展同步响应异常:', response);
                        }
                                
                        // 跳转到状态页面
                        window.location.href = '/status.html';
                    });
                    console.log('[登录页面] 消息已发送给扩展，等待响应...');
                } catch (error) {
                    console.error('[登录页面] 发送消息给扩展时发生错误:', error);
                    // 发生错误时也继续跳转
                    window.location.href = '/status.html';
                }
            } else {
                console.log('[登录页面] 非扩展环境，直接跳转');
                window.location.href = '/status.html';
            }
        } catch (error) {
            console.error('[登录页面] 数据存储失败:', error);
            alert('登录状态保存失败: ' + error.message);
            
            // 出错时也记录当前localStorage的状态
            try {
                console.log('[登录页面] 当前localStorage状态:', {
                    token: window.localStorage.getItem('token'),
                    userid: window.localStorage.getItem('userid'),
                    phone_num: window.localStorage.getItem('phone_num'),
                    is_member: window.localStorage.getItem('is_member'),
                    expiry_date: window.localStorage.getItem('expiry_date')
                });
            } catch (e) {
                console.error('[登录页面] 无法读取localStorage状态:', e);
            }
        }
    }

    // 提交表单
    loginForm.addEventListener('submit', async (e) => {
        console.log('[登录页面] 开始处理登录表单提交');
        e.preventDefault();

        const phone = phoneInput.value.trim();
        const code = codeInput.value.trim();
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;

        try {
            console.log('[登录页面] 开始登录请求');
            submitBtn.disabled = true;
            submitBtn.textContent = '验证中...';

            // 构建请求数据
            const requestData = { phone_num: phone };
            // 对于非调试用户，需要验证码
            if (phone !== '18610308399') {
                if (!code) {
                    throw new Error('请输入验证码');
                }
                requestData.code = code;
            }

            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();
            console.log('[登录页面] 登录响应:', data);

            if (data.success) {
                messagePara.textContent = '登录成功';
                messageDiv.classList.remove('hidden');
                messageDiv.classList.remove('bg-red-100');
                messageDiv.classList.add('bg-green-100');

                // 测试数据存储
                try {
                    // 先检查localStorage状态
                    console.log('[登录页面] 检查localStorage状态');
                    const storageTest = {
                        available: false,
                        writable: false,
                        readable: false,
                        error: null
                    };

                    try {
                        storageTest.available = !!window.localStorage;
                        window.localStorage.setItem('test_write', 'test');
                        storageTest.writable = true;
                        const testRead = window.localStorage.getItem('test_write');
                        storageTest.readable = testRead === 'test';
                        window.localStorage.removeItem('test_write');
                    } catch (e) {
                        storageTest.error = e;
                    }

                    console.log('[登录页面] localStorage状态:', storageTest);

                    if (!storageTest.available || !storageTest.writable || !storageTest.readable) {
                        throw new Error(`localStorage不可用: ${JSON.stringify(storageTest)}`);
                    }

                    // 从响应中提取数据
                    const loginData = {
                        token: data.token,
                        userid: String(data.userid),  // 确保转换为字符串
                        phone_num: data.user.phone_num,
                        is_member: String(data.user.is_paid),  // 布尔值转字符串
                        expiry_date: data.user.valid_date || ''
                    };

                    console.log('[登录页面] 准备存储的数据:', loginData);

                    if (!loginData.token || !loginData.userid) {
                        throw new Error('登录响应中缺少必要数据');
                    }

                    // 清除旧数据
                    try {
                        window.localStorage.clear();
                        console.log('[登录页面] 已清除旧数据');
                    } catch (e) {
                        console.error('[登录页面] 清除旧数据失败:', e);
                    }
                    
                    // 逐个存储并验证
                    const results = {};
                    for (const [key, value] of Object.entries(loginData)) {
                        try {
                            if (value === undefined || value === null) {
                                console.warn(`[登录页面] ${key} 的值为 ${value}，跳过存储`);
                                continue;
                            }
                            console.log(`[登录页面] 正在存储 ${key}:`, value);
                            window.localStorage.setItem(key, value);
                            const stored = window.localStorage.getItem(key);
                            results[key] = {
                                value,
                                stored,
                                success: stored === value
                            };
                            console.log(`[登录页面] ${key} 存储结果:`, results[key]);
                            
                            if (stored !== value) {
                                throw new Error(`存储验证失败: 期望 "${value}", 实际 "${stored}"`);
                            }
                        } catch (e) {
                            results[key] = {
                                error: e.message,
                                success: false
                            };
                            throw new Error(`存储 ${key} 失败: ${e.message}`);
                        }
                    }

                    console.log('[登录页面] 存储结果:', results);

                    // 最后验证关键数据
                    const token = window.localStorage.getItem('token');
                    const userid = window.localStorage.getItem('userid');
                    
                    if (!token || !userid) {
                        throw new Error(`关键数据丢失: token=${token}, userid=${userid}`);
                    }

                    console.log('[登录页面] 数据存储成功，准备跳转');
                    
                    // 存储成功后再处理跳转
                    if (isInExtension) {
                        console.log('[登录页面] 在扩展环境中，准备发送登录成功消息');
                        
                        // 准备发送给扩展的数据
                        const messageData = {
                            type: 'LOGIN_SUCCESS',
                            data: {
                                token: loginData.token,
                                userid: loginData.userid,
                                phone_num: loginData.phone_num,
                                is_member: loginData.is_member,
                                expiry_date: loginData.expiry_date,
                                timestamp: Date.now()
                            }
                        };
                        
                        console.log('[登录页面] 发送给扩展的消息数据:', messageData);
                        
                        // 发送消息给扩展
                        try {
                            chrome.runtime.sendMessage(messageData, (response) => {
                                const lastError = chrome.runtime.lastError;
                                if (lastError) {
                                    console.error('[登录页面] 发送消息给扩展失败:', lastError.message);
                                    // 即使发送失败也继续跳转
                                    window.location.href = '/status.html';
                                    return;
                                }
                                
                                console.log('[登录页面] 收到扩展响应:', response);
                                if (response && response.success) {
                                    console.log('[登录页面] 登录状态已成功同步到扩展');
                                } else {
                                    console.warn('[登录页面] 扩展同步响应异常:', response);
                                }
                                
                                // 跳转到状态页面
                                window.location.href = '/status.html';
                            });
                            console.log('[登录页面] 消息已发送给扩展，等待响应...');
                        } catch (error) {
                            console.error('[登录页面] 发送消息给扩展时发生错误:', error);
                            // 发生错误时也继续跳转
                            window.location.href = '/status.html';
                        }
                    } else {
                        console.log('[登录页面] 非扩展环境，直接跳转');
                        window.location.href = '/status.html';
                    }
                } catch (error) {
                    console.error('[登录页面] 数据存储失败:', error);
                    // 输出更多调试信息
                    console.log('[登录页面] 登录响应数据:', data);
                    alert('登录状态保存失败: ' + error.message);
                    
                    try {
                        console.log('[登录页面] 当前localStorage状态:', {
                            token: window.localStorage.getItem('token'),
                            userid: window.localStorage.getItem('userid'),
                            phone_num: window.localStorage.getItem('phone_num'),
                            is_member: window.localStorage.getItem('is_member'),
                            expiry_date: window.localStorage.getItem('expiry_date')
                        });
                    } catch (e) {
                        console.error('[登录页面] 无法读取localStorage状态:', e);
                    }
                }
            } else {
                console.log('[登录页面] 登录失败:', data.message);
                messagePara.textContent = data.message || '登录失败';
                messageDiv.classList.remove('hidden');
                messageDiv.classList.remove('bg-green-100');
                messageDiv.classList.add('bg-red-100');

                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;

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
            console.error('[登录页面] 登录请求失败:', error);
            messagePara.textContent = error.message || '登录请求失败，请稍后重试';
            messageDiv.classList.remove('hidden');
            messageDiv.classList.remove('bg-green-100');
            messageDiv.classList.add('bg-red-100');

            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;

            showDebugInfo({
                success: false,
                message: error.message,
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
                    stack: error.stack
                }
            });
        }
    });
});
