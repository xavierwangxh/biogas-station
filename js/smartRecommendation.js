/**
 * 智能推荐模块
 * 项目群聚合、牵头人推荐算法
 */

const smartRecommendation = {
    /**
     * 按距离聚合项目群（DBSCAN简化算法）
     * @param {number} maxDistance - 最大距离（公里）
     * @returns {Array} 项目群数组
     */
    groupProjectsByDistance(maxDistance = 150) {
        const projects = dataStore.getAllProjects().filter(p => {
            const lat = p.location?.latitude;
            const lng = p.location?.longitude;
            // 筛选有有效坐标的项目（排除 null/undefined/0）
            return lat && lng && lat !== 0 && lng !== 0;
        });
        
        console.log('[SmartRec] 有效坐标项目数:', projects.length, '总项目数:', dataStore.getAllProjects().length);

        if (projects.length === 0) return [];

        const groups = [];
        const visited = new Set();

        for (const project of projects) {
            if (visited.has(project.id)) continue;

            // 创建新群组
            const group = {
                projects: [project],
                centerPoint: null
            };
            visited.add(project.id);

            // 查找距离内的其他项目
            for (const other of projects) {
                if (visited.has(other.id)) continue;

                const distance = calculateDistance(
                    project.location.latitude,
                    project.location.longitude,
                    other.location.latitude,
                    other.location.longitude
                );

                if (distance <= maxDistance) {
                    group.projects.push(other);
                    visited.add(other.id);
                }
            }

            // 计算中心点
            group.centerPoint = calculateCenter(
                group.projects.map(p => ({
                    latitude: p.location.latitude,
                    longitude: p.location.longitude
                }))
            );

            // 计算最大半径
            let maxRadius = 0;
            group.projects.forEach(p => {
                const dist = calculateDistance(
                    group.centerPoint.latitude,
                    group.centerPoint.longitude,
                    p.location.latitude,
                    p.location.longitude
                );
                maxRadius = Math.max(maxRadius, dist);
            });
            group.radius = maxRadius;

            groups.push(group);
        }

        // 保存项目群到数据存储
        dataStore.clearProjectGroups();
        groups.forEach((group, index) => {
            dataStore.saveProjectGroup({
                name: `项目群 ${index + 1}`,
                projectIds: group.projects.map(p => p.id),
                centerPoint: group.centerPoint,
                radius: group.radius
            });
        });

        return groups;
    },

    /**
     * 推荐阶段牵头人
     * @param {string} projectId - 项目ID
     * @param {string} stage - 阶段key
     * @returns {Array} 推荐列表（按匹配度排序）
     */
    recommendLeader(projectId, stage) {
        const project = dataStore.getProject(projectId);
        if (!project) return [];

        const personnel = dataStore.getAllPersonnel();
        const recommendations = [];

        // 获取阶段时间范围
        const stageInfo = project.lifecycle?.[stage];
        const startDate = stageInfo?.startDate;
        const endDate = stageInfo?.endDate;

        for (const person of personnel) {
            // 检查可用性
            const isAvailable = startDate && endDate
                ? personnelManager.checkAvailability(person.id, startDate, endDate)
                : true;

            if (!isAvailable) continue;

            // 计算匹配度
            const score = this.calculateMatchScore(person, project, stage);

            recommendations.push({
                person: person,
                score: score.total,
                details: score.details,
                reason: this.generateReason(score.details, person, project)
            });
        }

        // 按匹配度排序
        recommendations.sort((a, b) => b.score - a.score);

        return recommendations.slice(0, 5); // 返回前5名
    },

    /**
     * 计算人员与项目的匹配度评分
     * @param {Object} person - 人员数据
     * @param {Object} project - 项目数据
     * @param {string} stage - 阶段
     * @returns {Object} 评分详情
     */
    calculateMatchScore(person, project, stage) {
        const weights = {
            processMatch: 0.25,    // 工艺匹配
            experience: 0.20,      // 经验值
            distance: 0.20,        // 距离因子
            workload: 0.20,        // 负载因子
            capability: 0.15       // 能力评分
        };

        // 1. 工艺匹配 (0-1)
        const processMatch = person.experience?.processes?.includes(project.scale?.processType) ? 1 : 0;

        // 2. 经验值 (0-1)
        const projectCount = person.experience?.projectCount || 0;
        const experience = Math.min(projectCount / 10, 1);

        // 3. 距离因子 (0-1)
        let distance = 0.5; // 默认值
        if (person.location?.latitude && project.location?.latitude) {
            const dist = calculateDistance(
                person.location.latitude,
                person.location.longitude,
                project.location.latitude,
                project.location.longitude
            );
            distance = Math.max(0, 1 - dist / 500); // 500km外为0
        }

        // 4. 负载因子 (0-1)
        const workload = personnelManager.calculateWorkload(person.id);
        const workloadFactor = workload ? (1 - workload.workloadPercent / 100) : 0.5;

        // 5. 能力评分 (0-1)
        const caps = person.capabilities || {};
        const stageCapabilityWeights = {
            tracking: { technical: 0.3, management: 0.3, coordination: 0.4 },
            contract: { technical: 0.2, management: 0.5, coordination: 0.3 },
            procedure: { technical: 0.2, management: 0.4, coordination: 0.4 },
            construction: { technical: 0.5, management: 0.3, coordination: 0.2 },
            operation: { technical: 0.6, management: 0.2, coordination: 0.2 }
        };
        const capWeights = stageCapabilityWeights[stage] || { technical: 0.33, management: 0.33, coordination: 0.34 };
        const capability = (
            (caps.technical || 5) / 10 * capWeights.technical +
            (caps.management || 5) / 10 * capWeights.management +
            (caps.coordination || 5) / 10 * capWeights.coordination
        );

        // 计算总分
        const total =
            processMatch * weights.processMatch +
            experience * weights.experience +
            distance * weights.distance +
            workloadFactor * weights.workload +
            capability * weights.capability;

        return {
            total: Math.round(total * 100),
            details: {
                processMatch: Math.round(processMatch * 100),
                experience: Math.round(experience * 100),
                distance: Math.round(distance * 100),
                workload: Math.round(workloadFactor * 100),
                capability: Math.round(capability * 100)
            }
        };
    },

    /**
     * 生成推荐理由
     * @param {Object} details - 评分详情
     * @param {Object} person - 人员数据
     * @param {Object} project - 项目数据
     * @returns {string} 推荐理由
     */
    generateReason(details, person, project) {
        const reasons = [];

        if (details.processMatch >= 100) {
            reasons.push(`熟悉${PROCESS_TYPES[project.scale?.processType]}工艺`);
        }
        if (details.experience >= 70) {
            reasons.push(`经验丰富(${person.experience?.projectCount}个项目)`);
        }
        if (details.distance >= 80) {
            reasons.push('距离较近');
        }
        if (details.workload >= 80) {
            reasons.push('工作负荷轻');
        }
        if (details.capability >= 80) {
            reasons.push('能力优秀');
        }

        if (reasons.length === 0) {
            return '综合条件匹配';
        }

        return reasons.join('，');
    },

    /**
     * 批量推荐（为项目的所有阶段推荐牵头人）
     * @param {string} projectId - 项目ID
     * @returns {Object} 各阶段推荐结果
     */
    batchRecommend(projectId) {
        const stages = ['tracking', 'contract', 'procedure', 'construction', 'operation'];
        const result = {};

        stages.forEach(stage => {
            result[stage] = {
                stageName: STAGE_NAMES[stage],
                recommendations: this.recommendLeader(projectId, stage)
            };
        });

        return result;
    },

    /**
     * 检查人员配置合理性
     * @returns {Array} 问题列表
     */
    checkPersonnelAllocation() {
        const issues = [];
        const personnel = dataStore.getAllPersonnel();
        const projects = dataStore.getAllProjects();

        personnel.forEach(person => {
            const workload = personnelManager.calculateWorkload(person.id);
            if (!workload) return;

            // 超负荷警告
            if (workload.isOverloaded) {
                issues.push({
                    type: 'overload',
                    level: 'error',
                    person: person,
                    message: `${person.name} 工作超负荷，当前负责 ${workload.currentProjects} 个项目`
                });
            } else if (workload.workloadPercent >= 80) {
                issues.push({
                    type: 'busy',
                    level: 'warning',
                    person: person,
                    message: `${person.name} 工作较忙，负荷率 ${Math.round(workload.workloadPercent)}%`
                });
            }

            // 检查项目距离过远
            const personProjects = person.currentProjects?.map(pid => 
                dataStore.getProject(pid)
            ).filter(Boolean) || [];

            if (personProjects.length >= 2 && person.location?.latitude) {
                let maxDistance = 0;
                for (let i = 0; i < personProjects.length; i++) {
                    for (let j = i + 1; j < personProjects.length; j++) {
                        const p1 = personProjects[i];
                        const p2 = personProjects[j];
                        if (p1.location?.latitude && p2.location?.latitude) {
                            const dist = calculateDistance(
                                p1.location.latitude, p1.location.longitude,
                                p2.location.latitude, p2.location.longitude
                            );
                            maxDistance = Math.max(maxDistance, dist);
                        }
                    }
                }

                if (maxDistance > 500) {
                    issues.push({
                        type: 'distance',
                        level: 'warning',
                        person: person,
                        message: `${person.name} 负责的项目间距离过远（最远 ${Math.round(maxDistance)}km）`
                    });
                }
            }
        });

        // 检查未分配阶段
        projects.forEach(project => {
            const stages = project.lifecycle || {};
            Object.entries(stages).forEach(([stageKey, stage]) => {
                if (!stage.leaderId) {
                    issues.push({
                        type: 'unassigned',
                        level: 'info',
                        project: project,
                        stage: STAGE_NAMES[stageKey],
                        message: `${project.name} 的 ${STAGE_NAMES[stageKey]} 阶段尚未分配牵头人`
                    });
                }
            });
        });

        return issues.sort((a, b) => {
            const levelOrder = { error: 0, warning: 1, info: 2 };
            return levelOrder[a.level] - levelOrder[b.level];
        });
    },

    /**
     * 获取项目群详情（含统计分析）
     * @returns {Array} 项目群详情
     */
    getProjectGroupDetails() {
        const groups = this.groupProjectsByDistance(150);
        
        return groups.map((group, index) => {
            // 统计各阶段项目数
            const stageCount = {};
            let totalCapacity = 0;
            let totalDailyOutput = 0;

            group.projects.forEach(p => {
                const stage = projectManager.getCurrentStage(p);
                stageCount[stage.stage] = (stageCount[stage.stage] || 0) + 1;
                
                if (p.scale?.designCapacity) {
                    totalCapacity += p.scale.designCapacity;
                }
                if (p.scale?.dailyOutput) {
                    totalDailyOutput += p.scale.dailyOutput;
                }
            });

            return {
                ...group,
                name: `项目群 ${index + 1}`,
                stageDistribution: stageCount,
                totalCapacity,
                totalDailyOutput,
                projectCount: group.projects.length
            };
        });
    },

    /**
     * 推荐项目群协调人
     * @param {string} groupId - 项目群ID
     * @returns {Array} 推荐列表
     */
    recommendGroupCoordinator(groupId) {
        const group = dataStore.getAllProjectGroups().find(g => g.id === groupId);
        if (!group) return [];

        const projects = group.projectIds.map(pid => dataStore.getProject(pid)).filter(Boolean);
        const processTypes = [...new Set(projects.map(p => p.scale?.processType).filter(Boolean))];
        
        // 寻找熟悉所有工艺、距离中心点最近、负荷最轻的人
        const personnel = dataStore.getAllPersonnel();
        const recommendations = [];

        for (const person of personnel) {
            const personProcessCount = person.experience?.processes?.filter(p => 
                processTypes.includes(p)
            ).length || 0;

            const processCoverage = processTypes.length > 0 
                ? personProcessCount / processTypes.length 
                : 0;

            // 计算到中心点的距离
            let distance = 0.5;
            if (person.location?.latitude && group.centerPoint) {
                const dist = calculateDistance(
                    person.location.latitude,
                    person.location.longitude,
                    group.centerPoint.latitude,
                    group.centerPoint.longitude
                );
                distance = Math.max(0, 1 - dist / 300);
            }

            const workload = personnelManager.calculateWorkload(person.id);
            const workloadFactor = workload ? (1 - workload.workloadPercent / 100) : 0.5;

            const score = processCoverage * 0.4 + distance * 0.3 + workloadFactor * 0.3;

            recommendations.push({
                person,
                score: Math.round(score * 100),
                processCoverage: Math.round(processCoverage * 100),
                details: {
                    process: Math.round(processCoverage * 100),
                    distance: Math.round(distance * 100),
                    workload: Math.round(workloadFactor * 100)
                }
            });
        }

        return recommendations.sort((a, b) => b.score - a.score).slice(0, 3);
    }
};
