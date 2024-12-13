document.addEventListener('DOMContentLoaded', async () => {
    console.log('[状态页面] 开始初始化检查');
    
    // 检查是否在Chrome扩展环境中
    const isInExtension = !!(window.chrome && chrome.runtime && chrome.runtime.sendMessage);
    console.log('[状态页面] Chrome扩展环境:', isInExtension);

    // 获取 DOM 元素
    const userPhone = document.getElementById('phoneNumber');
    const memberStatus = document.getElementById('memberStatus');
    const expiryDate = document.getElementById('expiryDate');
    const logoutBtn = document.getElementById('logoutButton');

    if (!userPhone || !memberStatus || !expiryDate || !logoutBtn) {
        console.error('[状态页面] 无法找到必要的 DOM 元素');
        return;
    }

    // 获取登录信息
    let userData = null;

    if (isInExtension) {
        console.log('[状态页面] 从扩展获取数据');
        try {
            const result = await new Promise((resolve) => {
                chrome.runtime.sendMessage({ type: 'GET_USER_DATA' }, (response) => {
                    console.log('[状态页面] 扩展返回数据:', response);
                    resolve(response);
                });
            });
            
            if (result && result.success) {
                userData = result.data;
            }
        } catch (error) {
            console.error('[状态页面] 从扩展获取数据失败:', error);
        }
    }

    // 如果从扩展获取失败或不在扩展环境，尝试从localStorage获取
    if (!userData) {
        console.log('[状态页面] 从localStorage获取数据');
        userData = {
            token: localStorage.getItem('token'),
            userid: localStorage.getItem('userid'),
            phone_num: localStorage.getItem('phone_num'),
            is_member: localStorage.getItem('is_member'),
            expiry_date: localStorage.getItem('expiry_date')
        };
    }

    console.log('[状态页面] 获取到的用户数据:', userData);

    if (!userData.token || !userData.userid) {
        console.error('[状态页面] 本地存储数据无效');
        localStorage.clear();
        window.location.href = '/login.html';
        return;
    }

    try {
        console.log('[状态页面] 开始验证token');
        const response = await fetch('/auth/verify-token', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userData.token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log('[状态页面] token验证结果:', data);

        if (!data.success) {
            console.log('[状态页面] token验证失败:', data.message);
            
            // 如果是 token 过期或无效，才清除存储
            if (data.debugInfo?.errorCode === 'TOKEN_EXPIRED' || 
                data.debugInfo?.errorCode === 'INVALID_TOKEN') {
                console.log('[状态页面] token已过期或无效，清除存储');
                localStorage.clear();
                
                // 如果在扩展环境中，发送清除消息
                if (isInExtension) {
                    chrome.runtime.sendMessage({ type: 'CLEAR_USER_DATA' }, (response) => {
                        console.log('[状态页面] 扩展清除数据响应:', response);
                    });
                }
            }
            
            // window.location.href = '/login.html';
            console.log('[状态页面] 验证失败 - 暂时不跳转');
            return;
        }

        // 更新用户信息显示
        userPhone.textContent = userData.phone_num || '未知';
        memberStatus.textContent = userData.is_member === 'true' ? '是' : '否';
        expiryDate.textContent = userData.expiry_date || '无';

        // 使用服务器返回的最新数据更新 localStorage
        if (data.user) {
            // 保持现有的 token
            if (data.token) {
                localStorage.setItem('token', data.token);
            }
            localStorage.setItem('userid', String(data.user.userid));
            localStorage.setItem('phone_num', data.user.phone_num);
            localStorage.setItem('is_member', String(data.user.is_paid));
            localStorage.setItem('expiry_date', data.user.valid_date || '');
            
            console.log('[状态页面] localStorage已更新:', {
                token: localStorage.getItem('token') ? '存在' : '不存在',
                userid: localStorage.getItem('userid'),
                phone_num: localStorage.getItem('phone_num'),
                is_member: localStorage.getItem('is_member'),
                expiry_date: localStorage.getItem('expiry_date')
            });
        }
        
        console.log('[状态页面] 用户信息已更新');
        
    } catch (error) {
        console.error('[状态页面] 验证token失败:', error);
        
        // 清除本地存储
        localStorage.clear();
        
        // 如果在扩展环境中，发送清除消息
        if (isInExtension) {
            chrome.runtime.sendMessage({ type: 'CLEAR_USER_DATA' }, (response) => {
                console.log('[状态页面] 扩展清除数据响应:', response);
            });
        }
        
        // window.location.href = '/login.html';
        console.log('[状态页面] 验证失败 - 暂时不跳转');
    }

    // 退出登录按钮处理
    logoutBtn.addEventListener('click', () => {
        console.log('[状态页面] 用户点击退出登录');
        localStorage.clear();
        
        if (isInExtension) {
            chrome.runtime.sendMessage({ type: 'CLEAR_USER_DATA' }, (response) => {
                console.log('[状态页面] 扩展清除数据响应:', response);
                window.close();
            });
        } else {
            window.location.href = '/login.html';
        }
    });
});
