/**
 * 人员管理模块
 * 处理人员的创建、更新、查询、能力评估等
 */

const personnelManager = {
    /**
     * 创建新人员
     * @param {Object} data - 人员数据
     * @returns {Object} 创建结果
     */
    createPersonnel(data) {
        const validation = validatePersonnel(data);
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }

        // 初始化当前项目列表
        data.currentProjects = data.currentProjects || [];

        const person = dataStore.savePersonnel(data);
        return { success: true, person };
    },

    /**
     * 更新人员
     * @param {string} id - 人员ID
     * @param {Object} data - 更新数据
     * @returns {Object} 更新结果
     */
    updatePersonnel(id, data) {
        const existing = dataStore.getPersonnel(id);
        if (!existing) {
            return { success: false, errors: ['人员不存在'] };
        }

        const validation = validatePersonnel({ ...existing, ...data });
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }

        data.id = id;
        const person = dataStore.savePersonnel(data);
        return { success: true, person };
    },

    /**
     * 删除人员
     * @param {string} id - 人员ID
     * @returns {boolean} 是否成功
     */
    deletePersonnel(id) {
        return dataStore.deletePersonnel(id);
    },

    /**
     * 获取人员详情
     * @param {string} id - 人员ID
     * @param {boolean} withProjects - 是否包含项目详情
     * @returns {Object|null} 人员详情
     */
    getPersonnelDetail(id, withProjects = true) {
        const person = dataStore.getPersonnel(id);
        if (!person) return null;

        if (withProjects && person.currentProjects?.length > 0) {
            person.projectDetails = person.currentProjects.map(pid => {
                return dataStore.getProject(pid);
            }).filter(Boolean);
        }

        return person;
    },

    /**
     * 获取所有人员
     * @param {Object} options - 选项
     * @returns {Array} 人员列表
     */
    getAllPersonnel(options = {}) {
        let personnel = dataStore.getAllPersonnel();

        if (options.filter) {
            personnel = personnel.filter(options.filter);
        }

        if (options.sortBy) {
            personnel.sort((a, b) => {
                let valA = a[options.sortBy];
                let valB = b[options.sortBy];
                
                if (options.sortOrder === 'desc') {
                    [valA, valB] = [valB, valA];
                }
                
                if (valA < valB) return -1;
                if (valA > valB) return 1;
                return 0;
            });
        }

        return personnel;
    },

    /**
     * 计算人员工作负荷
     * @param {string} personId - 人员ID
     * @returns {Object} 负荷信息
     */
    calculateWorkload(personId) {
        const person = this.getPersonnelDetail(personId);
        if (!person) return null;

        const projects = person.projectDetails || [];
        const maxProjects = person.maxProjects || 3;
        
        // 计算各阶段的项目数
        const stageCount = {};
        let totalWorkload = 0;

        projects.forEach(project => {
            const currentStage = projectManager.getCurrentStage(project);
            stageCount[currentStage.stage] = (stageCount[currentStage.stage] || 0) + 1;
            
            // 根据阶段计算工作量权重
            const weights = {
                tracking: 0.3,
                contract: 0.5,
                procedure: 0.8,
                construction: 1.0,
                operation: 0.4
            };
            totalWorkload += weights[currentStage.stage] || 0.5;
        });

        const workloadPercent = Math.min((totalWorkload / maxProjects) * 100, 100);
        
        return {
            currentProjects: projects.length,
            maxProjects: maxProjects,
            workloadPercent: workloadPercent,
            stageDistribution: stageCount,
            status: this.getWorkloadStatus(workloadPercent),
            isOverloaded: workloadPercent >= 90,
            availableSlots: Math.max(0, maxProjects - projects.length)
        };
    },

    /**
     * 获取负荷状态
     * @param {number} percent - 负荷百分比
     * @returns {string} 状态描述
     */
    getWorkloadStatus(percent) {
        if (percent < 50) return '轻松';
        if (percent < 70) return '适中';
        if (percent < 90) return '忙碌';
        return '超负荷';
    },

    /**
     * 检查人员在时间段内是否可用
     * @param {string} personId - 人员ID
     * @param {string} startDate - 开始日期
     * @param {string} endDate - 结束日期
     * @returns {boolean} 是否可用
     */
    checkAvailability(personId, startDate, endDate) {
        const workload = this.calculateWorkload(personId);
        if (!workload) return false;

        // 如果已经超负荷，不可用
        if (workload.isOverloaded) return false;

        // 检查时间段内是否有冲突项目
        const person = this.getPersonnelDetail(personId);
        const projects = person?.projectDetails || [];

        const checkStart = new Date(startDate);
        const checkEnd = new Date(endDate);

        for (const project of projects) {
            const stages = project.lifecycle || {};
            for (const stage of Object.values(stages)) {
                if (!stage.startDate) continue;
                
                const stageStart = new Date(stage.startDate);
                const stageEnd = stage.endDate ? new Date(stage.endDate) : new Date('2099-12-31');

                // 检查时间段是否有重叠
                if (checkStart <= stageEnd && checkEnd >= stageStart) {
                    return false; // 有冲突
                }
            }
        }

        return true;
    },

    /**
     * 搜索人员
     * @param {string} keyword - 关键词
     * @returns {Array} 匹配的人员列表
     */
    searchPersonnel(keyword) {
        const lowerKeyword = keyword.toLowerCase();
        return this.getAllPersonnel({
            filter: p => {
                return (
                    p.name?.toLowerCase().includes(lowerKeyword) ||
                    p.department?.includes(keyword) ||
                    p.position?.includes(keyword) ||
                    p.experience?.processes?.some(proc => proc.includes(keyword))
                );
            }
        });
    },

    /**
     * 按工艺筛选人员
     * @param {string} processType - 工艺类型
     * @returns {Array} 人员列表
     */
    getPersonnelByProcess(processType) {
        return this.getAllPersonnel({
            filter: p => {
                return p.experience?.processes?.includes(processType);
            }
        });
    },

    /**
     * 获取可用人员（指定时间段）
     * @param {string} startDate - 开始日期
     * @param {string} endDate - 结束日期
     * @param {Object} options - 额外筛选条件
     * @returns {Array} 可用人员列表
     */
    getAvailablePersonnel(startDate, endDate, options = {}) {
        let personnel = this.getAllPersonnel();

        // 筛选可用人员
        personnel = personnel.filter(p => {
            // 基础可用性检查
            if (!this.checkAvailability(p.id, startDate, endDate)) {
                return false;
            }

            // 额外条件筛选
            if (options.processType && !p.experience?.processes?.includes(options.processType)) {
                return false;
            }

            if (options.minExperience && (p.experience?.projectCount || 0) < options.minExperience) {
                return false;
            }

            return true;
        });

        // 按经验排序
        personnel.sort((a, b) => {
            const expA = a.experience?.projectCount || 0;
            const expB = b.experience?.projectCount || 0;
            return expB - expA;
        });

        return personnel;
    },

    /**
     * 获取人员统计
     * @returns {Object} 统计数据
     */
    getStatistics() {
        const personnel = dataStore.getAllPersonnel();
        
        const stats = {
            total: personnel.length,
            byDepartment: {},
            byProcess: {},
            averageAge: 0,
            averageExperience: 0,
            workloadDistribution: {
                light: 0,      // < 50%
                moderate: 0,   // 50-70%
                busy: 0,       // 70-90%
                overloaded: 0  // >= 90%
            }
        };

        let totalAge = 0;
        let totalExp = 0;
        let ageCount = 0;
        let expCount = 0;

        personnel.forEach(person => {
            // 部门统计
            const dept = person.department || '未分配';
            stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1;

            // 工艺统计
            (person.experience?.processes || []).forEach(proc => {
                stats.byProcess[proc] = (stats.byProcess[proc] || 0) + 1;
            });

            // 平均年龄
            if (person.age) {
                totalAge += person.age;
                ageCount++;
            }

            // 平均经验
            if (person.experience?.projectCount) {
                totalExp += person.experience.projectCount;
                expCount++;
            }

            // 负荷分布
            const workload = this.calculateWorkload(person.id);
            if (workload) {
                const percent = workload.workloadPercent;
                if (percent < 50) stats.workloadDistribution.light++;
                else if (percent < 70) stats.workloadDistribution.moderate++;
                else if (percent < 90) stats.workloadDistribution.busy++;
                else stats.workloadDistribution.overloaded++;
            }
        });

        stats.averageAge = ageCount > 0 ? Math.round(totalAge / ageCount) : 0;
        stats.averageExperience = expCount > 0 ? Math.round(totalExp / expCount) : 0;

        return stats;
    },

    /**
     * 获取人员能力雷达图数据
     * @param {string} personId - 人员ID
     * @returns {Object} ECharts雷达图数据
     */
    getCapabilityRadarData(personId) {
        const person = dataStore.getPersonnel(personId);
        if (!person) return null;

        const capabilities = person.capabilities || {};
        
        return {
            indicator: [
                { name: '技术能力', max: 10 },
                { name: '管理能力', max: 10 },
                { name: '协调能力', max: 10 }
            ],
            data: [{
                value: [
                    capabilities.technical || 5,
                    capabilities.management || 5,
                    capabilities.coordination || 5
                ],
                name: person.name
            }]
        };
    },

    /**
     * 批量更新人员当前项目
     * @param {Array} updates - 更新数组 [{personId, projectId, action}]
     */
    batchUpdateProjects(updates) {
        updates.forEach(update => {
            dataStore.updatePersonnelProjects(
                update.personId,
                update.projectId,
                update.action
            );
        });
    }
};
