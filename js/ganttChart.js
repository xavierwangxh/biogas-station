/**
 * 甘特图模块
 * 项目进度甘特图渲染与交互
 */

const ganttChart = {
    container: null,
    projects: [],
    personnel: [],
    currentView: 'project', // 'project' 或 'person'
    timeScale: 'month', // 'day', 'week', 'month', 'quarter'
    dayWidth: 40, // 每天宽度（像素）
    baseDayWidth: 40, // 基础每天宽度
    zoomLevel: 1, // 缩放级别
    minDate: null,
    maxDate: null,

    // 时间维度配置
    timeScaleConfig: {
        day: { label: '按日', dayWidth: 40, headerFormat: 'MM-dd' },
        week: { label: '按周', dayWidth: 20, headerFormat: '第ww周' },
        month: { label: '按月', dayWidth: 10, headerFormat: 'yyyy年MM月' },
        quarter: { label: '按季度', dayWidth: 3, headerFormat: 'yyyy年Q季度' }
    },

    /**
     * 初始化甘特图
     * @param {string} containerId - 容器ID
     */
    init(containerId = 'gantt-container') {
        console.log('[Gantt] 初始化甘特图...');
        
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('[Gantt] 容器不存在:', containerId);
            return;
        }

        // 加载数据
        this.projects = dataStore.getAllProjects();
        this.personnel = dataStore.getAllPersonnel();

        console.log('[Gantt] 加载项目数:', this.projects.length, '人员数:', this.personnel.length);

        // 计算日期范围
        this.calculateDateRange();

        // 设置默认时间尺度
        this.setTimeScale('month', false);

        this.render();
    },

    /**
     * 计算日期范围
     */
    calculateDateRange() {
        console.log('[Gantt] 计算日期范围...');
        
        let minDate = null;
        let maxDate = null;

        this.projects.forEach(project => {
            const stages = project.lifecycle || {};
            Object.values(stages).forEach(stage => {
                if (stage.startDate) {
                    const start = new Date(stage.startDate);
                    if (!minDate || start < minDate) minDate = start;
                }
                if (stage.endDate) {
                    const end = new Date(stage.endDate);
                    if (!maxDate || end > maxDate) maxDate = end;
                }
            });
        });

        // 默认范围（9个月生命周期）
        if (!minDate) minDate = new Date();
        if (!maxDate) {
            maxDate = new Date(minDate);
            maxDate.setMonth(maxDate.getMonth() + 9);
        } else {
            // 确保至少有9个月的显示范围
            const nineMonthsLater = new Date(minDate);
            nineMonthsLater.setMonth(nineMonthsLater.getMonth() + 9);
            if (maxDate < nineMonthsLater) {
                maxDate = nineMonthsLater;
            }
        }

        // 扩展边距
        this.minDate = new Date(minDate);
        this.minDate.setDate(this.minDate.getDate() - 15);
        this.maxDate = new Date(maxDate);
        this.maxDate.setDate(this.maxDate.getDate() + 15);

        console.log('[Gantt] 日期范围:', this.minDate.toISOString().split('T')[0], '至', this.maxDate.toISOString().split('T')[0]);
    },

    /**
     * 设置时间尺度
     * @param {string} scale - 'day', 'week', 'month', 'quarter'
     * @param {boolean} shouldRender - 是否立即渲染
     */
    setTimeScale(scale, shouldRender = true) {
        console.log('[Gantt] 设置时间尺度:', scale);
        
        if (!this.timeScaleConfig[scale]) {
            console.error('[Gantt] 无效的时间尺度:', scale);
            return;
        }

        this.timeScale = scale;
        this.baseDayWidth = this.timeScaleConfig[scale].dayWidth;
        this.dayWidth = this.baseDayWidth * this.zoomLevel;

        // 更新下拉框
        const select = document.getElementById('gantt-time-scale');
        if (select) {
            select.value = scale;
        }

        if (shouldRender) {
            this.render();
        }
    },

    /**
     * 放大
     */
    zoomIn() {
        console.log('[Gantt] 放大');
        this.zoomLevel = Math.min(this.zoomLevel * 1.25, 5);
        this.dayWidth = this.baseDayWidth * this.zoomLevel;
        this.updateZoomDisplay();
        this.render();
    },

    /**
     * 缩小
     */
    zoomOut() {
        console.log('[Gantt] 缩小');
        this.zoomLevel = Math.max(this.zoomLevel / 1.25, 0.2);
        this.dayWidth = this.baseDayWidth * this.zoomLevel;
        this.updateZoomDisplay();
        this.render();
    },

    /**
     * 重置缩放
     */
    resetZoom() {
        console.log('[Gantt] 重置缩放');
        this.zoomLevel = 1;
        this.dayWidth = this.baseDayWidth;
        this.updateZoomDisplay();
        this.render();
    },

    /**
     * 更新缩放显示
     */
    updateZoomDisplay() {
        const display = document.getElementById('gantt-zoom-level');
        if (display) {
            display.textContent = Math.round(this.zoomLevel * 100) + '%';
        }
    },

    /**
     * 渲染甘特图
     */
    render() {
        if (!this.container) {
            console.error('[Gantt] 容器不存在');
            return;
        }

        console.log('[Gantt] 开始渲染, 视图:', this.currentView, '时间尺度:', this.timeScale, '缩放:', this.zoomLevel);

        this.projects = dataStore.getAllProjects();
        this.personnel = dataStore.getAllPersonnel();

        // 更新视图按钮样式
        this.updateViewButtons();

        if (this.currentView === 'project') {
            this.renderByProject();
        } else {
            this.renderByPersonnel();
        }
    },

    /**
     * 更新视图按钮样式
     */
    updateViewButtons() {
        const projectBtn = document.getElementById('gantt-view-project');
        const personBtn = document.getElementById('gantt-view-person');
        
        if (projectBtn) {
            if (this.currentView === 'project') {
                projectBtn.className = 'px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition';
            } else {
                projectBtn.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition';
            }
        }
        
        if (personBtn) {
            if (this.currentView === 'person') {
                personBtn.className = 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition';
            } else {
                personBtn.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition';
            }
        }
    },

    /**
     * 按项目视图渲染
     */
    renderByProject() {
        console.log('[Gantt] 渲染项目视图');
        
        const startDate = this.minDate;
        const endDate = this.maxDate;
        const totalDays = daysBetween(formatDate(startDate), formatDate(endDate));

        let html = `
            <div class="gantt-wrapper">
                <div class="gantt-task-list">
                    <div class="gantt-task-header">项目名称</div>
        `;

        // 项目列表
        this.projects.forEach(project => {
            html += `
                <div class="gantt-task-item" title="${project.name}">
                    ${truncate(project.name, 15)}
                </div>
            `;
        });

        html += `</div>
            <div class="gantt-timeline" style="width: ${(totalDays + 1) * this.dayWidth}px">
                <div class="gantt-timeline-header">
        `;

        // 根据时间尺度渲染头部
        html += this.renderTimelineHeader(startDate, endDate);

        html += `</div>
            <div class="gantt-body" style="position: relative;">
        `;

        // 今日指示线
        html += this.renderTodayLine(startDate, endDate);

        // 渲染项目条形
        this.projects.forEach((project, index) => {
            html += this.renderProjectBars(project, index, startDate);
        });

        html += `
                </div>
            </div>
        </div>
        `;

        // 图例
        html += this.renderLegend();

        this.container.innerHTML = html;
    },

    /**
     * 按人员视图渲染
     */
    renderByPersonnel() {
        console.log('[Gantt] 渲染人员视图');
        
        const startDate = this.minDate;
        const endDate = this.maxDate;
        const totalDays = daysBetween(formatDate(startDate), formatDate(endDate));

        let html = `
            <div class="gantt-wrapper">
                <div class="gantt-task-list">
                    <div class="gantt-task-header">人员姓名</div>
        `;

        // 人员列表
        this.personnel.forEach(person => {
            html += `
                <div class="gantt-task-item">
                    ${person.name} <span class="text-gray-400 text-xs">(${person.department || '无部门'})</span>
                </div>
            `;
        });

        html += `</div>
            <div class="gantt-timeline" style="width: ${(totalDays + 1) * this.dayWidth}px">
                <div class="gantt-timeline-header">
        `;

        // 根据时间尺度渲染头部
        html += this.renderTimelineHeader(startDate, endDate);

        html += `</div>
            <div class="gantt-body">
        `;

        // 今日指示线
        html += this.renderTodayLine(startDate, endDate);

        // 渲染每个人员负责的项目
        this.personnel.forEach((person, index) => {
            html += this.renderPersonnelBars(person, index, startDate);
        });

        html += `
                </div>
            </div>
        </div>
        `;

        // 图例
        html += this.renderLegend();

        this.container.innerHTML = html;

        // 显示负荷分析
        this.renderWorkloadAnalysis();
    },

    /**
     * 渲染时间轴头部
     */
    renderTimelineHeader(startDate, endDate) {
        let html = '';
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        if (this.timeScale === 'day') {
            // 按日显示 - 按月分组显示天
            let currentDate = new Date(startDateObj);
            
            while (currentDate <= endDateObj) {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth() + 1;
                const daysInMonth = new Date(year, month, 0).getDate();
                const dayOfMonth = currentDate.getDate();
                const remainingDays = Math.min(daysInMonth - dayOfMonth + 1, 
                    Math.ceil((endDateObj - currentDate) / (1000 * 60 * 60 * 24)) + 1);
                
                html += `
                    <div class="gantt-month-header" style="min-width: ${remainingDays * this.dayWidth}px">
                        ${year}年${month}月
                    </div>
                `;
                
                currentDate.setDate(1);
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
        } else if (this.timeScale === 'week') {
            // 按周显示
            let currentDate = new Date(startDateObj);
            let weekNumber = 1;
            
            while (currentDate <= endDateObj) {
                const year = currentDate.getFullYear();
                const weekStart = new Date(currentDate);
                const weekEnd = new Date(currentDate);
                weekEnd.setDate(weekEnd.getDate() + 6);
                
                if (weekEnd > endDateObj) {
                    weekEnd.setTime(endDateObj.getTime());
                }
                
                const daysInWeek = Math.ceil((weekEnd - weekStart) / (1000 * 60 * 60 * 24)) + 1;
                
                html += `
                    <div class="gantt-month-header" style="min-width: ${daysInWeek * this.dayWidth}px; font-size: 11px;">
                        ${year}年${monthNames[currentDate.getMonth()]} 第${weekNumber}周
                    </div>
                `;
                
                currentDate.setDate(currentDate.getDate() + 7);
                weekNumber++;
                if (currentDate.getMonth() === 0 && weekNumber > 4) {
                    weekNumber = 1;
                }
            }
        } else if (this.timeScale === 'month') {
            // 按月显示
            let currentDate = new Date(startDateObj);
            
            while (currentDate <= endDateObj) {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth() + 1;
                const daysInMonth = new Date(year, month, 0).getDate();
                const dayOfMonth = currentDate.getDate();
                const remainingDays = Math.min(daysInMonth - dayOfMonth + 1, 
                    Math.ceil((endDateObj - currentDate) / (1000 * 60 * 60 * 24)) + 1);
                
                html += `
                    <div class="gantt-month-header" style="min-width: ${remainingDays * this.dayWidth}px">
                        ${year}年${month}月
                    </div>
                `;
                
                currentDate.setDate(1);
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
        } else if (this.timeScale === 'quarter') {
            // 按季度显示
            let currentDate = new Date(startDateObj);
            
            while (currentDate <= endDateObj) {
                const year = currentDate.getFullYear();
                const quarter = Math.floor(currentDate.getMonth() / 3) + 1;
                
                // 计算本季度剩余天数
                const quarterEnd = new Date(year, quarter * 3, 0);
                if (quarterEnd > endDateObj) {
                    quarterEnd.setTime(endDateObj.getTime());
                }
                
                const remainingDays = Math.ceil((quarterEnd - currentDate) / (1000 * 60 * 60 * 24)) + 1;
                
                html += `
                    <div class="gantt-month-header" style="min-width: ${remainingDays * this.dayWidth}px">
                        ${year}年第${quarter}季度
                    </div>
                `;
                
                // 移动到下一季度
                currentDate.setMonth(quarter * 3);
                currentDate.setDate(1);
            }
        }

        return html;
    },

    /**
     * 渲染今日指示线
     */
    renderTodayLine(startDate, endDate) {
        const today = new Date();
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        
        if (today >= startDateObj && today <= endDateObj) {
            const todayOffset = daysBetween(formatDate(startDate), formatDate(today)) * this.dayWidth;
            return `
                <div class="gantt-today" style="left: ${todayOffset}px">
                    <div class="gantt-today-label">今天</div>
                </div>
            `;
        }
        return '';
    },

    /**
     * 渲染图例
     */
    renderLegend() {
        return `
            <div class="gantt-legend">
                <div class="gantt-legend-item">
                    <div class="gantt-legend-color" style="background: linear-gradient(90deg, #f59e0b, #fbbf24)"></div>
                    <span>跟踪</span>
                </div>
                <div class="gantt-legend-item">
                    <div class="gantt-legend-color" style="background: linear-gradient(90deg, #3b82f6, #60a5fa)"></div>
                    <span>签约</span>
                </div>
                <div class="gantt-legend-item">
                    <div class="gantt-legend-color" style="background: linear-gradient(90deg, #8b5cf6, #a78bfa)"></div>
                    <span>手续</span>
                </div>
                <div class="gantt-legend-item">
                    <div class="gantt-legend-color" style="background: linear-gradient(90deg, #ec4899, #f472b6)"></div>
                    <span>建设</span>
                </div>
                <div class="gantt-legend-item">
                    <div class="gantt-legend-color" style="background: linear-gradient(90deg, #10b981, #34d399)"></div>
                    <span>运营</span>
                </div>
            </div>
        `;
    },

    /**
     * 渲染项目的各阶段条形
     */
    renderProjectBars(project, rowIndex, startDate) {
        const rowHeight = 40;
        
        let html = `<div class="gantt-row" style="position: relative; height: ${rowHeight}px;">`;

        const stages = project.lifecycle || {};
        const stageClasses = {
            tracking: 'gantt-bar-tracking',
            contract: 'gantt-bar-contract',
            procedure: 'gantt-bar-procedure',
            construction: 'gantt-bar-construction',
            operation: 'gantt-bar-operation'
        };

        Object.entries(stages).forEach(([stageKey, stage]) => {
            if (!stage.startDate) return;

            const stageStart = new Date(stage.startDate);
            const stageEnd = stage.endDate ? new Date(stage.endDate) : new Date();
            
            // 检查阶段是否在显示范围内
            if (stageEnd < this.minDate || stageStart > this.maxDate) return;
            
            const effectiveStart = stageStart < this.minDate ? this.minDate : stageStart;
            const effectiveEnd = stageEnd > this.maxDate ? this.maxDate : stageEnd;
            
            const offset = daysBetween(formatDate(this.minDate), formatDate(effectiveStart)) * this.dayWidth;
            const width = Math.max(daysBetween(formatDate(effectiveStart), formatDate(effectiveEnd)) * this.dayWidth, 20);

            const leader = stage.leaderId ? dataStore.getPersonnel(stage.leaderId)?.name : '未分配';

            html += `
                <div class="gantt-bar ${stageClasses[stageKey]}"
                     style="left: ${offset}px; width: ${width}px;"
                     title="${project.name} - ${STAGE_NAMES[stageKey]}: ${formatDateDisplay(stage.startDate)} 至 ${formatDateDisplay(stage.endDate)} | 牵头: ${leader}"
                     onclick="app.showProjectDetail('${project.id}')"
                >
                    ${width > 60 ? STAGE_NAMES[stageKey] : ''}
                </div>
            `;
        });

        html += '</div>';
        return html;
    },

    /**
     * 渲染人员负责的项目条形
     */
    renderPersonnelBars(person, rowIndex, startDate) {
        const rowHeight = 40;
        
        let html = `<div class="gantt-row" style="position: relative; height: ${rowHeight}px;">`;

        // 获取该人员负责的所有项目阶段
        const projects = dataStore.getAllProjects();
        const assignedStages = [];

        projects.forEach(project => {
            const stages = project.lifecycle || {};
            Object.entries(stages).forEach(([stageKey, stage]) => {
                if (stage.leaderId === person.id) {
                    assignedStages.push({
                        project,
                        stageKey,
                        stage
                    });
                }
            });
        });

        const stageClasses = {
            tracking: 'gantt-bar-tracking',
            contract: 'gantt-bar-contract',
            procedure: 'gantt-bar-procedure',
            construction: 'gantt-bar-construction',
            operation: 'gantt-bar-operation'
        };

        assignedStages.forEach(({ project, stageKey, stage }) => {
            if (!stage.startDate) return;

            const stageStart = new Date(stage.startDate);
            const stageEnd = stage.endDate ? new Date(stage.endDate) : new Date();
            
            // 检查阶段是否在显示范围内
            if (stageEnd < this.minDate || stageStart > this.maxDate) return;
            
            const effectiveStart = stageStart < this.minDate ? this.minDate : stageStart;
            const effectiveEnd = stageEnd > this.maxDate ? this.maxDate : stageEnd;
            
            const offset = daysBetween(formatDate(this.minDate), formatDate(effectiveStart)) * this.dayWidth;
            const width = Math.max(daysBetween(formatDate(effectiveStart), formatDate(effectiveEnd)) * this.dayWidth, 20);

            html += `
                <div class="gantt-bar ${stageClasses[stageKey]}"
                     style="left: ${offset}px; width: ${width}px;"
                     title="${project.name} - ${STAGE_NAMES[stageKey]}: ${formatDateDisplay(stage.startDate)} 至 ${formatDateDisplay(stage.endDate)}"
                     onclick="app.showProjectDetail('${project.id}')"
                >
                    ${width > 80 ? truncate(project.name, 10) : ''}
                </div>
            `;
        });

        html += '</div>';
        return html;
    },

    /**
     * 渲染人员负荷分析
     */
    renderWorkloadAnalysis() {
        const container = document.getElementById('workload-analysis');
        const chartContainer = document.getElementById('workload-chart');
        
        if (!container || !chartContainer) return;

        container.classList.remove('hidden');

        const data = this.personnel.map(person => {
            const workload = personnelManager.calculateWorkload(person.id);
            return {
                name: person.name,
                value: workload ? Math.round(workload.workloadPercent) : 0,
                current: workload?.currentProjects || 0,
                max: workload?.maxProjects || 3
            };
        });

        const chart = echarts.init(chartContainer);
        const option = {
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    const d = params[0].data;
                    return `${d.name}<br/>负荷: ${d.value}%<br/>项目: ${d.current}/${d.max}`;
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
                axisLabel: { rotate: 45 }
            },
            yAxis: {
                type: 'value',
                max: 100,
                axisLabel: { formatter: '{value}%' }
            },
            series: [{
                type: 'bar',
                data: data.map(d => ({
                    value: d.value,
                    name: d.name,
                    current: d.current,
                    max: d.max,
                    itemStyle: {
                        color: d.value >= 90 ? '#ef4444' : 
                               d.value >= 70 ? '#f59e0b' : 
                               d.value >= 50 ? '#3b82f6' : '#10b981'
                    }
                })),
                markLine: {
                    data: [{ yAxis: 90, name: '超负荷' }],
                    lineStyle: { color: '#ef4444', type: 'dashed' }
                }
            }]
        };

        chart.setOption(option);
    },

    /**
     * 获取日期范围
     */
    getDateRange() {
        return {
            startDate: formatDate(this.minDate),
            endDate: formatDate(this.maxDate)
        };
    },

    /**
     * 切换视图
     * @param {string} view - 'project' 或 'person'
     */
    switchView(view) {
        console.log('[Gantt] 切换视图:', view);
        this.currentView = view;
        this.render();
    },

    /**
     * 滚动到指定日期
     * @param {string} date - 日期
     */
    scrollToDate(date) {
        const startDate = this.minDate;
        const days = daysBetween(formatDate(startDate), date);
        const offset = days * this.dayWidth;
        
        const timeline = this.container.querySelector('.gantt-timeline');
        if (timeline) {
            timeline.scrollLeft = offset - 200;
        }
    },

    /**
     * 高亮项目
     * @param {string} projectId - 项目ID
     */
    highlightProject(projectId) {
        const bars = this.container.querySelectorAll('.gantt-bar');
        bars.forEach(bar => {
            if (bar.getAttribute('onclick')?.includes(projectId)) {
                bar.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.8)';
                bar.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    bar.style.boxShadow = '';
                    bar.style.transform = '';
                }, 3000);
            }
        });
    }
};

// 月份名称
const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
