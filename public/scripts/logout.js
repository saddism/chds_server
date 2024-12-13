document.addEventListener('DOMContentLoaded', async () => {
    console.log('[登出页面] 开始登出流程');

    try {
        // 1. 清理本地存储
        const keysToRemove = ['token', 'userid', 'phone_num', 'is_member', 'expiry_date'];
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('[登出页面] 已清理本地存储');

        // 2. 构造登出消息
        const logoutMessage = {
            type: 'LOGOUT',
            data: {
                action: 'CLEAR_LOGIN_INFO',
                timestamp: new Date().toISOString()
            }
        };

        // 3. 通知扩展清理登录信息
        try {
            window.postMessage(logoutMessage, '*');
            console.log('[登出页面] 已发送登出消息给扩展:', JSON.stringify(logoutMessage, null, 2));

            // 更新状态文本
            const statusText = document.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = '正在清理登录信息...';
            }
        } catch (error) {
            console.warn('[登出页面] 发送登出消息时出错:', error);
        }

        // 4. 等待消息处理
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 5. 更新状态文本
        const statusText = document.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = '即将返回登录页面...';
        }

        // 6. 再等待一小段时间
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 7. 跳转到登录页
        console.log('[登出页面] 准备跳转到登录页');
      //  alert('登出成功');
        window.location.replace('/login.html?from=logout');

    } catch (error) {
        console.error('[登出页面] 登出过程中出错:', error);
        
        // 显示错误信息
        const statusText = document.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = '登出时发生错误，请刷新页面重试';
            statusText.style.color = '#e74c3c';
        }
    }
});
