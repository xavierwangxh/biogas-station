/**
 * Excel导出模块
 * 使用 SheetJS 实现数据导出功能
 */

const excelExporter = {
    /**
     * 导出项目列表
     * @param {Array} projects - 项目列表（可选，默认全部）
     */
    exportProjects(projects) {
        const data = projects || dataStore.getAllProjects();
        
        const exportData = data.map(project => {
            const currentStage = projectManager.getCurrentStage(project);
            
            return {
                '项目名称': project.name,
                '省份': project.location?.province || '',
                '城市': project.location?.city || '',
                '区县': project.location?.district || '',
                '详细地址': project.location?.address || '',
                '经度': project.location?.longitude || '',
                '纬度': project.location?.latitude || '',
                '设计规模(标方/天)': project.scale?.designCapacity || '',
                '年产天然气预估(万标方/年)': project.scale?.dailyOutput || '',
                '处理工艺': PROCESS_TYPES[project.scale?.processType] || '',
                '电费单价(元/度)': project.costs?.electricityPrice || '',
                '蒸汽费单价(元/吨)': project.costs?.steamPrice || '',
                '当前阶段': currentStage.stageName,
                '跟踪阶段牵头人': this.getLeaderName(project.lifecycle?.tracking?.leaderId),
                '签约阶段牵头人': this.getLeaderName(project.lifecycle?.contract?.leaderId),
                '手续阶段牵头人': this.getLeaderName(project.lifecycle?.procedure?.leaderId),
                '建设阶段牵头人': this.getLeaderName(project.lifecycle?.construction?.leaderId),
                '运营阶段牵头人': this.getLeaderName(project.lifecycle?.operation?.leaderId),
                '创建时间': formatDateDisplay(project.createdAt),
                '更新时间': formatDateDisplay(project.updatedAt)
            };
        });

        this.downloadExcel(exportData, '项目列表');
        showToast('项目列表导出成功', 'success');
    },

    /**
     * 导出人员列表
     * @param {Array} personnel - 人员列表（可选，默认全部）
     */
    exportPersonnel(personnel) {
        const data = personnel || dataStore.getAllPersonnel();
        
        const exportData = data.map(person => {
            const workload = personnelManager.calculateWorkload(person.id);
            
            return {
                '姓名': person.name,
                '性别': person.gender || '',
                '年龄': getCurrentAge(person) || '',
                '部门': person.department || '',
                '职位': person.position || '',
                '项目经验数': person.experience?.projectCount || 0,
                '工作年限': person.experience?.years || '',
                '熟悉工艺': (person.experience?.processes || []).map(p => PROCESS_TYPES[p]).join('、'),
                '技术能力': person.capabilities?.technical || 5,
                '管理能力': person.capabilities?.management || 5,
                '协调能力': person.capabilities?.coordination || 5,
                '当前项目数': workload?.currentProjects || 0,
                '最大可承担项目数': person.maxProjects || 3,
                '工作负荷': workload ? `${Math.round(workload.workloadPercent)}%` : '0%',
                '负荷状态': workload?.status || '轻松',
                '联系电话': person.contact?.phone || '',
                '邮箱': person.contact?.email || '',
                '常驻省份': person.location?.province || '',
                '常驻城市': person.location?.city || ''
            };
        });

        this.downloadExcel(exportData, '人员列表');
        showToast('人员列表导出成功', 'success');
    },

    /**
     * 导出项目群
     */
    exportProjectGroups() {
        const groups = smartRecommendation.getProjectGroupDetails();
        
        const exportData = groups.map((group, index) => {
            const stageDist = group.stageDistribution || {};
            return {
                '项目群名称': group.name,
                '项目数量': group.projectCount,
                '中心经度': group.centerPoint?.longitude || '',
                '中心纬度': group.centerPoint?.latitude || '',
                '覆盖半径(km)': Math.round(group.radius || 0),
                '跟踪阶段项目数': stageDist.tracking || 0,
                '签约阶段项目数': stageDist.contract || 0,
                '手续阶段项目数': stageDist.procedure || 0,
                '建设阶段项目数': stageDist.construction || 0,
                '运营阶段项目数': stageDist.operation || 0,
                '总设计规模(标方/天)': group.totalCapacity || 0,
                '总年产天然气(万标方/年)': group.totalDailyOutput || 0,
                '包含项目': group.projects.map(p => p.name).join('、')
            };
        });

        this.downloadExcel(exportData, '项目群');
        showToast('项目群导出成功', 'success');
    },

    /**
     * 导出甘特图数据
     */
    exportGanttData() {
        const projects = dataStore.getAllProjects();
        const exportData = [];

        projects.forEach(project => {
            const stages = project.lifecycle || {};
            
            Object.entries(stages).forEach(([stageKey, stage]) => {
                if (!stage.startDate) return;
                
                exportData.push({
                    '项目名称': project.name,
                    '阶段': STAGE_NAMES[stageKey],
                    '开始日期': formatDateDisplay(stage.startDate),
                    '结束日期': formatDateDisplay(stage.endDate),
                    '持续天数': stage.endDate ? daysBetween(stage.startDate, stage.endDate) : '进行中',
                    '牵头人': this.getLeaderName(stage.leaderId),
                    '状态': stage.status === 'completed' ? '已完成' : 
                           stage.status === 'ongoing' ? '进行中' : '待开始'
                });
            });
        });

        this.downloadExcel(exportData, '甘特图数据');
        showToast('甘特图数据导出成功', 'success');
    },

    /**
     * 导出完整报告
     */
    exportFullReport() {
        const projects = dataStore.getAllProjects();
        const personnel = dataStore.getAllPersonnel();
        const groups = smartRecommendation.getProjectGroupDetails();
        const stats = projectManager.getStatistics();

        // 项目工作表
        const projectData = projects.map(project => {
            const currentStage = projectManager.getCurrentStage(project);
            return {
                '项目名称': project.name,
                '省份': project.location?.province || '',
                '城市': project.location?.city || '',
                '区县': project.location?.district || '',
                '设计规模(标方/天)': project.scale?.designCapacity || '',
                '年产天然气预估(万标方/年)': project.scale?.dailyOutput || '',
                '工艺': PROCESS_TYPES[project.scale?.processType] || '',
                '当前阶段': currentStage.stageName
            };
        });

        // 人员工作表
        const personnelData = personnel.map(person => {
            const workload = personnelManager.calculateWorkload(person.id);
            return {
                '姓名': person.name,
                '部门': person.department || '',
                '职位': person.position || '',
                '经验数': person.experience?.projectCount || 0,
                '当前项目': workload?.currentProjects || 0,
                '负荷': workload ? `${Math.round(workload.workloadPercent)}%` : '0%'
            };
        });

        // 项目群工作表
        const groupData = groups.map(group => ({
            '项目群': group.name,
            '项目数': group.projectCount,
            '总设计规模(标方/天)': group.totalCapacity || 0,
            '总年产天然气(万标方/年)': group.totalDailyOutput || 0
        }));

        // 统计工作表
        const statsData = [
            { '指标': '项目总数', '数值': stats.total },
            { '指标': '各阶段分布', '数值': Object.entries(stats.byStage).map(([k, v]) => `${STAGE_NAMES[k]}:${v}`).join(', ') },
            { '指标': '总设计规模(标方/天)', '数值': stats.totalCapacity },
            { '指标': '总年产天然气(万标方/年)', '数值': stats.totalDailyOutput }
        ];

        // 创建多工作表Excel
        const wb = XLSX.utils.book_new();
        
        const ws1 = XLSX.utils.json_to_sheet(projectData);
        const ws2 = XLSX.utils.json_to_sheet(personnelData);
        const ws3 = XLSX.utils.json_to_sheet(groupData);
        const ws4 = XLSX.utils.json_to_sheet(statsData);

        XLSX.utils.book_append_sheet(wb, ws1, '项目列表');
        XLSX.utils.book_append_sheet(wb, ws2, '人员列表');
        XLSX.utils.book_append_sheet(wb, ws3, '项目群');
        XLSX.utils.book_append_sheet(wb, ws4, '统计概览');

        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `沼气提纯站项目完整报告_${date}.xlsx`);
        
        showToast('完整报告导出成功', 'success');
    },

    /**
     * 导入数据
     * @param {File} file - 文件对象
     */
    async importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // 解析项目数据
                    const projectSheet = workbook.Sheets['项目列表'];
                    if (projectSheet) {
                        const projects = XLSX.utils.sheet_to_json(projectSheet);
                        projects.forEach(p => {
                            // 转换数据格式
                            const project = {
                                name: p['项目名称'],
                                location: {
                                    province: p['省份'],
                                    city: p['城市'],
                                    district: p['区县'],
                                    address: p['详细地址'],
                                    longitude: p['经度'],
                                    latitude: p['纬度']
                                },
                                scale: {
                                    designCapacity: p['设计规模(标方/天)'] || p['设计规模(Nm³/h)'],
                                    dailyOutput: p['年产天然气预估(万标方/年)'] || p['日产气量预估(千方/天)'],
                                    processType: this.getProcessKey(p['处理工艺'])
                                },
                                costs: {
                                    electricityPrice: p['电费单价(元/度)'],
                                    steamPrice: p['蒸汽费单价(元/吨)']
                                }
                            };
                            projectManager.createProject(project);
                        });
                    }

                    // 解析人员数据
                    const personnelSheet = workbook.Sheets['人员列表'];
                    if (personnelSheet) {
                        const personnel = XLSX.utils.sheet_to_json(personnelSheet);
                        personnel.forEach(p => {
                            const person = {
                                name: p['姓名'],
                                gender: p['性别'],
                                age: p['年龄'],
                                department: p['部门'],
                                position: p['职位'],
                                experience: {
                                    projectCount: p['项目经验数'],
                                    processes: this.parseProcesses(p['熟悉工艺'])
                                },
                                maxProjects: p['最大可承担项目数'],
                                contact: {
                                    phone: p['联系电话'],
                                    email: p['邮箱']
                                }
                            };
                            personnelManager.createPersonnel(person);
                        });
                    }

                    showToast('数据导入成功', 'success');
                    resolve();
                } catch (error) {
                    showToast('数据导入失败: ' + error.message, 'error');
                    reject(error);
                }
            };

            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * 下载Excel文件
     * @param {Array} data - 数据数组
     * @param {string} filename - 文件名
     */
    downloadExcel(data, filename) {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, filename);
        
        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
    },

    /**
     * 获取牵头人姓名
     * @param {string} leaderId - 人员ID
     * @returns {string} 姓名
     */
    getLeaderName(leaderId) {
        if (!leaderId) return '未分配';
        const person = dataStore.getPersonnel(leaderId);
        return person ? person.name : '未知';
    },

    /**
     * 获取工艺key
     * @param {string} name - 工艺名称
     * @returns {string} key
     */
    getProcessKey(name) {
        const map = {
            'PSA变压吸附': 'PSA',
            '膜分离': 'membrane',
            '深冷分离': 'cryogenic',
            '其他': 'other'
        };
        return map[name] || 'other';
    },

    /**
     * 解析工艺字符串
     * @param {string} processesStr - 工艺字符串
     * @returns {Array} 工艺数组
     */
    parseProcesses(processesStr) {
        if (!processesStr) return [];
        const map = {
            'PSA变压吸附': 'PSA',
            '膜分离': 'membrane',
            '深冷分离': 'cryogenic',
            '其他': 'other'
        };
        return processesStr.split('、').map(p => map[p]).filter(Boolean);
    }
};
