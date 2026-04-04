/**
 * 项目管理模块
 * 处理项目的创建、更新、查询、删除等业务逻辑
 */

const projectManager = {
    /**
     * 创建新项目
     * @param {Object} data - 项目数据
     * @returns {Object} 创建结果 {success, project, errors}
     */
    createProject(data) {
        // 验证数据
        const validation = validateProject(data);
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }

        // 如果提供了签约日期，自动计算各阶段时间
        if (data.contractDate && (!data.lifecycle || !data.lifecycle.contract?.startDate)) {
            data.lifecycle = this.calculateStageDates(data.contractDate);
        }

        // 保存项目
        const project = dataStore.saveProject(data);

        // 更新人员当前项目列表
        this.updatePersonnelProjectLinks(project);

        return { success: true, project };
    },

    /**
     * 更新项目
     * @param {string} id - 项目ID
     * @param {Object} data - 更新数据
     * @returns {Object} 更新结果
     */
    updateProject(id, data) {
        const existing = dataStore.getProject(id);
        if (!existing) {
            return { success: false, errors: ['项目不存在'] };
        }

        const validation = validateProject({ ...existing, ...data });
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }

        data.id = id;
        const project = dataStore.saveProject(data);

        // 更新人员项目链接
        this.updatePersonnelProjectLinks(project);

        return { success: true, project };
    },

    /**
     * 删除项目
     * @param {string} id - 项目ID
     * @returns {boolean} 是否成功
     */
    deleteProject(id) {
        // 先移除所有人员与此项目的关联
        const personnel = dataStore.getAllPersonnel();
        personnel.forEach(person => {
            if (person.currentProjects?.includes(id)) {
                dataStore.updatePersonnelProjects(person.id, id, 'remove');
            }
        });

        return dataStore.deleteProject(id);
    },

    /**
     * 获取项目详情
     * @param {string} id - 项目ID
     * @returns {Object|null} 项目详情（含牵头人信息）
     */
    getProjectDetail(id) {
        const project = dataStore.getProject(id);
        if (!project) return null;

        // 补充牵头人信息
        const stages = ['tracking', 'contract', 'procedure', 'construction', 'operation'];
        stages.forEach(stageKey => {
            const stage = project.lifecycle?.[stageKey];
            if (stage?.leaderId) {
                const leader = dataStore.getPersonnel(stage.leaderId);
                stage.leaderName = leader?.name || '未知';
                stage.leaderInfo = leader;
            }
        });

        return project;
    },

    /**
     * 获取所有项目（含筛选排序）
     * @param {Object} options - 选项 {filter, sortBy, sortOrder}
     * @returns {Array} 项目列表
     */
    getProjects(options = {}) {
        let projects = dataStore.getAllProjects();

        // 筛选
        if (options.filter) {
            projects = projects.filter(options.filter);
        }

        // 排序
        if (options.sortBy) {
            projects.sort((a, b) => {
                let valA = this.getNestedValue(a, options.sortBy);
                let valB = this.getNestedValue(b, options.sortBy);
                
                if (options.sortOrder === 'desc') {
                    [valA, valB] = [valB, valA];
                }
                
                if (valA < valB) return -1;
                if (valA > valB) return 1;
                return 0;
            });
        }

        return projects;
    },

    /**
     * 根据签约日期计算各阶段时间
     * @param {string} contractDate - 签约日期
     * @returns {Object} 生命周期各阶段时间
     */
    calculateStageDates(contractDate) {
        const date = new Date(contractDate);
        
        return {
            tracking: {
                startDate: formatDate(addDays(date, -30)),
                endDate: formatDate(addDays(date, -1)),
                status: 'completed'
            },
            contract: {
                startDate: formatDate(date),
                endDate: formatDate(addDays(date, 30)),
                status: 'ongoing'
            },
            procedure: {
                startDate: formatDate(addDays(date, 31)),
                endDate: formatDate(addDays(date, 150)),
                status: 'pending'
            },
            construction: {
                startDate: formatDate(addDays(date, 151)),
                endDate: formatDate(addDays(date, 300)),
                status: 'pending'
            },
            operation: {
                startDate: formatDate(addDays(date, 301)),
                endDate: null,
                status: 'pending'
            }
        };
    },

    /**
     * 获取项目当前阶段
     * @param {Object} project - 项目对象
     * @returns {Object} {stage, stageName, status}
     */
    getCurrentStage(project) {
        const stages = ['tracking', 'contract', 'procedure', 'construction', 'operation'];
        const now = new Date();

        for (const stageKey of stages) {
            const stage = project.lifecycle?.[stageKey];
            if (stage) {
                const endDate = stage.endDate ? new Date(stage.endDate) : null;
                const startDate = stage.startDate ? new Date(stage.startDate) : null;

                if (startDate && now >= startDate && (!endDate || now <= endDate)) {
                    return {
                        stage: stageKey,
                        stageName: STAGE_NAMES[stageKey],
                        status: stage.status || 'ongoing',
                        startDate: stage.startDate,
                        endDate: stage.endDate,
                        leaderId: stage.leaderId
                    };
                }
            }
        }

        // 如果所有阶段都已完成，返回最后一个阶段
        const lastStage = stages[stages.length - 1];
        return {
            stage: lastStage,
            stageName: STAGE_NAMES[lastStage],
            status: 'completed'
        };
    },

    /**
     * 更新人员项目链接
     * @param {Object} project - 项目对象
     */
    updatePersonnelProjectLinks(project) {
        const stages = project.lifecycle || {};
        const leaderIds = new Set();

        // 收集所有阶段的牵头人
        Object.values(stages).forEach(stage => {
            if (stage?.leaderId) {
                leaderIds.add(stage.leaderId);
            }
        });

        // 更新人员的当前项目列表
        leaderIds.forEach(personId => {
            dataStore.updatePersonnelProjects(personId, project.id, 'add');
        });
    },

    /**
     * 按阶段筛选项目
     * @param {string} stage - 阶段key
     * @returns {Array} 项目列表
     */
    getProjectsByStage(stage) {
        return this.getProjects({
            filter: p => {
                const currentStage = this.getCurrentStage(p);
                return currentStage.stage === stage;
            }
        });
    },

    /**
     * 获取项目统计
     * @returns {Object} 统计数据
     */
    getStatistics() {
        const projects = dataStore.getAllProjects();
        const stats = {
            total: projects.length,
            byStage: {},
            byProvince: {},
            byProcess: {},
            totalCapacity: 0,
            totalDailyOutput: 0
        };

        // 初始化各阶段统计
        Object.keys(STAGE_NAMES).forEach(key => {
            stats.byStage[key] = 0;
        });

        projects.forEach(project => {
            // 按阶段统计
            const currentStage = this.getCurrentStage(project);
            stats.byStage[currentStage.stage]++;

            // 按省份统计
            const province = project.location?.province || '未知';
            stats.byProvince[province] = (stats.byProvince[province] || 0) + 1;

            // 按工艺统计
            const process = project.scale?.processType || 'unknown';
            stats.byProcess[process] = (stats.byProcess[process] || 0) + 1;

            // 累计规模
            if (project.scale?.designCapacity) {
                stats.totalCapacity += project.scale.designCapacity;
            }
            if (project.scale?.dailyOutput) {
                stats.totalDailyOutput += project.scale.dailyOutput;
            }
        });

        return stats;
    },

    /**
     * 搜索项目
     * @param {string} keyword - 关键词
     * @returns {Array} 匹配的项目列表
     */
    searchProjects(keyword) {
        const lowerKeyword = keyword.toLowerCase();
        return this.getProjects({
            filter: p => {
                return (
                    p.name?.toLowerCase().includes(lowerKeyword) ||
                    p.location?.province?.includes(keyword) ||
                    p.location?.city?.includes(keyword) ||
                    p.location?.district?.includes(keyword) ||
                    p.location?.address?.includes(keyword)
                );
            }
        });
    },

    /**
     * 获取嵌套对象值
     * @param {Object} obj - 对象
     * @param {string} path - 路径，如 'location.province'
     * @returns {*} 值
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current?.[key];
        }, obj);
    }
};
