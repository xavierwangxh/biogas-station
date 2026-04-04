/**
 * 认证与用户管理模块
 * 版本: 1.0.0
 */

const auth = {
    // 当前登录用户
    currentUser: null,

    // 用户数据键名
    KEYS: {
        USERS: 'biogas_users',
        CURRENT_USER: 'biogas_current_user'
    },

    // 默认用户
    DEFAULT_USERS: [
        { id: 'user_default_1', username: 'user', password: '123123', role: 'user', createdAt: '2026-01-01T00:00:00Z' },
        { id: 'user_default_admin', username: 'admin', password: '!23456', role: 'admin', createdAt: '2026-01-01T00:00:00Z' }
    ],

    /**
     * 初始化认证模块
     */
    async init() {
        console.log('[Auth] 初始化认证模块...');

        // 初始化默认用户
        this.initDefaultUsers();

        // 检查是否已登录
        this.checkLoginStatus();

        return true;
    },

    /**
     * 初始化默认用户
     */
    initDefaultUsers() {
        let users = this.getUsers();

        // 如果没有用户，添加默认用户
        if (users.length === 0) {
            console.log('[Auth] 初始化默认用户...');
            localStorage.setItem(this.KEYS.USERS, JSON.stringify(this.DEFAULT_USERS));

            // 同步到云端
            this.syncUsersToCloud(this.DEFAULT_USERS);
        }
    },

    /**
     * 获取所有用户
     */
    getUsers() {
        const usersJson = localStorage.getItem(this.KEYS.USERS);
        if (!usersJson) {
            return [];
        }
        try {
            return JSON.parse(usersJson);
        } catch (e) {
            console.error('[Auth] 解析用户数据失败:', e);
            return [];
        }
    },

    /**
     * 根据用户名查找用户
     */
    findUserByUsername(username) {
        const users = this.getUsers();
        return users.find(u => u.username === username);
    },

    /**
     * 根据ID查找用户
     */
    findUserById(userId) {
        const users = this.getUsers();
        return users.find(u => u.id === userId);
    },

    /**
     * 用户登录
     */
    login(username, password) {
        const user = this.findUserByUsername(username);

        if (!user) {
            return { success: false, message: '用户名不存在' };
        }

        if (user.password !== password) {
            return { success: false, message: '密码错误' };
        }

        // 登录成功
        this.currentUser = {
            id: user.id,
            username: user.username,
            role: user.role
        };

        // 保存登录状态
        localStorage.setItem(this.KEYS.CURRENT_USER, JSON.stringify(this.currentUser));

        console.log('[Auth] 用户登录成功:', user.username);

        return { success: true, message: '登录成功', user: this.currentUser };
    },

    /**
     * 用户登出
     */
    logout() {
        this.currentUser = null;
        localStorage.removeItem(this.KEYS.CURRENT_USER);
        console.log('[Auth] 用户已登出');
    },

    /**
     * 检查登录状态
     */
    checkLoginStatus() {
        const userJson = localStorage.getItem(this.KEYS.CURRENT_USER);
        if (userJson) {
            try {
                this.currentUser = JSON.parse(userJson);
                return true;
            } catch (e) {
                console.error('[Auth] 解析登录状态失败:', e);
                this.logout();
            }
        }
        return false;
    },

    /**
     * 检查是否已登录
     */
    isLoggedIn() {
        return this.currentUser !== null;
    },

    /**
     * 检查是否为管理员
     */
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    },

    /**
     * 添加用户（仅管理员）
     */
    addUser(username, password, role = 'user') {
        if (!this.isAdmin()) {
            return { success: false, message: '无权限，只有管理员可以添加用户' };
        }

        // 检查用户名是否已存在
        if (this.findUserByUsername(username)) {
            return { success: false, message: '用户名已存在' };
        }

        const newUser = {
            id: 'user_' + Date.now(),
            username: username,
            password: password,
            role: role,
            createdAt: new Date().toISOString()
        };

        const users = this.getUsers();
        users.push(newUser);

        localStorage.setItem(this.KEYS.USERS, JSON.stringify(users));

        // 同步到云端
        this.syncUsersToCloud(users);

        console.log('[Auth] 添加用户成功:', username);

        return { success: true, message: '用户添加成功', user: newUser };
    },

    /**
     * 更新用户
     */
    updateUser(userId, updates) {
        if (!this.isAdmin()) {
            return { success: false, message: '无权限，只有管理员可以修改用户' };
        }

        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            return { success: false, message: '用户不存在' };
        }

        // 不允许修改 admin 用户的基本信息（可选）
        // 检查新用户名是否与其他用户冲突
        if (updates.username && updates.username !== users[userIndex].username) {
            if (this.findUserByUsername(updates.username)) {
                return { success: false, message: '用户名已被使用' };
            }
        }

        // 更新用户信息
        users[userIndex] = {
            ...users[userIndex],
            ...updates,
            id: users[userIndex].id, // 保持原ID
            createdAt: users[userIndex].createdAt // 保持原创建时间
        };

        localStorage.setItem(this.KEYS.USERS, JSON.stringify(users));

        // 同步到云端
        this.syncUsersToCloud(users);

        console.log('[Auth] 更新用户成功:', users[userIndex].username);

        return { success: true, message: '用户更新成功', user: users[userIndex] };
    },

    /**
     * 删除用户
     */
    deleteUser(userId) {
        if (!this.isAdmin()) {
            return { success: false, message: '无权限，只有管理员可以删除用户' };
        }

        const user = this.findUserById(userId);
        if (!user) {
            return { success: false, message: '用户不存在' };
        }

        // 不允许删除管理员自己
        if (user.id === this.currentUser.id) {
            return { success: false, message: '不能删除当前登录的管理员账户' };
        }

        // 不允许删除默认 admin 账户
        if (user.username === 'admin') {
            return { success: false, message: '不能删除默认管理员账户' };
        }

        const users = this.getUsers();
        const updatedUsers = users.filter(u => u.id !== userId);

        localStorage.setItem(this.KEYS.USERS, JSON.stringify(updatedUsers));

        // 同步到云端
        this.syncUsersToCloud(updatedUsers);

        console.log('[Auth] 删除用户成功:', user.username);

        return { success: true, message: '用户删除成功' };
    },

    /**
     * 修改当前用户密码
     */
    changePassword(oldPassword, newPassword) {
        if (!this.isLoggedIn()) {
            return { success: false, message: '请先登录' };
        }

        const user = this.findUserById(this.currentUser.id);
        if (!user) {
            return { success: false, message: '用户不存在' };
        }

        if (user.password !== oldPassword) {
            return { success: false, message: '原密码错误' };
        }

        return this.updateUser(this.currentUser.id, { password: newPassword });
    },

    /**
     * 同步用户到云端
     */
    async syncUsersToCloud(users) {
        try {
            // 使用 localStorage 作为唯一数据源，云端存储仅作备份
            // 如果需要真正的云端用户管理，可以扩展此处
            console.log('[Auth] 用户数据已保存到本地');
        } catch (e) {
            console.error('[Auth] 同步用户到云端失败:', e);
        }
    },

    /**
     * 显示登录弹窗
     */
    showLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.remove('hidden');
            // 自动聚焦用户名输入框
            setTimeout(() => {
                const usernameInput = document.getElementById('login-username');
                if (usernameInput) usernameInput.focus();
            }, 100);
        }
    },

    /**
     * 隐藏登录弹窗
     */
    hideLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    /**
     * 执行登录
     */
    doLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            this.showLoginError('请输入用户名和密码');
            return;
        }

        const result = this.login(username, password);

        if (result.success) {
            this.hideLoginModal();
            this.showLoginSuccess(result.message);

            // 刷新页面以显示用户信息
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            this.showLoginError(result.message);
        }
    },

    /**
     * 执行登出
     */
    doLogout() {
        this.logout();
        // 显示登录弹窗
        this.showLoginModal();
        // 隐藏主内容
        this.hideMainContent();
    },

    /**
     * 显示登录错误
     */
    showLoginError(message) {
        const errorEl = document.getElementById('login-error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
        }
    },

    /**
     * 显示登录成功
     */
    showLoginSuccess(message) {
        // 使用 Toast 或 alert
        if (typeof showToast === 'function') {
            showToast(message, 'success');
        } else {
            alert(message);
        }
    },

    /**
     * 隐藏主内容
     */
    hideMainContent() {
        const mainContent = document.querySelector('main');
        const nav = document.querySelector('nav');
        const footer = document.querySelector('footer');

        if (mainContent) mainContent.style.display = 'none';
        if (nav) nav.style.display = 'none';
        if (footer) footer.style.display = 'none';
    },

    /**
     * 显示主内容
     */
    showMainContent() {
        const mainContent = document.querySelector('main');
        const nav = document.querySelector('nav');
        const footer = document.querySelector('footer');

        if (mainContent) mainContent.style.display = 'block';
        if (nav) nav.style.display = 'block';
        if (footer) footer.style.display = 'block';
    },

    /**
     * 更新导航栏用户信息
     */
    updateNavUserInfo() {
        const userInfoContainer = document.getElementById('user-info-container');
        if (!userInfoContainer) return;

        if (this.isLoggedIn()) {
            const roleText = this.isAdmin() ? '管理员' : '普通用户';
            const roleBadgeClass = this.isAdmin() ? 'bg-purple-600' : 'bg-blue-600';

            userInfoContainer.innerHTML = `
                <div class="flex items-center space-x-3">
                    <!-- 同步到云端按钮 -->
                    <button onclick="auth.syncAllDataWithPermission()" class="px-3 py-1 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition">
                        <i class="fas fa-cloud-upload-alt mr-1"></i>同步到云端
                    </button>
                    <span class="text-sm text-white/90">欢迎，<strong>${this.currentUser.username}</strong></span>
                    <span class="px-2 py-0.5 ${roleBadgeClass} text-white text-xs rounded-full">${roleText}</span>
                    ${this.isAdmin() ? '<button onclick="auth.showUserManagement()" class="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"><i class="fas fa-users-cog mr-1"></i>用户管理</button>' : ''}
                    <button onclick="auth.doLogout()" class="px-3 py-1 bg-white/20 text-white text-sm rounded-lg hover:bg-white/30 transition">
                        <i class="fas fa-sign-out-alt mr-1"></i>退出
                    </button>
                </div>
            `;
        } else {
            userInfoContainer.innerHTML = `
                <button onclick="auth.showLoginModal()" class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
                    <i class="fas fa-sign-in-alt mr-2"></i>登录
                </button>
            `;
        }
    },

    /**
     * 同步所有数据到云端（带权限检查）
     */
    syncAllDataWithPermission() {
        if (this.isAdmin()) {
            // 管理员直接同步
            showToast('正在同步所有数据到云端...', 'info');
            dataStore.syncAllToCloud(false).then(result => {
                if (result.success) {
                    showToast('所有数据已同步到云端', 'success');
                } else {
                    showToast('同步失败: ' + result.error, 'error');
                }
            });
        } else {
            // 普通用户需要管理员验证
            this.showAdminVerifyModal(() => {
                // 验证成功后执行同步
                showToast('管理员验证成功，正在同步所有数据到云端...', 'info');
                dataStore.syncAllToCloud(false).then(result => {
                    if (result.success) {
                        showToast('所有数据已同步到云端', 'success');
                    } else {
                        showToast('同步失败: ' + result.error, 'error');
                    }
                });
            });
        }
    },

    /**
     * 显示用户管理弹窗（仅管理员）
     */
    showUserManagement() {
        if (!this.isAdmin()) {
            alert('无权限，只有管理员可以管理用户');
            return;
        }

        const modal = document.getElementById('user-management-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.renderUserList();
        }
    },

    /**
     * 隐藏用户管理弹窗
     */
    hideUserManagement() {
        const modal = document.getElementById('user-management-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    /**
     * 渲染用户列表
     */
    renderUserList() {
        const container = document.getElementById('user-list-container');
        if (!container) return;

        const users = this.getUsers();

        container.innerHTML = users.map(user => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-user text-emerald-600"></i>
                    </div>
                    <div>
                        <p class="font-medium text-gray-800">${user.username}</p>
                        <p class="text-xs text-gray-500">
                            ${user.role === 'admin' ? '<span class="text-purple-600">管理员</span>' : '<span class="text-blue-600">普通用户</span>'}
                            ${user.username === 'admin' ? ' <span class="text-gray-400">(系统账户)</span>' : ''}
                        </p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="auth.showEditUserModal('${user.id}')" class="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition text-sm">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${user.username !== 'admin' ? `
                        <button onclick="auth.confirmDeleteUser('${user.id}', '${user.username}')" class="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition text-sm">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    },

    /**
     * 显示添加用户弹窗
     */
    showAddUserModal() {
        const modal = document.getElementById('add-user-modal');
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('add-username').value = '';
            document.getElementById('add-password').value = '';
            document.getElementById('add-role').value = 'user';
        }
    },

    /**
     * 隐藏添加用户弹窗
     */
    hideAddUserModal() {
        const modal = document.getElementById('add-user-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    /**
     * 执行添加用户
     */
    doAddUser() {
        const username = document.getElementById('add-username').value.trim();
        const password = document.getElementById('add-password').value;
        const role = document.getElementById('add-role').value;

        if (!username || !password) {
            alert('请填写完整信息');
            return;
        }

        if (password.length < 4) {
            alert('密码长度至少4位');
            return;
        }

        const result = this.addUser(username, password, role);

        if (result.success) {
            this.hideAddUserModal();
            this.renderUserList();
            alert('用户添加成功');
        } else {
            alert(result.message);
        }
    },

    /**
     * 显示编辑用户弹窗
     */
    showEditUserModal(userId) {
        const user = this.findUserById(userId);
        if (!user) {
            alert('用户不存在');
            return;
        }

        const modal = document.getElementById('edit-user-modal');
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('edit-user-id').value = user.id;
            document.getElementById('edit-username').value = user.username;
            document.getElementById('edit-password').value = user.password;
            document.getElementById('edit-role').value = user.role;
        }
    },

    /**
     * 隐藏编辑用户弹窗
     */
    hideEditUserModal() {
        const modal = document.getElementById('edit-user-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    /**
     * 执行编辑用户
     */
    doEditUser() {
        const userId = document.getElementById('edit-user-id').value;
        const username = document.getElementById('edit-username').value.trim();
        const password = document.getElementById('edit-password').value;
        const role = document.getElementById('edit-role').value;

        if (!username || !password) {
            alert('请填写完整信息');
            return;
        }

        if (password.length < 4) {
            alert('密码长度至少4位');
            return;
        }

        const result = this.updateUser(userId, {
            username: username,
            password: password,
            role: role
        });

        if (result.success) {
            this.hideEditUserModal();
            this.renderUserList();
            alert('用户更新成功');
        } else {
            alert(result.message);
        }
    },

    /**
     * 确认删除用户
     */
    confirmDeleteUser(userId, username) {
        if (confirm(`确定要删除用户 "${username}" 吗？`)) {
            const result = this.deleteUser(userId);
            if (result.success) {
                this.renderUserList();
                alert('用户删除成功');
            } else {
                alert(result.message);
            }
        }
    },

    /**
     * 验证管理员账户
     * @param {string} username - 用户名
     * @param {string} password - 密码
     * @returns {Object} 验证结果
     */
    verifyAdmin(username, password) {
        const user = this.findUserByUsername(username);

        if (!user) {
            return { success: false, message: '用户名不存在' };
        }

        if (user.password !== password) {
            return { success: false, message: '密码错误' };
        }

        if (user.role !== 'admin') {
            return { success: false, message: '该用户不是管理员' };
        }

        console.log('[Auth] 管理员验证成功:', username);
        return { success: true, message: '验证成功', user: user };
    },

    /**
     * 显示管理员验证弹窗（用于普通用户保存时验证）
     * @param {Function} onSuccess - 验证成功后的回调
     */
    showAdminVerifyModal(onSuccess) {
        // 创建弹窗HTML
        let modalHtml = `
            <div id="admin-verify-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-gray-800">
                            <i class="fas fa-shield-alt mr-2 text-amber-500"></i>
                            需要管理员授权
                        </h3>
                        <button onclick="auth.closeAdminVerifyModal()" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <p class="text-gray-600 mb-4">保存数据需要管理员验证，请输入管理员账户信息：</p>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">管理员用户名</label>
                            <input type="text" id="verify-admin-username" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="请输入管理员用户名">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">管理员密码</label>
                            <input type="password" id="verify-admin-password" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="请输入管理员密码" onkeypress="if(event.key === 'Enter') auth.doAdminVerify()">
                        </div>
                        <div id="verify-error" class="text-red-500 text-sm hidden"></div>
                        <div class="flex gap-3 pt-2">
                            <button onclick="auth.doAdminVerify()" class="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition">
                                验证
                            </button>
                            <button onclick="auth.closeAdminVerifyModal()" class="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition">
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 添加到body
        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div);

        // 保存回调函数
        this._adminVerifyCallback = onSuccess;

        // 自动聚焦
        setTimeout(() => {
            document.getElementById('verify-admin-username').focus();
        }, 100);
    },

    /**
     * 关闭管理员验证弹窗
     */
    closeAdminVerifyModal() {
        const modal = document.getElementById('admin-verify-modal');
        if (modal) {
            modal.remove();
        }
        this._adminVerifyCallback = null;
    },

    /**
     * 执行管理员验证
     */
    doAdminVerify() {
        const username = document.getElementById('verify-admin-username').value.trim();
        const password = document.getElementById('verify-admin-password').value;
        const errorEl = document.getElementById('verify-error');

        if (!username || !password) {
            errorEl.textContent = '请输入用户名和密码';
            errorEl.classList.remove('hidden');
            return;
        }

        const result = this.verifyAdmin(username, password);

        if (result.success) {
            // 验证成功，关闭弹窗并执行回调
            this.closeAdminVerifyModal();
            showToast('管理员验证成功，正在同步数据...', 'success');

            // 执行回调（通常是同步到云端）
            if (typeof this._adminVerifyCallback === 'function') {
                this._adminVerifyCallback();
            }
        } else {
            errorEl.textContent = result.message;
            errorEl.classList.remove('hidden');
        }
    }
};

// 页面加载完成后初始化认证
document.addEventListener('DOMContentLoaded', async function() {
    // 等待 DOM 加载完成
    setTimeout(async () => {
        await auth.init();

        if (!auth.isLoggedIn()) {
            auth.showLoginModal();
            auth.hideMainContent();
        } else {
            auth.hideLoginModal();
            auth.showMainContent();
            auth.updateNavUserInfo();
        }
    }, 100);
});
