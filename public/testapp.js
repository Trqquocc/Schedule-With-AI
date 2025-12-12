// app.js - Tích hợp Frontend với Backend

// Utility function để hiển thị thông báo
function showMessage(message, isSuccess = true) {
    // Tạo element thông báo
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSuccess ? 'success' : 'error'}`;
    messageDiv.textContent = message;
    
    // Thêm CSS cho thông báo
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        ${isSuccess ? 'background-color: #4CAF50;' : 'background-color: #f44336;'}
    `;
    
    // Thêm CSS animation
    if (!document.querySelector('#message-styles')) {
        const style = document.createElement('style');
        style.id = 'message-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(messageDiv);
    
    // Tự động xóa sau 3 giây
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Function để loading button
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = 'Đang xử lý...';
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || button.textContent;
    }
}

// 1. XỬ LÝ FORM ĐĂNG KÝ
function handleRegister() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = registerForm.querySelector('button[type="submit"]');
        setButtonLoading(submitButton, true);
        
        // Lấy dữ liệu từ form
        const formData = new FormData(registerForm);
        const data = {
            username: formData.get('username'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
       
        };
        
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showMessage(result.message, true);
                registerForm.reset();
                
                // Chuyển đến trang login sau 2 giây
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                
            } else {
                showMessage(result.message, false);
            }
            
        } catch (error) {
            console.error('Lỗi:', error);
            showMessage('Có lỗi xảy ra! Vui lòng thử lại.', false);
        } finally {
            setButtonLoading(submitButton, false);
        }
    });
}

// 2. XỬ LÝ FORM ĐĂNG NHẬP
function handleLogin() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = loginForm.querySelector('button[type="submit"]');
        setButtonLoading(submitButton, true);
        
        // Lấy dữ liệu từ form
        const formData = new FormData(loginForm);
        const data = {
            username: formData.get('username'),
            password: formData.get('password')
        };
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showMessage(result.message, true);
                
                // Lưu thông tin user vào sessionStorage
                sessionStorage.setItem('currentUser', JSON.stringify(result.user));
                
                // Chuyển đến trang chính sau 1 giây
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
                
            } else {
                showMessage(result.message, false);
            }
            
        } catch (error) {
            console.error('Lỗi:', error);
            showMessage('Có lỗi xảy ra! Vui lòng thử lại.', false);
        } finally {
            setButtonLoading(submitButton, false);
        }
    });
}

// 3. XỬ LÝ TRANG CHÍNH (INDEX)
function handleHomePage() {
    // Kiểm tra đăng nhập
    const currentUser = sessionStorage.getItem('currentUser');
    
    if (currentUser) {
        const user = JSON.parse(currentUser);
        
        // Hiển thị thông tin user nếu có element
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            userInfo.innerHTML = `
                <div class="user-welcome">
                    <h2>Chào mừng, ${user.hoTen}!</h2>
                    <p>Ten: ${user.username}</p>
                </div>
            `;
        }
        
        // Hiển thị nút đăng xuất
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.style.display = 'block';
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        // Ẩn các nút đăng nhập/đăng ký
        const authButtons = document.querySelectorAll('.auth-buttons');
        authButtons.forEach(btn => btn.style.display = 'none');
        
    } else {
        // Chưa đăng nhập - hiển thị nút đăng nhập/đăng ký
        const guestInfo = document.getElementById('guestInfo');
        if (guestInfo) {
            guestInfo.innerHTML = `
                <div class="guest-welcome">
                    <h2>Chào mừng đến với hệ thống!</h2>
                    <p>Vui lòng đăng nhập để sử dụng đầy đủ tính năng.</p>
                </div>
            `;
        }
    }
}

// 4. XỬ LÝ ĐĂNG XUẤT
function handleLogout() {
    // Xóa thông tin user
    sessionStorage.removeItem('currentUser');
    
    showMessage('Đăng xuất thành công!', true);
    
    // Chuyển về trang login sau 1 giây
    setTimeout(() => {
        window.location.href = '/login';
    }, 1000);
}

// 5. VALIDATION FORM REAL-TIME
function setupFormValidation() {
    // Validation cho form đăng ký
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        const passwordField = registerForm.querySelector('input[name="password"]');
        const confirmPasswordField = registerForm.querySelector('input[name="confirmPassword"]');
        const emailField = registerForm.querySelector('input[name="username"]');
        
        // Kiểm tra email format
        if (emailField) {
            emailField.addEventListener('blur', () => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (emailField.value && !emailRegex.test(emailField.value)) {
                    emailField.style.borderColor = '#f44336';
                    showMessage('Email không hợp lệ!', false);
                } else {
                    emailField.style.borderColor = '#ddd';
                }
            });
        }
        
        // Kiểm tra độ dài password
        if (passwordField) {
            passwordField.addEventListener('input', () => {
                if (passwordField.value.length > 0 && passwordField.value.length < 6) {
                    passwordField.style.borderColor = '#f44336';
                } else {
                    passwordField.style.borderColor = '#ddd';
                }
            });
        }
        
        // Kiểm tra password match
        if (confirmPasswordField && passwordField) {
            confirmPasswordField.addEventListener('input', () => {
                if (confirmPasswordField.value !== passwordField.value) {
                    confirmPasswordField.style.borderColor = '#f44336';
                } else {
                    confirmPasswordField.style.borderColor = '#4CAF50';
                }
            });
        }
    }
}

// 6. KHỞI TẠO KHI TRANG LOAD
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Frontend đã sẵn sàng!');
    
    // Xác định trang hiện tại và khởi tạo tương ứng
    const currentPath = window.location.pathname;
    
    switch (currentPath) {
        case '/':
            handleHomePage();
            break;
        case '/login':
            handleLogin();
            setupFormValidation();
            break;
        case '/register':
            handleRegister();
            setupFormValidation();
            break;
        default:
            console.log('Trang không xác định');
    }
    
    // Thêm loading animation cho tất cả các form
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.style.transition = 'opacity 0.3s ease';
    });
});

// 7. UTILITY FUNCTIONS BỔ SUNG

// Kiểm tra trạng thái đăng nhập
function isLoggedIn() {
    return sessionStorage.getItem('currentUser') !== null;
}

// Lấy thông tin user hiện tại
function getCurrentUser() {
    const userData = sessionStorage.getItem('currentUser');
    return userData ? JSON.parse(userData) : null;
}

// Chuyển hướng nếu chưa đăng nhập
function requireAuth() {
    if (!isLoggedIn()) {
        showMessage('Vui lòng đăng nhập để truy cập!', false);
        setTimeout(() => {
            window.location.href = '/login';
        }, 1000);
        return false;
    }
    return true;
}

// Chuyển hướng nếu đã đăng nhập
function requireGuest() {
    if (isLoggedIn()) {
        showMessage('Bạn đã đăng nhập rồi!', true);
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
        return false;
    }
    return true;
}