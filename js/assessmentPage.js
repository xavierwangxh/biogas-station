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
        const startDateInput = document.getElementById('assess-start-date');
        const endDateInput = document.getElementById('assess-end-date');
        
        if (!startDateInput || !endDateInput) {
            console.warn('[Assessment] 日期输入框未找到:',
                'start:', !!startDateInput,
                'end:', !!endDateInput
            );
            return false;
        }
        
        // 设置默认时间范围（未来9个月）
        const today = new Date();
        const nineMonthsLater = new Date(today);
        nineMonthsLater.setMonth(nineMonthsLater.getMonth() + 9);
        
        startDateInput.value = formatDate(today);
        endDateInput.value = formatDate(nineMonthsLater);
        
        console.log('[Assessment] 日期输入框初始化完成:', {
            start: startDateInput.value,
            end: endDateInput.value
        });
        
        return true;
    },

    /**
     * 运行评估
     */
    runAssessment() {
        console.log('[Assessment] 开始运行评估...');
        
        const startDateInput = document.getElementById('assess-start-date');
        const endDateInput = document.getElementById('assess-end-date');
        
        const startDate = startDateInput ? startDateInput.value : '';
        const endDate = endDateInput ? endDateInput.value : '';
        
        console.log('[Assessment] 评估时间段:', startDate, '至', endDate);
        
        if (!startDate || !endDate) {
            console.error('[Assessment] 日期未设置');
            showToast('请选择评估时间段', 'error');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            showToast('开始日期不能晚于结束日期', 'error');
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
        
        this.assessments = this.calculateAssessments(startDate, endDate);
        console.log('[Assessment] 评估结果数量:', this.assessments.length);
        
        this.renderOverview();
        this.renderTable();
        this.renderCharts();
        this.renderSkillMatchDetails();
        
        console.log('[Assessment] 评估完成');
    },

    /**
     * 计算评估结果
     */
    calculateAssessments(startDate, endDate) {
        const personnel = dataStore.getAllPersonnel();
        const assessments = [];
        
        // 获取距离阈值（默认150km）
        const distanceThreshold = this.getDistanceThreshold();
        
        personnel.forEach(person => {
            const assessment = {
                person: person,
                // 获取该时间段内的项目
                projectsInPeriod: this.getPersonnelProjectsInPeriod(person, startDate, endDate),
                // 技能匹配度
                skillMatch: 0,
                // 最远距离
                maxDistance: 0,
                // 工作负荷百分比
                workloadPercent: 0,
                // 健康度评分
                healthScore: 0,
                // 警告标志
                warnings: []
            };
            
            // 计算工作负荷百分比（核心指标）
            const workload = this.calculatePersonWorkload(person, assessment.projectsInPeriod);
            assessment.workloadPercent = workload.percent;
            assessment.workloadStatus = workload.status;
            
            // 基于负荷百分比进行警告
            if (assessment.workloadPercent >= 100) {
                assessment.warnings.push({ 
                    type: 'overload', 
                    message: `负荷${Math.round(assessment.workloadPercent)}%，已超负荷运行` 
                });
            } else if (assessment.workloadPercent >= 80) {
                assessment.warnings.push({ 
                    type: 'heavy', 
                    message: `负荷${Math.round(assessment.workloadPercent)}%，接近上限` 
                });
            }
            
            // 计算技能匹配度
            if (assessment.projectsInPeriod.length > 0) {
                assessment.skillMatch = this.calculateSkillMatch(person, assessment.projectsInPeriod);
            }
            
            // 计算项目间最远距离
            if (assessment.projectsInPeriod.length >= 2) {
                assessment.maxDistance = this.calculateMaxDistance(assessment.projectsInPeriod);
                if (assessment.maxDistance > distanceThreshold) {
                    assessment.warnings.push({ 
                        type: 'distance', 
                        message: `最远距离${Math.round(assessment.maxDistance)}km，超过${distanceThreshold}km阈值` 
                    });
                }
            }
            
            // 计算健康度评分
            assessment.healthScore = this.calculateHealthScore(assessment, person);
            
            assessments.push(assessment);
        });
        
        return assessments;
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
     * 获取人员在指定时间段内的项目
     */
    getPersonnelProjectsInPeriod(person, startDate, endDate) {
        if (!person.currentProjects || person.currentProjects.length === 0) {
            return [];
        }
        
        const checkStart = new Date(startDate);
        const checkEnd = new Date(endDate);
        
        return person.currentProjects.map(pid => dataStore.getProject(pid))
            .filter(project => {
                if (!project || !project.lifecycle) return false;
                
                // 检查是否有任何阶段与时间段重叠
                const stages = project.lifecycle;
                for (const stage of Object.values(stages)) {
                    if (!stage || !stage.startDate) continue;
                    
                    const stageStart = new Date(stage.startDate);
                    const stageEnd = stage.endDate ? new Date(stage.endDate) : new Date('2099-12-31');
                    
                    // 检查人员在当前阶段是否为牵头人
                    if (stage.leaderId !== person.id) continue;
                    
                    // 检查时间段是否重叠
                    if (checkStart <= stageEnd && checkEnd >= stageStart) {
                        return true;
                    }
                }
                return false;
            });
    },

    /**
     * 计算技能匹配度
     */
    calculateSkillMatch(person, projects) {
        const personSkills = new Set([
            ...(person.experience?.processes || []),
            ...(person.customSkills || [])
        ]);
        
        if (personSkills.size === 0) return 50; // 无技能记录，默认50%
        
        let totalMatch = 0;
        
        projects.forEach(project => {
            const projectProcesses = project.scale?.processes || [project.scale?.processType].filter(Boolean);
            if (projectProcesses.length === 0) {
                totalMatch += 100;
                return;
            }
            
            let matched = 0;
            projectProcesses.forEach(proc => {
                if (personSkills.has(proc)) matched++;
            });
            
            totalMatch += (matched / projectProcesses.length) * 100;
        });
        
        return Math.round(totalMatch / projects.length);
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
        
        const overloadCount = this.assessments.filter(a => 
            a.warnings.some(w => w.type === 'overload')
        ).length;
        if (overloadEl) overloadEl.textContent = overloadCount;
        
        const distanceAlertCount = this.assessments.filter(a => 
            a.warnings.some(w => w.type === 'distance')
        ).length;
        if (distanceEl) distanceEl.textContent = distanceAlertCount;
        
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
        
        // 按健康度评分排序（低的在前）
        const sortedAssessments = [...this.assessments].sort((a, b) => a.healthScore - b.healthScore);
        
        tbody.innerHTML = sortedAssessments.map(assessment => {
            const person = assessment.person;
            const projectCount = assessment.projectsInPeriod.length;
            
            // 负荷百分比样式（核心指标）
            const workloadPercent = assessment.workloadPercent;
            const workloadClass = workloadPercent >= 100 ? 'text-red-600 font-bold' : 
                                  workloadPercent >= 80 ? 'text-yellow-600 font-bold' : 
                                  workloadPercent >= 60 ? 'text-blue-600' : 'text-green-600';
            
            // 项目数量样式（次要指标）
            const projectCountClass = projectCount > 5 ? 'text-red-600' : 
                                      projectCount > 3 ? 'text-yellow-600' : 'text-gray-500';
            
            // 技能匹配度样式
            const skillMatchClass = assessment.skillMatch < 50 ? 'text-red-600' :
                                   assessment.skillMatch < 70 ? 'text-yellow-600' : 'text-green-600';
            
            // 距离样式
            const distanceThreshold = this.getDistanceThreshold();
            const distanceClass = assessment.maxDistance > distanceThreshold ? 'text-red-600 font-bold' :
                                 assessment.maxDistance > distanceThreshold * 0.7 ? 'text-yellow-600' : 'text-gray-700';
            
            // 健康度评分样式
            let healthClass = 'bg-green-100 text-green-800';
            if (assessment.healthScore < 60) healthClass = 'bg-red-100 text-red-800';
            else if (assessment.healthScore < 80) healthClass = 'bg-yellow-100 text-yellow-800';
            
            // 建议文本
            let suggestion = '配置合理';
            if (assessment.warnings.length > 0) {
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
                        <div class="${workloadClass} font-bold">${workloadPercent}%</div>
                        <div class="text-xs ${projectCountClass}">${projectCount}个项目 / 上限${person.maxProjects || 3}</div>
                    </td>
                    <td class="px-4 py-3 text-center ${skillMatchClass}">${assessment.skillMatch}%</td>
                    <td class="px-4 py-3 text-center ${distanceClass}">
                        ${assessment.maxDistance > 0 ? Math.round(assessment.maxDistance) + 'km' : '-'}
                    </td>
                    <td class="px-4 py-3 text-center">
                        <span class="px-2 py-1 rounded-full text-xs font-medium ${healthClass}">
                            ${assessment.healthScore}%
                        </span>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600 max-w-xs">${suggestion}</td>
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
     * 渲染项目负荷分布图表
     */
    renderProjectLoadChart() {
        const chartDom = document.getElementById('project-load-chart');
        if (!chartDom) {
            console.warn('[Assessment] 项目负荷图表容器未找到');
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
                value: a.workloadPercent,  // 改为负荷百分比
                projectCount: a.projectsInPeriod.length,  // 保留项目数用于tooltip
                maxProjects: a.person.maxProjects || 3
            }));
            
            const option = {
                tooltip: {
                    trigger: 'axis',
                    formatter: function(params) {
                        const d = params[0].data;
                        return `${d.name}<br/>负荷: ${d.value}%<br/>项目数: ${d.projectCount}<br/>上限: ${d.maxProjects}`;
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
                    name: '负荷百分比(%)',
                    max: 150,  // 允许超过100%显示超负荷
                    axisLabel: {
                        formatter: '{value}%'
                    }
                },
                series: [
                    {
                        name: '负荷百分比',
                        type: 'bar',
                        data: data.map(d => ({
                            value: d.value,
                            name: d.name,
                            projectCount: d.projectCount,
                            maxProjects: d.maxProjects,
                            itemStyle: {
                                color: d.value >= 100 ? '#ef4444' :   // 超负荷红色
                                       d.value >= 80 ? '#f59e0b' :    // 高负荷黄色
                                       d.value >= 60 ? '#3b82f6' :     // 适中蓝色
                                       '#10b981'                        // 轻松绿色
                            }
                        })),
                        markLine: {
                            silent: true,
                            data: [
                                { yAxis: 80, name: '忙碌线', lineStyle: { color: '#f59e0b', type: 'dashed' } },
                                { yAxis: 100, name: '超负荷线', lineStyle: { color: '#ef4444', type: 'dashed' } }
                            ]
                        }
                    }
                ]
            };
            
            chart.setOption(option);
            console.log('[Assessment] 项目负荷图表已渲染');
        } catch (e) {
            console.error('[Assessment] 渲染项目负荷图表失败:', e);
        }
    },

    /**
     * 渲染健康度评分分布图表
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
            
            // 按评分区间分组
            const ranges = {
                '优秀(90-100)': 0,
                '良好(80-89)': 0,
                '一般(60-79)': 0,
                '需优化(<60)': 0
            };
            
            this.assessments.forEach(a => {
                if (a.healthScore >= 90) ranges['优秀(90-100)']++;
                else if (a.healthScore >= 80) ranges['良好(80-89)']++;
                else if (a.healthScore >= 60) ranges['一般(60-79)']++;
                else ranges['需优化(<60)']++;
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
                        { value: ranges['优秀(90-100)'], name: '优秀(90-100)', itemStyle: { color: '#10b981' } },
                        { value: ranges['良好(80-89)'], name: '良好(80-89)', itemStyle: { color: '#3b82f6' } },
                        { value: ranges['一般(60-79)'], name: '一般(60-79)', itemStyle: { color: '#f59e0b' } },
                        { value: ranges['需优化(<60)'], name: '需优化(<60)', itemStyle: { color: '#ef4444' } }
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
        
        // 找出技能匹配度较低的人员
        const lowMatchAssessments = this.assessments
            .filter(a => a.skillMatch < 70 && a.projectsInPeriod.length > 0)
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
