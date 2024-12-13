document.addEventListener('DOMContentLoaded', async () => {
    console.log('[状态页面] 开始初始化检查');
    
    // 环境配置
    const EXTENSION_ID = 'jbipifegmbaljbkfambickjajngcmhjl';
    const loginUrl = '/login.html';

    // 检查是否从登录页面来
    const urlParams = new URLSearchParams(window.location.search);
    const fromLogin = urlParams.get('from') === 'login';
    console.log('[状态页面] URL参数:', window.location.search);

    if (fromLogin) {
        console.log('[状态页面] 检测到从登录页面跳转，1秒后将刷新页面');
        // 显示加载提示
        document.querySelector('.container').innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
                <div class="text-center">
                    <h2 class="text-xl font-semibold text-gray-900 mb-2">正在加载用户信息</h2>
                    <p class="text-gray-600">请稍候...</p>
                </div>
            </div>
        `;
        
        // 移除from参数并刷新
        urlParams.delete('from');
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
        setTimeout(() => {
            window.location.replace(newUrl);
        }, 1000);
        return;
    }

    // 获取 DOM 元素
    const userPhone = document.getElementById('phoneNumber');
    const memberStatus = document.getElementById('memberStatus');
    const expiryDate = document.getElementById('expiryDate');
    const logoutButton = document.getElementById('logoutButton');

    if (!userPhone || !memberStatus || !expiryDate || !logoutButton) {
        console.error('[状态页面] 无法找到必要的 DOM 元素');
        return;
    }

    // 检查本地存储数据
    const checkLocalStorage = () => {
        const data = {
            token: localStorage.getItem('token'),
            userid: localStorage.getItem('userid'),
            phone_num: localStorage.getItem('phone_num'),
            is_member: localStorage.getItem('is_member'),
            expiry_date: localStorage.getItem('expiry_date')
        };
        console.log('[状态页面] 检查本地数据:', {
            hasToken: !!data.token,
            userid: data.userid
        });
        return data;
    };

    // 从localStorage获取用户数据
    console.log('[状态页面] 开始从localStorage获取数据');
    let userData = checkLocalStorage();

    // 如果没有token，跳转到登录页
    if (!userData.token) {
        console.log('[状态页面] 未找到token，准备跳转');
        //window.location.href = loginUrl;
        return;
    }

    try {
        // 验证token
        const response = await fetch('/auth/verify-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userData.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Token验证失败');
        }

        const data = await response.json();
        
        // 更新显示
        userPhone.textContent = userData.phone_num || '未知';
        memberStatus.textContent = userData.is_member === 'true' ? '会员' : '非会员';
        expiryDate.textContent = userData.expiry_date || '无';
        
        console.log('[状态页面] 用户信息已更新');
        
    } catch (error) {
        console.error('[状态页面] 验证token失败:', error);
        localStorage.clear();
        window.location.href = loginUrl;
    }

    // 处理登出按钮点击
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[状态页面] 用户点击登出按钮');
        window.location.href = '/logout.html';
    });
});
