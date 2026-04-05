/**
 * 数据存储模块
 * 使用 Supabase 云端存储 + LocalStorage 本地缓存
 * 版本: 2.0.0 - 支持云端同步
 */

const dataStore = {
    // 数据版本
    DATA_VERSION: '2.0.0',

    // Storage 键名
    KEYS: {
        PROJECTS: 'biogas_projects',
        PERSONNEL: 'biogas_personnel',
        PROJECT_GROUPS: 'biogas_project_groups',
        SETTINGS: 'biogas_settings',
        VERSION: 'biogas_data_version',
        LAST_SYNC: 'biogas_last_sync'
    },

    // 云端同步状态
    cloudSync: {
        enabled: false,
        lastSync: null,
        syncing: false
    },

    /**
     * 初始化数据存储
     */
    async init() {
        console.log('[DataStore] 初始化开始 (云端版 v2.0.0)...');

        // 检查并设置数据版本
        const currentVersion = localStorage.getItem(this.KEYS.VERSION);
        if (!currentVersion) {
            console.log('[DataStore] 首次初始化，设置版本:', this.DATA_VERSION);
            localStorage.setItem(this.KEYS.VERSION, this.DATA_VERSION);
        }

        // 确保所有存储键都存在（如果不存在才初始化为空数组）
        this.ensureStorageKeys();

        // 尝试从云端加载数据（优先级高于本地数据）
        await this.syncFromCloud();

        console.log('[DataStore] 初始化完成');
        return true;
    },

    /**
     * 确保所有存储键都存在
     * 注意：如果键已存在，不覆盖现有数据
     */
    ensureStorageKeys() {
        const keys = [this.KEYS.PROJECTS, this.KEYS.PERSONNEL, this.KEYS.PROJECT_GROUPS, this.KEYS.SETTINGS];
        keys.forEach(key => {
            if (!localStorage.getItem(key)) {
                console.log(`[DataStore] 初始化空存储: ${key}`);
                localStorage.setItem(key, JSON.stringify([]));
            }
        });
    },

    /**
     * 从云端同步数据（强制覆盖本地数据）
     */
    async syncFromCloud() {
        console.log('[DataStore] 尝试从云端同步数据...');

        try {
            // 从云端获取项目
            const cloudProjects = await supabaseClient.get('projects');
            console.log(`[DataStore] 云端项目数量: ${cloudProjects ? cloudProjects.length : 0}`);

            if (cloudProjects && cloudProjects.length > 0) {
                console.log(`[DataStore] 云端获取到 ${cloudProjects.length} 个项目，强制更新本地数据`);
                // 转换为前端格式
                const projects = cloudProjects.map(p => ({
                    id: p.id,
                    name: p.name,
                    location: p.location || {},
                    scale: p.scale || {},
                    costs: p.costs || {},
                    lifecycle: p.lifecycle || {},
                    notes: p.notes || '',
                    createdAt: p.created_at,
                    updatedAt: p.updated_at
                }));
                localStorage.setItem(this.KEYS.PROJECTS, JSON.stringify(projects));
            }

            // 从云端获取人员
            const cloudPersonnel = await supabaseClient.get('personnel');
            console.log(`[DataStore] 云端人员数量: ${cloudPersonnel ? cloudPersonnel.length : 0}`);

            if (cloudPersonnel && cloudPersonnel.length > 0) {
                console.log(`[DataStore] 云端获取到 ${cloudPersonnel.length} 名人员，强制更新本地数据`);
                // 转换为前端格式（与云端表结构匹配）
                const personnel = cloudPersonnel.map(p => ({
                    id: p.id,
                    name: p.name,
                    gender: p.gender || '男',
                    age: p.age,
                    department: p.department || '',
                    position: p.position || '',
                    education: '',  // 云端表没有这些字段
                    major: '',
                    title: '',
                    certificates: '',
                    experience: { 
                        projectCount: p.experience || 0,  // experience 是整数
                        years: p.years || 0, 
                        processes: p.skills || []  // 技能存储在 skills 字段
                    },
                    customSkills: [],  // 云端表没有这个字段
                    capabilities: p.capabilities || {
                        technical: 5, management: 5, coordination: 5
                    },
                    maxProjects: p.max_projects || 3,
                    contact: { 
                        phone: p.phone || '', 
                        email: p.email || '' 
                    },
                    currentProjects: [],  // 云端表没有这个字段
                    createdAt: p.created_at,
                    updatedAt: p.updated_at
                }));
                localStorage.setItem(this.KEYS.PERSONNEL, JSON.stringify(personnel));
            }

            this.cloudSync.enabled = true;
            this.cloudSync.lastSync = new Date().toISOString();
            localStorage.setItem(this.KEYS.LAST_SYNC, this.cloudSync.lastSync);
            console.log('[DataStore] 云端同步完成');

            // 刷新页面以显示新数据
            if (typeof refreshUI === 'function') {
                refreshUI();
            }

        } catch (error) {
            console.error('[DataStore] 云端同步失败:', error);
            this.cloudSync.enabled = false;
            console.log('[DataStore] 将使用本地缓存数据');
        }
    },

    /**
     * 同步数据到云端
     */
    async syncToCloud() {
        if (this.cloudSync.syncing) {
            console.log('[DataStore] 正在同步中，跳过');
            return;
        }

        this.cloudSync.syncing = true;

        try {
            // 同步项目
            const projects = this.getAllProjects();
            for (const project of projects) {
                await this.syncProjectToCloud(project);
            }

            // 同步人员
            const personnel = this.getAllPersonnel();
            for (const person of personnel) {
                await this.syncPersonnelToCloud(person);
            }

            this.cloudSync.lastSync = new Date().toISOString();
            localStorage.setItem(this.KEYS.LAST_SYNC, this.cloudSync.lastSync);
            console.log('[DataStore] 数据已同步到云端');

        } catch (error) {
            console.error('[DataStore] 同步到云端失败:', error);
        } finally {
            this.cloudSync.syncing = false;
        }
    },

    /**
     * 同步单个项目到云端（使用UPSERT，不会产生重复）
     */
    async syncProjectToCloud(project) {
        try {
            console.log(`[DataStore] 开始同步项目到云端: ${project.name}`, project);
            
            // 使用 UPSERT，无论是新建还是更新都使用同一操作
            const cloudData = {
                id: project.id,
                name: project.name,
                location: project.location || {},
                scale: project.scale || {},
                costs: project.costs || {},
                lifecycle: project.lifecycle || {},
                notes: project.notes || '',
                created_at: project.createdAt || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            console.log(`[DataStore] 项目云端数据:`, cloudData);
            
            const result = await supabaseClient.upsert('projects', cloudData);
            if (result.success) {
                console.log(`[DataStore] 项目同步成功: ${project.name}`);
            } else {
                console.error(`[DataStore] 项目同步失败: ${project.name}`, result.error);
            }
            return result;
        } catch (error) {
            console.error('[DataStore] 同步项目失败:', project.name, error);
            return { success: false, error: error.message };
        }
    },

    /**
     * 同步单个人员到云端（使用UPSERT，不会产生重复）
     */
    async syncPersonnelToCloud(person) {
        try {
            console.log(`[DataStore] 开始同步人员到云端: ${person.name}`, person);
            
            // 使用 UPSERT，无论是新建还是更新都使用同一操作
            // 注意：Supabase 表结构中的字段名（与实际表结构匹配）
            const cloudData = {
                id: person.id,
                name: person.name,
                gender: person.gender || '男',
                age: person.age,
                department: person.department || '',
                position: person.position || '',
                // 实际表结构字段
                skills: person.experience?.processes || [],  // 技能存储在 skills 字段
                capabilities: person.capabilities || {
                    technical: 5, management: 5, coordination: 5
                },
                experience: person.experience?.projectCount || 0,  // experience 是整数
                years: person.experience?.years || 0,
                max_projects: person.maxProjects || 3,
                phone: person.contact?.phone || '',
                email: person.contact?.email || '',
                created_at: person.createdAt || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            console.log(`[DataStore] 人员云端数据:`, cloudData);
            
            const result = await supabaseClient.upsert('personnel', cloudData);
            if (result.success) {
                console.log(`[DataStore] 人员同步成功: ${person.name}`);
            } else {
                console.error(`[DataStore] 人员同步失败: ${person.name}`, result.error);
            }
            return result;
        } catch (error) {
            console.error('[DataStore] 同步人员失败:', person.name, error);
            return { success: false, error: error.message };
        }
    },

    /**
     * 从云端删除项目
     */
    async deleteProjectFromCloud(projectId) {
        try {
            await supabaseClient.delete('projects', 'id', projectId);
            console.log('[DataStore] 云端项目已删除:', projectId);
        } catch (error) {
            console.error('[DataStore] 云端删除项目失败:', error);
        }
    },

    /**
     * 从云端删除人员
     */
    async deletePersonnelFromCloud(personId) {
        try {
            await supabaseClient.delete('personnel', 'id', personId);
            console.log('[DataStore] 云端人员已删除:', personId);
        } catch (error) {
            console.error('[DataStore] 云端删除人员失败:', error);
        }
    },

    // ==================== 项目数据操作 ====================

    getAllProjects() {
        try {
            const data = localStorage.getItem(this.KEYS.PROJECTS);
            if (!data) return [];
            const projects = JSON.parse(data);
            return Array.isArray(projects) ? projects : [];
        } catch (e) {
            console.error('[DataStore] 获取项目数据失败:', e);
            return [];
        }
    },

    getProject(id) {
        if (!id) return null;
        const projects = this.getAllProjects();
        return projects.find(p => p.id === id) || null;
    },

    saveProject(project, options = {}) {
        console.log('[DataStore] 保存项目:', project.name || '未命名');

        if (!project) {
            throw new Error('项目数据不能为空');
        }

        const projects = this.getAllProjects();

        const isNew = !project.id;
        if (isNew) {
            project.id = this.generateId();
            console.log('[DataStore] 新建项目，生成ID:', project.id);
        } else {
            console.log('[DataStore] 更新项目，ID:', project.id);
        }

        project.updatedAt = new Date().toISOString();
        if (isNew) {
            project.createdAt = project.updatedAt;
        }

        const existingIndex = projects.findIndex(p => p.id === project.id);

        if (existingIndex >= 0) {
            const existing = projects[existingIndex];
            projects[existingIndex] = this.deepMerge(existing, project);
        } else {
            projects.push(project);
        }

        this.saveToStorage(this.KEYS.PROJECTS, projects);

        // 只有明确要求同步时才同步到云端（不在这里自动同步）
        // 如果 options.skipCloud 为 true，则跳过云端同步
        // 调用者（如 app.js）会根据用户权限决定是否同步

        return project;
    },

    deleteProject(id) {
        console.log('[DataStore] 删除项目:', id);

        if (!id) {
            console.warn('[DataStore] 删除项目失败: ID为空');
            return false;
        }

        const projects = this.getAllProjects();
        const initialLength = projects.length;

        const filtered = projects.filter(p => p.id !== id);

        if (filtered.length === initialLength) {
            console.warn('[DataStore] 删除项目失败: 未找到项目', id);
            return false;
        }

        this.saveToStorage(this.KEYS.PROJECTS, filtered);
        this.removeProjectFromAllPersonnel(id);

        // 异步从云端删除
        this.deleteProjectFromCloud(id);

        return true;
    },

    removeProjectFromAllPersonnel(projectId) {
        const personnel = this.getAllPersonnel();
        let updated = false;

        const updatedPersonnel = personnel.map(person => {
            if (person.currentProjects && person.currentProjects.includes(projectId)) {
                updated = true;
                return {
                    ...person,
                    currentProjects: person.currentProjects.filter(pid => pid !== projectId)
                };
            }
            return person;
        });

        if (updated) {
            this.saveToStorage(this.KEYS.PERSONNEL, updatedPersonnel);
            console.log('[DataStore] 已从所有人员中移除项目:', projectId);
        }
    },

    // ==================== 人员数据操作 ====================

    getAllPersonnel() {
        try {
            const data = localStorage.getItem(this.KEYS.PERSONNEL);
            if (!data) return [];
            const personnel = JSON.parse(data);
            return Array.isArray(personnel) ? personnel : [];
        } catch (e) {
            console.error('[DataStore] 获取人员数据失败:', e);
            return [];
        }
    },

    getPersonnel(id) {
        if (!id) return null;
        const personnel = this.getAllPersonnel();
        return personnel.find(p => p.id === id) || null;
    },

    savePersonnel(person, options = {}) {
        console.log('[DataStore] 保存人员:', person.name || '未命名');

        if (!person) {
            throw new Error('人员数据不能为空');
        }

        const personnel = this.getAllPersonnel();

        const isNew = !person.id;
        if (isNew) {
            person.id = this.generateId();
            console.log('[DataStore] 新建人员，生成ID:', person.id);
        }

        if (!person.currentProjects) {
            person.currentProjects = [];
        }

        person.updatedAt = new Date().toISOString();
        if (isNew) {
            person.createdAt = person.updatedAt;
        }

        const existingIndex = personnel.findIndex(p => p.id === person.id);
        let savedPerson;

        if (existingIndex >= 0) {
            savedPerson = this.deepMerge(personnel[existingIndex], person);
            personnel[existingIndex] = savedPerson;
        } else {
            personnel.push(person);
            savedPerson = person;
        }

        this.saveToStorage(this.KEYS.PERSONNEL, personnel);

        // 只有明确要求同步时才同步到云端（不在这里自动同步）
        // 调用者（如 app.js）会根据用户权限决定是否同步

        return savedPerson;
    },

    deletePersonnel(id) {
        console.log('[DataStore] 删除人员:', id);

        if (!id) {
            console.warn('[DataStore] 删除人员失败: ID为空');
            return false;
        }

        const personnel = this.getAllPersonnel();
        const initialLength = personnel.length;

        const filtered = personnel.filter(p => p.id !== id);

        if (filtered.length === initialLength) {
            console.warn('[DataStore] 删除人员失败: 未找到人员', id);
            return false;
        }

        this.saveToStorage(this.KEYS.PERSONNEL, filtered);

        // 异步从云端删除
        this.deletePersonnelFromCloud(id);

        return true;
    },

    updatePersonnelProjects(personId, projectId, action) {
        console.log(`[DataStore] 更新人员项目: person=${personId}, project=${projectId}, action=${action}`);

        const person = this.getPersonnel(personId);
        if (!person) {
            console.warn('[DataStore] 更新人员项目失败: 人员不存在', personId);
            return false;
        }

        if (!person.currentProjects) {
            person.currentProjects = [];
        }

        if (action === 'add') {
            if (!person.currentProjects.includes(projectId)) {
                person.currentProjects.push(projectId);
            }
        } else if (action === 'remove') {
            person.currentProjects = person.currentProjects.filter(pid => pid !== projectId);
        }

        this.savePersonnel(person);
        return true;
    },

    // ==================== 项目群数据操作 ====================

    getAllProjectGroups() {
        try {
            const data = localStorage.getItem(this.KEYS.PROJECT_GROUPS);
            if (!data) return [];
            const groups = JSON.parse(data);
            return Array.isArray(groups) ? groups : [];
        } catch (e) {
            return [];
        }
    },

    saveProjectGroup(group) {
        if (!group.id) {
            group.id = this.generateId();
        }

        const groups = this.getAllProjectGroups();
        const existingIndex = groups.findIndex(g => g.id === group.id);

        if (existingIndex >= 0) {
            groups[existingIndex] = { ...groups[existingIndex], ...group };
        } else {
            groups.push(group);
        }

        this.saveToStorage(this.KEYS.PROJECT_GROUPS, groups);
        return group;
    },

    clearProjectGroups() {
        this.saveToStorage(this.KEYS.PROJECT_GROUPS, []);
    },

    // ==================== 设置操作 ====================

    getSettings() {
        try {
            const data = localStorage.getItem(this.KEYS.SETTINGS);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    },

    saveSettings(settings) {
        this.saveToStorage(this.KEYS.SETTINGS, settings);
    },

    // ==================== 统计信息 ====================

    getStatistics() {
        const projects = this.getAllProjects();
        const personnel = this.getAllPersonnel();
        const groups = this.getAllProjectGroups();

        const now = new Date();
        const activeProjects = projects.filter(p => {
            const stages = p.lifecycle || {};
            for (const stage of Object.values(stages)) {
                if (stage.startDate && new Date(stage.startDate) <= now) {
                    if (!stage.endDate || new Date(stage.endDate) >= now) {
                        return true;
                    }
                }
            }
            return false;
        });

        return {
            totalProjects: projects.length,
            totalPersonnel: personnel.length,
            projectGroups: groups.length,
            activeProjects: activeProjects.length
        };
    },

    // ==================== 工具方法 ====================

    generateId() {
        return 'bg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
    },

    saveToStorage(key, data) {
        try {
            const json = JSON.stringify(data);
            localStorage.setItem(key, json);
            console.log(`[DataStore] 数据已保存: ${key}, 大小: ${json.length} 字符`);
        } catch (e) {
            console.error(`[DataStore] 保存数据失败: ${key}`, e);
            if (e.name === 'QuotaExceededError') {
                throw new Error('存储空间不足，请清理一些数据');
            }
            throw e;
        }
    },

    deepMerge(target, source) {
        const output = { ...target };

        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }

        return output;
    },

    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    },

    exportAll() {
        return {
            version: this.DATA_VERSION,
            exportTime: new Date().toISOString(),
            projects: this.getAllProjects(),
            personnel: this.getAllPersonnel(),
            projectGroups: this.getAllProjectGroups(),
            settings: this.getSettings()
        };
    },

    importAll(data) {
        try {
            if (data.projects) {
                this.saveToStorage(this.KEYS.PROJECTS, data.projects);
            }
            if (data.personnel) {
                this.saveToStorage(this.KEYS.PERSONNEL, data.personnel);
            }
            if (data.projectGroups) {
                this.saveToStorage(this.KEYS.PROJECT_GROUPS, data.projectGroups);
            }
            if (data.settings) {
                this.saveToStorage(this.KEYS.SETTINGS, data.settings);
            }

            // 导入后同步到云端
            this.syncToCloud();

            console.log('[DataStore] 数据导入成功');
            return true;
        } catch (e) {
            console.error('[DataStore] 数据导入失败:', e);
            return false;
        }
    },

    clearAll() {
        localStorage.removeItem(this.KEYS.PROJECTS);
        localStorage.removeItem(this.KEYS.PERSONNEL);
        localStorage.removeItem(this.KEYS.PROJECT_GROUPS);
        localStorage.removeItem(this.KEYS.SETTINGS);
        localStorage.removeItem(this.KEYS.VERSION);
        console.log('[DataStore] 所有数据已清空');
    },

    /**
     * 手动触发云端同步
     */
    async forceSync() {
        showToast('正在同步数据...', 'info');
        await this.syncFromCloud();
        await this.syncToCloud();
        showToast('同步完成', 'success');
    },

    /**
     * 同步所有数据到云端（带权限检查）
     * @param {boolean} requireAdmin - 是否需要管理员验证
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async syncAllToCloud(requireAdmin = true) {
        // 检查权限
        if (requireAdmin && typeof auth !== 'undefined' && !auth.isAdmin()) {
            return { success: false, error: '需要管理员权限才能同步到云端' };
        }

        try {
            showToast('正在同步数据到云端...', 'info');

            // 同步所有项目
            const projects = this.getAllProjects();
            for (const project of projects) {
                await this.syncProjectToCloud(project);
            }

            // 同步所有人员
            const personnel = this.getAllPersonnel();
            for (const person of personnel) {
                await this.syncPersonnelToCloud(person);
            }

            this.cloudSync.lastSync = new Date().toISOString();
            localStorage.setItem(this.KEYS.LAST_SYNC, this.cloudSync.lastSync);

            console.log('[DataStore] 所有数据已同步到云端');
            return { success: true };
        } catch (error) {
            console.error('[DataStore] 同步到云端失败:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * 保存并同步项目（带权限检查）
     * @param {Object} project - 项目数据
     * @param {boolean} syncToCloud - 是否同步到云端
     * @returns {Object} 保存结果
     */
    saveProjectWithPermission(project, syncToCloud = true) {
        const result = this.saveProject(project);

        if (syncToCloud) {
            // 检查是否是管理员
            if (typeof auth !== 'undefined' && auth.isAdmin()) {
                // 管理员直接同步
                this.syncProjectToCloud(result);
                console.log('[DataStore] 管理员保存，已同步到云端');
            } else {
                // 非管理员需要验证
                console.log('[DataStore] 非管理员保存，仅保存在本地');
            }
        }

        return result;
    },

    /**
     * 保存并同步人员（带权限检查）
     * @param {Object} person - 人员数据
     * @param {boolean} syncToCloud - 是否同步到云端
     * @returns {Object} 保存结果
     */
    savePersonnelWithPermission(person, syncToCloud = true) {
        const result = this.savePersonnel(person);

        if (syncToCloud) {
            // 检查是否是管理员
            if (typeof auth !== 'undefined' && auth.isAdmin()) {
                // 管理员直接同步
                this.syncPersonnelToCloud(result);
                console.log('[DataStore] 管理员保存，已同步到云端');
            } else {
                // 非管理员需要验证
                console.log('[DataStore] 非管理员保存，仅保存在本地');
            }
        }

        return result;
    }
};

// 自动初始化
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => dataStore.init());
    } else {
        // 延迟初始化，等待 supabaseClient 加载
        setTimeout(() => dataStore.init(), 100);
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = dataStore;
}
