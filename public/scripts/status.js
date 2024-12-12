document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
    const phoneNumberElement = document.getElementById('phoneNumber');
    const memberStatusElement = document.getElementById('memberStatus');
    const expiryDateElement = document.getElementById('expiryDate');
    const purchaseButton = document.getElementById('purchaseButton');
    const logoutButton = document.getElementById('logoutButton');
    const purchaseModal = document.getElementById('purchaseModal');
    const cancelPurchase = document.getElementById('cancelPurchase');
    const confirmPurchase = document.getElementById('confirmPurchase');

    let selectedDays = 0;

    // 检查登录状态
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // 格式化日期
    function formatDate(dateString) {
        if (!dateString) return '未设置';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // 检查会员状态
    function checkMemberStatus(validDate) {
        if (!validDate) return false;
        const now = new Date();
        const expiry = new Date(validDate);
        return now < expiry;
    }

    // 更新UI显示
    function updateUI(userData) {
        phoneNumberElement.textContent = userData.phone_num;
        
        const isActive = checkMemberStatus(userData.valid_date);
        memberStatusElement.textContent = isActive ? '已开通' : '未开通';
        memberStatusElement.className = isActive ? 'status-active' : 'status-inactive';

        const expiryDate = formatDate(userData.valid_date);
        expiryDateElement.textContent = expiryDate;
        
        if (userData.valid_date) {
            const daysLeft = Math.ceil((new Date(userData.valid_date) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 0) {
                expiryDateElement.className = 'expiry-expired';
            } else if (daysLeft <= 7) {
                expiryDateElement.className = 'expiry-warning';
            }
        }

        purchaseButton.textContent = isActive ? '续费会员' : '开通会员';
    }

    // 加载用户状态
    async function loadUserStatus() {
        try {
            const response = await fetch('/auth/status', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                updateUI(data.user);
            } else {
                throw new Error(data.error || '获取用户状态失败');
            }
        } catch (error) {
            console.error('获取用户状态失败:', error);
            alert('获取用户状态失败，请重新登录');
            window.location.href = '/login.html';
        }
    }

    // 处理购买会员
    async function handlePurchase(days) {
        const validDate = new Date();
        validDate.setDate(validDate.getDate() + days);

        try {
            const response = await fetch('/auth/update-paid-status', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    is_paid: true,
                    valid_date: validDate.toISOString()
                })
            });

            const data = await response.json();
            if (data.success) {
                alert('购买成功！');
                updateUI(data.user);
                purchaseModal.classList.remove('modal-show');
            } else {
                throw new Error(data.error || '购买失败');
            }
        } catch (error) {
            console.error('购买错误:', error);
            alert('购买失败，请重试');
        }
    }

    // 事件监听器
    purchaseButton.addEventListener('click', () => {
        purchaseModal.classList.add('modal-show');
    });

    cancelPurchase.addEventListener('click', () => {
        purchaseModal.classList.remove('modal-show');
    });

    // 选择会员时长
    const durationButtons = purchaseModal.querySelectorAll('button[data-days]');
    durationButtons.forEach(button => {
        button.addEventListener('click', () => {
            durationButtons.forEach(btn => btn.classList.remove('bg-indigo-500', 'text-white'));
            button.classList.add('bg-indigo-500', 'text-white');
            selectedDays = parseInt(button.dataset.days);
        });
    });

    confirmPurchase.addEventListener('click', () => {
        if (selectedDays > 0) {
            handlePurchase(selectedDays);
        } else {
            alert('请选择会员时长');
        }
    });

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    });

    // 初始加载用户状态
    loadUserStatus();
});
