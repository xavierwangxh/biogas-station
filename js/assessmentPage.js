/**
 * 人员负荷评估页面逻辑
 * 从 personnel-assessment.html 分离出来，确保全局变量可用
 */

const assessmentModule = {
    assessments: [],
    initialized: false,

    /**
     * 初始化
     */
    init() {
        console.log('[Assessment] 初始化评估页面...');
        
        if (this.initialized) {
            console.log('[Assessment] 已经初始化过，跳过');
            // 仍然运行评估以更新数据
            this.runAssessment();
            return;
        }
        
        // 尝试初始化日期选择器（带重试机制）
        if (!this.initDateInputs()) {
            console.warn('[Assessment] 日期输入框未找到，100ms后重试...');
            setTimeout(() => this.init(), 100);
            return;
        }
        
        this.initialized = true;
        
        // 运行评估
        setTimeout(() => {
            this.runAssessment();
        }, 100);
        
        console.log('[Assessment] 初始化完成');
    },

    /**
     * 初始化日期输入框
     * @returns {boolean} 是否成功
     */
    initDateInputs() {
        const dateInput = document.getElementById('assess-date');
        
        if (!dateInput) {
            console.warn('[Assessment] 日期输入框未找到');
            return false;
        }
        
        // 设置默认日期为今天
        const today = new Date();
        dateInput.value = formatDate(today);
        
        console.log('[Assessment] 日期输入框初始化完成:', dateInput.value);
        
        return true;
    },

    /**
     * 运行评估
     */
    runAssessment() {
        console.log('[Assessment] 开始运行评估...');
        
        const dateInput = document.getElementById('assess-date');
        const assessDate = dateInput ? dateInput.value : '';
        
        console.log('[Assessment] 评估日:', assessDate);
        
        if (!assessDate) {
            console.error('[Assessment] 日期未设置');
            showToast('请选择评估日', 'error');
            return;
        }
        
        // 检查数据源
        if (typeof dataStore === 'undefined') {
            console.error('[Assessment] dataStore 未定义');
            showToast('数据存储模块未加载', 'error');
            return;
        }
        
        const personnel = dataStore.getAllPersonnel();
        console.log('[Assessment] 获取人员数量:', personnel.length);
        
        this.assessments = this.calculateAssessments(assessDate);
        console.log('[Assessment] 评估结果数量:', this.assessments.length);
        
        this.renderOverview();
        this.renderTable();
        this.renderCharts();
        this.renderSkillMatchDetails();
        
        console.log('[Assessment] 评估完成');
    },

    /**
     * 计算评估结果
     * 健康度评分体系（加权）：
     * - 工作饱和度 = 评估时间点该人牵头项目数 / 最大可承担项目数
     * - 技能匹配度 = 该人熟悉技能 / 评估时间点负责项目所需总技能
     * - 最远距离倍数 = 最大距离 / 300km（单人项目默认150km）
     * - 健康度 = 工作饱和度*60% + 技能匹配度*20% + 最远距离倍数*20%
     * - 分级：<60% 轻松、60-80% 适中、80-100% 忙碌、>100% 超负荷
     */
    calculateAssessments(assessDate) {
        // 获取部门筛选条件
        const departmentFilter = this.getSelectedDepartment();
        
        let personnel = dataStore.getAllPersonnel();
        
        // 按部门筛选
        if (departmentFilter !== 'all') {
            personnel = personnel.filter(p => p.department === departmentFilter);
        }
        
        const allProjects = dataStore.getAllProjects();
        const assessments = [];
        
        const REFERENCE_DISTANCE = 300; // 参考距离300km
        const DEFAULT_DISTANCE = 150; // 单人项目默认距离150km
        
        personnel.forEach(person => {
            // 获取该人员在评估日作为牵头人的项目
            const projectsInPeriod = this.getPersonnelProjectsOnDate(person, assessDate, allProjects);
            const projectCount = projectsInPeriod.length;
            const maxProjects = person.maxProjects || 3;
            
            // 计算因子1：工作饱和度 = 项目数/上限
            const workloadFactor = Math.min(1, projectCount / maxProjects);
            
            // 计算因子2：技能匹配度 = 匹配技能数/项目所需总技能数
            let skillMatchFactor = 1;
            if (projectCount > 0) {
                const skillMatchResult = this.calculateSkillMatchV2(person, projectsInPeriod);
                skillMatchFactor = skillMatchResult.factor; // 已经是匹配比例
            }
            
            // 计算因子3：最远距离倍数 = 最大距离/300km
            // 如果一个人没有负责两个或以上项目，最大距离默认为150km
            let maxDistance = DEFAULT_DISTANCE;
            if (projectCount >= 2) {
                maxDistance = this.calculateMaxDistance(projectsInPeriod);
            }
            const distanceFactor = Math.min(1, maxDistance / REFERENCE_DISTANCE);
            
            // 计算健康度 = 加权平均值（工作饱和度60% + 技能匹配度20% + 最远距离倍数20%）
            const healthScore = Math.round(
                (workloadFactor * 0.6 + skillMatchFactor * 0.2 + distanceFactor * 0.2) * 100
            );
            
            // 确定健康度状态
            let healthStatus = '轻松';
            if (healthScore >= 100) healthStatus = '超负荷';
            else if (healthScore >= 80) healthStatus = '忙碌';
            else if (healthScore >= 60) healthStatus = '适中';
            
            // 收集警告和建议
            const warnings = [];
            const suggestions = [];
            
            // 检查单因子异常（<60% 或 >90%）
            // 工作饱和度检查
            if (workloadFactor < 0.6) {
                suggestions.push(`工作饱和度${Math.round(workloadFactor * 100)}%偏低，可适当增加项目`);
            } else if (workloadFactor > 0.9) {
                suggestions.push(`工作饱和度${Math.round(workloadFactor * 100)}%过高，建议减少项目或调整上限`);
            }
            
            // 技能匹配度检查
            if (skillMatchFactor < 0.6) {
                suggestions.push(`技能匹配度${Math.round(skillMatchFactor * 100)}%偏低，建议安排技能培训`);
            }
            
            // 最远距离检查
            if (distanceFactor > 0.6) {
                suggestions.push(`最远距离${Math.round(maxDistance)}km过远，建议优化项目分配`);
            }
            
            // 项目数量过载检查（>5个项目）
            if (projectCount > 5) {
                warnings.push({ type: 'overload', message: `负责${projectCount}个项目，超过5个上限` });
            }
            
            // 距离过远检查（>300km）
            if (maxDistance > 300) {
                warnings.push({ type: 'distance', message: `最远距离${Math.round(maxDistance)}km，超过300km` });
            }
            
            const assessment = {
                person: person,
                projectsInPeriod: projectsInPeriod,
                projectCount: projectCount,
                maxProjects: maxProjects,
                skillMatch: Math.round(skillMatchFactor * 100), // 显示为匹配度百分比
                maxDistance: Math.round(maxDistance),
                healthScore: healthScore,
                healthStatus: healthStatus,
                // 三个因子详情
                factors: {
                    workload: Math.round(workloadFactor * 100),
                    skill: Math.round(skillMatchFactor * 100),
                    distance: Math.round(distanceFactor * 100)
                },
                warnings: warnings,
                suggestions: suggestions
            };
            
            assessments.push(assessment);
        });
        
        return assessments;
    },

    /**
     * 获取选中的部门
     */
    getSelectedDepartment() {
        const select = document.getElementById('assess-department');
        return select ? select.value : 'all';
    },

    /**
     * 部门选择变化处理
     */
    onDepartmentChange() {
        console.log('[Assessment] 部门选择变化');
        this.runAssessment();
    },

    /**
     * 获取当前排序方式
     */
    getCurrentSort() {
        const select = document.getElementById('assess-sort');
        return select ? select.value : 'health-desc';
    },

    /**
     * 排序变化处理
     */
    onSortChange() {
        console.log('[Assessment] 排序方式变化');
        this.renderTable();
        this.renderCharts();
    },
    
    /**
     * 获取距离阈值
     * @returns {number} 距离阈值（公里）
     */
    getDistanceThreshold() {
        const input = document.getElementById('distance-threshold');
        const threshold = input ? parseInt(input.value) : 150;
        return isNaN(threshold) || threshold <= 0 ? 150 : threshold;
    },
    
    /**
     * 计算人员工作负荷
     * @param {Object} person - 人员对象
     * @param {Array} projects - 项目列表
     * @returns {Object} 负荷信息 {percent, status}
     */
    calculatePersonWorkload(person, projects) {
        if (!projects || projects.length === 0) {
            return { percent: 0, status: '空闲' };
        }
        
        const maxProjects = person.maxProjects || 3;
        
        // 根据阶段计算工作量权重
        let totalWorkload = 0;
        projects.forEach(project => {
            const currentStage = projectManager.getCurrentStage(project);
            const weights = {
                tracking: 0.3,
                contract: 0.5,
                procedure: 0.8,
                construction: 1.0,
                operation: 0.4
            };
            totalWorkload += weights[currentStage.stage] || 0.5;
        });
        
        const percent = Math.round((totalWorkload / maxProjects) * 100);
        
        let status = '轻松';
        if (percent >= 100) status = '超负荷';
        else if (percent >= 80) status = '忙碌';
        else if (percent >= 60) status = '适中';
        
        return { percent, status };
    },

    /**
     * 获取人员在指定日期作为牵头人的项目
     * 从所有项目中查找该人员在指定日期作为阶段牵头人的项目
     */
    getPersonnelProjectsOnDate(person, assessDate, allProjects) {
        const checkDate = new Date(assessDate);
        const personId = person.id;
        
        console.log(`[Assessment] 查找人员 ${person.name}(${personId}) 在 ${assessDate} 负责的项目`);
        
        const projects = allProjects.filter(project => {
            if (!project || !project.lifecycle) {
                console.log(`[Assessment] 项目 ${project?.name} 没有生命周期数据`);
                return false;
            }
            
            // 检查项目的各个阶段
            const stages = project.lifecycle;
            for (const [stageKey, stage] of Object.entries(stages)) {
                if (!stage || !stage.startDate) continue;
                
                const stageStart = new Date(stage.startDate);
                const stageEnd = stage.endDate ? new Date(stage.endDate) : new Date('2099-12-31');
                
                // 检查人员在当前阶段是否为牵头人
                if (stage.leaderId !== personId) continue;
                
                // 检查评估日期是否在阶段时间范围内
                if (checkDate >= stageStart && checkDate <= stageEnd) {
                    console.log(`[Assessment] 找到匹配: 项目=${project.name}, 阶段=${stageKey}, leaderId=${stage.leaderId}`);
                    return true;
                }
            }
            return false;
        });
        
        console.log(`[Assessment] 人员 ${person.name} 找到 ${projects.length} 个项目`);
        return projects;
    },

    /**
     * 计算技能匹配度（新版）
     * 技能匹配度 = 该人熟悉技能数 / 项目所需总技能数
     * 返回匹配度比例（越高表示匹配度越好）
     */
    calculateSkillMatchV2(person, projects) {
        const personSkills = new Set([
            ...(person.experience?.processes || []),
            ...(person.customSkills || [])
        ]);
        
        // 收集所有项目所需的总技能
        const allProjectSkills = new Set();
        projects.forEach(project => {
            const projectProcesses = project.scale?.processes || [project.scale?.processType].filter(Boolean);
            projectProcesses.forEach(proc => allProjectSkills.add(proc));
        });
        
        if (allProjectSkills.size === 0) {
            return { factor: 1, match: 100 }; // 项目无技能需求，完全匹配
        }
        
        if (personSkills.size === 0) {
            return { factor: 0, match: 0 }; // 人员无技能，完全不匹配
        }
        
        // 计算人员熟悉技能占项目所需技能的比例
        let matchedSkills = 0;
        allProjectSkills.forEach(skill => {
            if (personSkills.has(skill)) matchedSkills++;
        });
        
        // 技能匹配度 = 匹配技能数 / 项目所需总技能数
        const skillFactor = matchedSkills / allProjectSkills.size;
        const skillMatchPercent = Math.round(skillFactor * 100);
        
        console.log(`[Assessment] 技能匹配: 人员技能=[${Array.from(personSkills).join(',')}], 项目技能=[${Array.from(allProjectSkills).join(',')}], 匹配=${matchedSkills}/${allProjectSkills.size}, factor=${skillFactor.toFixed(2)}`);
        
        return { factor: skillFactor, match: skillMatchPercent };
    },

    /**
     * 计算项目间最远距离
     * @param {Array} projects - 项目列表
     * @returns {number} 最远距离（公里）
     */
    calculateMaxDistance(projects) {
        console.log('[Assessment] 计算最远距离, 项目数:', projects.length);
        
        let maxDistance = 0;
        
        for (let i = 0; i < projects.length; i++) {
            for (let j = i + 1; j < projects.length; j++) {
                const p1 = projects[i];
                const p2 = projects[j];
                
                // 获取坐标（支持多种属性名）
                const lat1 = p1.location?.latitude || p1.location?.lat || 0;
                const lng1 = p1.location?.longitude || p1.location?.lng || p1.location?.long || 0;
                const lat2 = p2.location?.latitude || p2.location?.lat || 0;
                const lng2 = p2.location?.longitude || p2.location?.lng || p2.location?.long || 0;
                
                // 过滤无效坐标
                if (!lat1 || !lng1 || !lat2 || !lng2 || 
                    lat1 === 0 || lng1 === 0 || lat2 === 0 || lng2 === 0) {
                    console.warn('[Assessment] 项目坐标无效:', 
                        p1.name, {lat: lat1, lng: lng1}, 
                        p2.name, {lat: lat2, lng: lng2});
                    continue;
                }
                
                const dist = calculateDistance(lat1, lng1, lat2, lng2);
                console.log('[Assessment] 距离计算:', p1.name, '-', p2.name, '=', Math.round(dist), 'km');
                maxDistance = Math.max(maxDistance, dist);
            }
        }
        
        console.log('[Assessment] 最远距离:', Math.round(maxDistance), 'km');
        return maxDistance;
    },

    /**
     * 计算健康度评分
     */
    calculateHealthScore(assessment, person) {
        // 基础分100
        let score = 100;
        
        // 负荷百分比影响（核心因素）
        const workloadPercent = assessment.workloadPercent;
        if (workloadPercent >= 100) {
            score -= (workloadPercent - 100) * 0.5 + 20;  // 超负荷惩罚
        } else if (workloadPercent >= 80) {
            score -= (workloadPercent - 80) * 0.3;  // 高负荷惩罚
        }
        
        // 技能匹配度加分/减分
        score += (assessment.skillMatch - 70) * 0.2;
        
        // 距离惩罚（使用用户设置的阈值）
        const distanceThreshold = this.getDistanceThreshold();
        if (assessment.maxDistance > distanceThreshold) {
            score -= 15;  // 超过阈值惩罚
        } else if (assessment.maxDistance > distanceThreshold * 0.7) {
            score -= 5;   // 接近阈值警告
        }
        
        // 限制在0-100范围内
        return Math.max(0, Math.min(100, Math.round(score)));
    },

    /**
     * 渲染概览
     */
    renderOverview() {
        const totalEl = document.getElementById('total-personnel');
        const overloadEl = document.getElementById('overload-count');
        const distanceEl = document.getElementById('distance-alert-count');
        const healthEl = document.getElementById('avg-health-score');
        
        if (totalEl) totalEl.textContent = this.assessments.length;
        
        // 项目过载人数（>5个项目）
        const overloadCount = this.assessments.filter(a => a.projectCount > 5).length;
        if (overloadEl) overloadEl.textContent = overloadCount;
        
        // 距离过远人数（>300km）
        const distanceAlertCount = this.assessments.filter(a => a.maxDistance > 300).length;
        if (distanceEl) distanceEl.textContent = distanceAlertCount;
        
        // 平均健康度
        const avgHealth = this.assessments.length > 0 
            ? Math.round(this.assessments.reduce((sum, a) => sum + a.healthScore, 0) / this.assessments.length)
            : 0;
        if (healthEl) healthEl.textContent = avgHealth + '%';
        
        console.log('[Assessment] 概览已更新:', {
            total: this.assessments.length,
            overload: overloadCount,
            distance: distanceAlertCount,
            avgHealth: avgHealth
        });
    },

    /**
     * 渲染评估表格
     */
    renderTable() {
        const tbody = document.getElementById('assessment-table-body');
        if (!tbody) {
            console.warn('[Assessment] 表格body未找到');
            return;
        }
        
        if (this.assessments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-8 text-gray-500">暂无评估数据</td>
                </tr>
            `;
            return;
        }
        
        // 获取排序方式
        const sortType = this.getCurrentSort();
        
        // 按选择的排序方式排序
        const sortedAssessments = [...this.assessments].sort((a, b) => {
            switch (sortType) {
                case 'health-desc': // 健康度高→低
                    return b.healthScore - a.healthScore;
                case 'health-asc': // 健康度低→高
                    return a.healthScore - b.healthScore;
                case 'workload-desc': // 工作饱和度高→低
                    return b.factors.workload - a.factors.workload;
                case 'workload-asc': // 工作饱和度低→高
                    return a.factors.workload - b.factors.workload;
                case 'skill-desc': // 技能匹配度高→低
                    return b.skillMatch - a.skillMatch;
                case 'skill-asc': // 技能匹配度低→高
                    return a.skillMatch - b.skillMatch;
                case 'distance-desc': // 最远距离远→近
                    return b.maxDistance - a.maxDistance;
                case 'distance-asc': // 最远距离近→远
                    return a.maxDistance - b.maxDistance;
                default:
                    return b.healthScore - a.healthScore; // 默认健康度高→低
            }
        });
        
        tbody.innerHTML = sortedAssessments.map(assessment => {
            const person = assessment.person;
            const projectCount = assessment.projectCount;
            
            // 项目数量样式（>5个为红色）
            const projectCountClass = projectCount > 5 ? 'text-red-600 font-bold' : 'text-gray-700';
            
            // 技能匹配度样式
            const skillMatchClass = assessment.skillMatch < 60 ? 'text-red-600' :
                                   assessment.skillMatch < 80 ? 'text-yellow-600' : 'text-green-600';
            
            // 最远距离样式（>300km为黄色警告）
            const distanceClass = assessment.maxDistance > 300 ? 'text-yellow-600 font-bold' : 'text-gray-700';
            
            // 健康度评分样式（根据新分级：<60%轻松绿色、60-80%适中蓝色、80-100%忙碌黄色、>100%超负荷红色）
            let healthClass = 'bg-green-100 text-green-800';
            let healthLabel = '轻松';
            if (assessment.healthScore >= 100) {
                healthClass = 'bg-red-100 text-red-800';
                healthLabel = '超负荷';
            } else if (assessment.healthScore >= 80) {
                healthClass = 'bg-yellow-100 text-yellow-800';
                healthLabel = '忙碌';
            } else if (assessment.healthScore >= 60) {
                healthClass = 'bg-blue-100 text-blue-800';
                healthLabel = '适中';
            }
            
            // 建议文本（优先显示单因子异常建议）
            let suggestion = '配置合理';
            if (assessment.suggestions.length > 0) {
                suggestion = assessment.suggestions.join('；');
            } else if (assessment.warnings.length > 0) {
                suggestion = assessment.warnings.map(w => w.message).join('；');
            }
            
            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3">
                        <div class="font-medium">${person.name}</div>
                        <div class="text-xs text-gray-500">${person.position || '无职位'}</div>
                    </td>
                    <td class="px-4 py-3 text-gray-600">${person.department || '无部门'}</td>
                    <td class="px-4 py-3 text-center">
                        <span class="${projectCountClass}">${projectCount}个</span>
                        <span class="text-xs text-gray-500">/ 上限${assessment.maxProjects}</span>
                    </td>
                    <td class="px-4 py-3 text-center ${skillMatchClass}">${assessment.skillMatch}%</td>
                    <td class="px-4 py-3 text-center ${distanceClass}">
                        ${assessment.maxDistance > 0 ? assessment.maxDistance + 'km' : '-'}
                    </td>
                    <td class="px-4 py-3 text-center">
                        <span class="px-2 py-1 rounded-full text-xs font-medium ${healthClass}">
                            ${assessment.healthScore}% (${healthLabel})
                        </span>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600 max-w-xs" title="工作饱和度:${assessment.factors.workload}%, 技能匹配:${assessment.factors.skill}%, 距离因子:${assessment.factors.distance}%">${suggestion}</td>
                </tr>
            `;
        }).join('');
    },

    /**
     * 渲染图表
     */
    renderCharts() {
        this.renderProjectLoadChart();
        this.renderHealthScoreChart();
    },

    /**
     * 渲染项目数量分布图表
     */
    renderProjectLoadChart() {
        const chartDom = document.getElementById('project-load-chart');
        if (!chartDom) {
            console.warn('[Assessment] 项目数量图表容器未找到');
            return;
        }
        
        // 检查ECharts
        if (typeof echarts === 'undefined') {
            console.error('[Assessment] ECharts未加载');
            chartDom.innerHTML = '<p class="text-red-500 text-center py-12">图表库未加载</p>';
            return;
        }
        
        try {
            const chart = echarts.init(chartDom);
            
            const data = this.assessments.map(a => ({
                name: a.person.name,
                value: a.projectCount,
                maxProjects: a.maxProjects,
                healthScore: a.healthScore
            }));
            
            const option = {
                tooltip: {
                    trigger: 'axis',
                    formatter: function(params) {
                        const d = params[0].data;
                        return `${d.name}<br/>项目数: ${d.value}个<br/>上限: ${d.maxProjects}<br/>健康度: ${d.healthScore}%`;
                    }
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: data.map(d => d.name),
                    axisLabel: { rotate: 45, fontSize: 10 }
                },
                yAxis: {
                    type: 'value',
                    name: '项目数量',
                    minInterval: 1
                },
                series: [
                    {
                        name: '项目数量',
                        type: 'bar',
                        data: data.map(d => ({
                            value: d.value,
                            name: d.name,
                            maxProjects: d.maxProjects,
                            healthScore: d.healthScore,
                            itemStyle: {
                                color: d.value > 5 ? '#ef4444' :   // >5个项目红色
                                       d.value > 3 ? '#f59e0b' :    // >3个项目黄色
                                       '#10b981'                     // ≤3个项目绿色
                            }
                        })),
                        markLine: {
                            silent: true,
                            data: [
                                { yAxis: 5, name: '过载线', lineStyle: { color: '#ef4444', type: 'dashed' }, label: { formatter: '>5个过载' } }
                            ]
                        }
                    }
                ]
            };
            
            chart.setOption(option);
            console.log('[Assessment] 项目数量图表已渲染');
        } catch (e) {
            console.error('[Assessment] 渲染项目数量图表失败:', e);
        }
    },

    /**
     * 渲染健康度评分分布图表
     * 新分级体系：<60% 轻松、60-80% 适中、80-100% 忙碌、>100% 超负荷
     */
    renderHealthScoreChart() {
        const chartDom = document.getElementById('health-score-chart');
        if (!chartDom) {
            console.warn('[Assessment] 健康度图表容器未找到');
            return;
        }
        
        // 检查ECharts
        if (typeof echarts === 'undefined') {
            console.error('[Assessment] ECharts未加载');
            chartDom.innerHTML = '<p class="text-red-500 text-center py-12">图表库未加载</p>';
            return;
        }
        
        try {
            const chart = echarts.init(chartDom);
            
            // 按新评分区间分组
            const ranges = {
                '轻松(<60%)': 0,
                '适中(60-80%)': 0,
                '忙碌(80-100%)': 0,
                '超负荷(>100%)': 0
            };
            
            this.assessments.forEach(a => {
                if (a.healthScore >= 100) ranges['超负荷(>100%)']++;
                else if (a.healthScore >= 80) ranges['忙碌(80-100%)']++;
                else if (a.healthScore >= 60) ranges['适中(60-80%)']++;
                else ranges['轻松(<60%)']++;
            });
            
            const option = {
                tooltip: {
                    trigger: 'item',
                    formatter: '{b}: {c}人 ({d}%)'
                },
                legend: {
                    bottom: 0
                },
                series: [{
                    type: 'pie',
                    radius: ['40%', '70%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: true,
                        formatter: '{b}\n{c}人'
                    },
                    data: [
                        { value: ranges['轻松(<60%)'], name: '轻松(<60%)', itemStyle: { color: '#10b981' } },
                        { value: ranges['适中(60-80%)'], name: '适中(60-80%)', itemStyle: { color: '#3b82f6' } },
                        { value: ranges['忙碌(80-100%)'], name: '忙碌(80-100%)', itemStyle: { color: '#f59e0b' } },
                        { value: ranges['超负荷(>100%)'], name: '超负荷(>100%)', itemStyle: { color: '#ef4444' } }
                    ]
                }]
            };
            
            chart.setOption(option);
            console.log('[Assessment] 健康度图表已渲染');
        } catch (e) {
            console.error('[Assessment] 渲染健康度图表失败:', e);
        }
    },

    /**
     * 渲染技能匹配度详情
     */
    renderSkillMatchDetails() {
        const container = document.getElementById('skill-match-details');
        if (!container) {
            console.warn('[Assessment] 技能匹配详情容器未找到');
            return;
        }
        
        // 找出技能匹配度较低的人员（skillMatch < 60%）
        const lowMatchAssessments = this.assessments
            .filter(a => a.skillMatch < 60 && a.projectsInPeriod.length > 0)
            .sort((a, b) => a.skillMatch - b.skillMatch);
        
        if (lowMatchAssessments.length === 0) {
            container.innerHTML = '<p class="text-gray-500">所有人员技能匹配度良好</p>';
            return;
        }
        
        container.innerHTML = lowMatchAssessments.slice(0, 5).map(assessment => {
            const person = assessment.person;
            const personSkills = [
                ...(person.experience?.processes || []),
                ...(person.customSkills || [])
            ].map(s => PROCESS_TYPES[s] || s).join(', ') || '暂无技能记录';
            
            const projectSkills = [];
            assessment.projectsInPeriod.forEach(p => {
                const procs = p.scale?.processes || [p.scale?.processType].filter(Boolean);
                procs.forEach(proc => {
                    if (!projectSkills.includes(proc)) projectSkills.push(proc);
                });
            });
            const projectSkillsStr = projectSkills.map(s => PROCESS_TYPES[s] || s).join(', ');
            
            return `
                <div class="flex items-start gap-4 p-4 bg-red-50 rounded-lg">
                    <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-exclamation-triangle text-red-600"></i>
                    </div>
                    <div class="flex-1">
                        <div class="font-medium">${person.name} - 技能匹配度 ${assessment.skillMatch}%</div>
                        <div class="text-sm text-gray-600 mt-1">
                            <span class="text-red-600">人员技能:</span> ${personSkills}
                        </div>
                        <div class="text-sm text-gray-600">
                            <span class="text-blue-600">项目需求:</span> ${projectSkillsStr}
                        </div>
                        <div class="text-sm text-red-600 mt-1"><i class="fas fa-lightbulb mr-1"></i>建议: 安排技能培训或调整项目分配</div>
                    </div>
                </div>
            `;
        }).join('');
    }
};

console.log('[Assessment] assessmentModule 已加载');
