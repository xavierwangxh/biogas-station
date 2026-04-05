/**
 * 应用主入口
 * 整合所有模块，处理UI交互
 */

const app = {
    currentTab: 'dashboard',

    /**
     * 初始化应用
     */
    init() {
        console.log('[App] 开始初始化应用...');
        
        // 初始化数据存储
        dataStore.init();
        
        // 加载示例数据（如果是首次访问）
        this.loadSampleData();
        
        // 初始化UI
        this.initUI();
        
        // 更新统计数据
        this.updateDashboard();
        
        // 渲染项目列表
        this.renderProjects();
        
        // 渲染人员列表
        this.renderPersonnel();
        
        // 初始化部门筛选
        this.initDepartmentFilters();
        
        // 预加载人员评估页面
        this.preloadPersonnelAssessment();
        
        console.log('[App] 应用初始化完成');
    },

    /**
     * 加载示例数据
     */
    loadSampleData() {
        const projects = dataStore.getAllProjects();
        const personnel = dataStore.getAllPersonnel();
        
        // 如果没有数据，加载示例
        if (projects.length === 0 && personnel.length === 0) {
            this.loadSampleProjects();
            this.loadSamplePersonnel();
            showToast('已加载示例数据', 'info');
        }
    },

    /**
     * 初始化UI
     */
    initUI() {
        // 初始化省份选择器
        this.initProvinceSelectors();
        
        // 初始化表单事件
        this.initFormEvents();
        
        // 初始化下拉菜单
        this.initDropdownMenus();
        
        // 默认显示概览
        this.switchTab('dashboard');
    },
    
    /**
     * 初始化下拉菜单
     */
    initDropdownMenus() {
        // 导入下拉菜单
        const importContainer = document.getElementById('import-dropdown-container');
        const importDropdown = document.getElementById('import-dropdown');
        if (importContainer && importDropdown) {
            importContainer.addEventListener('mouseenter', () => {
                importDropdown.classList.remove('hidden');
            });
            importContainer.addEventListener('mouseleave', (e) => {
                // 检查鼠标是否真的离开了容器（包括子元素）
                if (!importContainer.contains(e.relatedTarget)) {
                    importDropdown.classList.add('hidden');
                }
            });
            importDropdown.addEventListener('mouseleave', (e) => {
                if (!importContainer.contains(e.relatedTarget)) {
                    importDropdown.classList.add('hidden');
                }
            });
        }
        
        // 导出下拉菜单
        const exportContainer = document.getElementById('export-dropdown-container');
        const exportDropdown = document.getElementById('export-dropdown');
        if (exportContainer && exportDropdown) {
            exportContainer.addEventListener('mouseenter', () => {
                exportDropdown.classList.remove('hidden');
            });
            exportContainer.addEventListener('mouseleave', (e) => {
                if (!exportContainer.contains(e.relatedTarget)) {
                    exportDropdown.classList.add('hidden');
                }
            });
            exportDropdown.addEventListener('mouseleave', (e) => {
                if (!exportContainer.contains(e.relatedTarget)) {
                    exportDropdown.classList.add('hidden');
                }
            });
        }
        
        console.log('[App] 下拉菜单初始化完成');
    },

    /**
     * 切换移动端菜单显示
     */
    toggleMobileMenu() {
        const mobileMenu = document.getElementById('mobile-menu');
        const menuBtn = document.getElementById('mobile-menu-btn');
        if (mobileMenu) {
            mobileMenu.classList.toggle('hidden');
        }
        if (menuBtn) {
            const icon = menuBtn.querySelector('i');
            if (icon) {
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        }
    },

    /**
     * 切换标签页
     * @param {string} tabName - 标签页名称
     */
    switchTab(tabName) {
        // 隐藏所有标签页
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });

        // 显示目标标签页
        const targetTab = document.getElementById(`${tabName}-tab`);
        if (targetTab) {
            targetTab.classList.remove('hidden');
        }

        // 更新导航按钮状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('bg-white/30');
        });
        const activeBtn = document.querySelector(`.nav-btn[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('bg-white/30');
        }

        // 更新移动端菜单按钮状态
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            btn.classList.remove('bg-emerald-600');
        });

        // 关闭移动端菜单
        const mobileMenu = document.getElementById('mobile-menu');
        const menuBtn = document.getElementById('mobile-menu-btn');
        if (mobileMenu) {
            mobileMenu.classList.add('hidden');
        }
        if (menuBtn) {
            const icon = menuBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }

        // 触发特定标签页的初始化
        if (tabName === 'gantt' && typeof ganttChart !== 'undefined' && ganttChart.render) {
            setTimeout(() => ganttChart.render(), 100);
        }
        if (tabName === 'map' && typeof mapVisualization !== 'undefined') {
            setTimeout(() => {
                if (mapVisualization.map) {
                    mapVisualization.map.resize();
                }
            }, 100);
        }
        if (tabName === 'assessment' && typeof assessmentPage !== 'undefined') {
            assessmentPage.init();
        }

        this.currentTab = tabName;
    },

    /**
     * 初始化省份选择器
     */
    initProvinceSelectors() {
        const selectors = [
            document.getElementById('project-province'),
            document.getElementById('project-province-filter')
        ];
        
        selectors.forEach(selector => {
            if (!selector) return;
            
            // 清空现有选项
            selector.innerHTML = selector.id.includes('filter') ? '<option value="">所有省份</option>' : '<option value="">请选择省份</option>';
            
            PROVINCES.forEach(prov => {
                const option = document.createElement('option');
                option.value = prov;
                option.textContent = prov;
                selector.appendChild(option);
            });
        });

        // 初始化部门筛选器
        const deptSelector = document.getElementById('project-department-filter');
        if (deptSelector) {
            deptSelector.innerHTML = '<option value="">所有部门</option>';
            DEPARTMENTS.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept;
                option.textContent = dept;
                deptSelector.appendChild(option);
            });
        }
    },

    /**
     * 省份选择变化处理
     */
    onProvinceChange() {
        const provinceSelect = document.getElementById('project-province');
        const citySelect = document.getElementById('project-city');
        const districtSelect = document.getElementById('project-district');
        
        if (!provinceSelect || !citySelect) return;
        
        const province = provinceSelect.value;
        
        // 清空城市和区县
        citySelect.innerHTML = '<option value="">请选择城市</option>';
        districtSelect.innerHTML = '<option value="">请选择区县</option>';
        
        if (!province) return;
        
        // 获取城市列表
        const cities = getCitiesByProvince(province);
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });
    },

    /**
     * 城市选择变化处理
     */
    onCityChange() {
        const provinceSelect = document.getElementById('project-province');
        const citySelect = document.getElementById('project-city');
        const districtSelect = document.getElementById('project-district');
        
        if (!citySelect || !districtSelect) return;
        
        const province = provinceSelect.value;
        const city = citySelect.value;
        
        // 清空区县
        districtSelect.innerHTML = '<option value="">请选择区县</option>';
        
        if (!province || !city) return;
        
        // 获取区县列表
        const districts = getDistrictsByCity(province, city);
        districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtSelect.appendChild(option);
        });
    },

    /**
     * 切换其他工艺输入框显示
     */
    toggleOtherProcess() {
        const checkbox = document.getElementById('process-other-check');
        const inputContainer = document.getElementById('process-other-input-container');
        
        if (checkbox && inputContainer) {
            inputContainer.classList.toggle('hidden', !checkbox.checked);
        }
    },

    /**
     * 初始化表单事件
     */
    initFormEvents() {
        console.log('[App] 初始化表单事件...');
        
        // 项目表单提交 - 使用submit事件监听
        const projectForm = document.getElementById('project-form');
        if (projectForm) {
            console.log('[App] 找到项目表单，绑定submit事件');
            
            projectForm.addEventListener('submit', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[App] 项目表单submit事件触发');
                this.saveProject();
            });
        } else {
            console.error('[App] 未找到项目表单 #project-form');
        }

        // 人员表单提交
        const personnelForm = document.getElementById('personnel-form');
        if (personnelForm) {
            console.log('[App] 找到人员表单，绑定submit事件');
            
            personnelForm.addEventListener('submit', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[App] 人员表单submit事件触发');
                this.savePersonnel();
            });
        } else {
            console.error('[App] 未找到人员表单 #personnel-form');
        }

        // 能力滑块值显示
        ['technical', 'management', 'coordination'].forEach(cap => {
            const slider = document.getElementById(`capability-${cap}`);
            const display = document.getElementById(`capability-${cap}-value`);
            if (slider && display) {
                slider.addEventListener('input', () => {
                    display.textContent = slider.value;
                });
            }
        });
    },

    /**
     * 初始化部门筛选
     */
    initDepartmentFilters() {
        const container = document.getElementById('department-filters');
        if (!container) return;

        // 清除现有按钮（保留"全部"按钮）
        container.innerHTML = '<button class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm" data-dept="" onclick="app.filterPersonnelByDept(&quot;&quot;)">全部</button>';

        // 添加部门按钮
        DEPARTMENTS.forEach(dept => {
            const btn = document.createElement('button');
            btn.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition';
            btn.textContent = dept;
            btn.dataset.dept = dept;
            btn.onclick = () => app.filterPersonnelByDept(dept);
            container.appendChild(btn);
        });
    },

    // ==================== 标签页切换 ====================

    /**
     * 切换标签页
     * @param {string} tab - 标签页名称
     */
    switchTab(tab) {
        console.log(`[App] ==================== 切换到标签页: ${tab} ====================`);
        this.currentTab = tab;
        
        // 更新导航按钮状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            }
        });
        
        // 隐藏所有标签页内容
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        // 显示当前标签页
        const currentContent = document.getElementById(`${tab}-tab`);
        if (currentContent) {
            currentContent.classList.remove('hidden');
            console.log(`[App] ✅ 标签页 ${tab} 已显示`);
        } else {
            console.error(`[App] ❌ 标签页 ${tab}-tab 不存在`);
        }
        
        // 特殊处理地图标签页
        if (tab === 'map') {
            console.log('[App] ==================== 切换到地图标签页 ====================');
            console.log('[App] 地图容器存在:', !!document.getElementById('map-container'));
            console.log('[App] mapVisualization存在:', typeof mapVisualization !== 'undefined');
            
            // 使用延迟确保DOM已经显示并且容器有尺寸
            setTimeout(() => {
                const container = document.getElementById('map-container');
                if (container) {
                    console.log('[App] 地图容器尺寸:', container.offsetWidth, 'x', container.offsetHeight);
                    console.log('[App] 地图容器display:', window.getComputedStyle(container).display);
                }
                
                if (typeof mapVisualization !== 'undefined') {
                    console.log('[App] 调用 mapVisualization.init()...');
                    mapVisualization.init();
                    
                    // 再延迟显示项目
                    setTimeout(() => {
                        console.log('[App] 调用 showAllProjects()...');
                        mapVisualization.showAllProjects();
                    }, 500);
                } else {
                    console.error('[App] ❌ mapVisualization 未定义！');
                }
            }, 300);
        } else if (tab === 'gantt') {
            console.log('[App] 切换到甘特图标签页');
            setTimeout(() => {
                if (typeof ganttChart !== 'undefined') {
                    console.log('[App] 初始化甘特图...');
                    ganttChart.init();
                } else {
                    console.error('[App] ganttChart 未定义');
                }
            }, 200);
        } else if (tab === 'assessment') {
            console.log('[App] 切换到人员负荷评估标签页');
            this.initPersonnelAssessment();
        }
    },

    // ==================== 人员负荷评估 ====================

    /**
     * 预加载人员负荷评估页面
     */
    preloadPersonnelAssessment() {
        const container = document.getElementById('personnel-assessment-container');
        if (!container) {
            console.error('[App] 未找到人员评估容器 #personnel-assessment-container');
            return;
        }
        
        // 直接使用内联HTML，避免fetch问题
        container.innerHTML = this.getPersonnelAssessmentHTML();
        console.log('[App] 人员负荷评估HTML已预加载到DOM');
    },

    /**
     * 获取人员负荷评估页面HTML
     */
    getPersonnelAssessmentHTML() {
        return `
        <div id="assessment-content">
            <!-- 页面标题 -->
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">人员负荷评估</h2>
                    <p class="text-gray-500 mt-1">评估人员在指定时间段内的项目配置合理性</p>
                </div>
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2">
                        <label class="text-sm text-gray-600">评估时间段:</label>
                        <input type="date" id="assess-start-date" class="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <span class="text-gray-400">至</span>
                        <input type="date" id="assess-end-date" class="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <button onclick="if(typeof assessmentModule !== 'undefined' && assessmentModule.runAssessment) { assessmentModule.runAssessment(); } else { console.error('assessmentModule未加载'); }" class="ml-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
                            <i class="fas fa-play mr-2"></i>评估
                        </button>
                    </div>
                </div>
            </div>

            <!-- 评估概览卡片 -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-white rounded-xl shadow-md p-5 border-l-4 border-emerald-500">
                    <p class="text-gray-500 text-sm">参与评估人员</p>
                    <p class="text-2xl font-bold text-gray-800 mt-1" id="total-personnel">0</p>
                </div>
                <div class="bg-white rounded-xl shadow-md p-5 border-l-4 border-red-500">
                    <p class="text-gray-500 text-sm">过载警告</p>
                    <p class="text-2xl font-bold text-red-600 mt-1" id="overload-count">0</p>
                </div>
                <div class="bg-white rounded-xl shadow-md p-5 border-l-4 border-yellow-500">
                    <p class="text-gray-500 text-sm">距离过远提醒</p>
                    <p class="text-2xl font-bold text-yellow-600 mt-1" id="distance-alert-count">0</p>
                </div>
                <div class="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-500">
                    <p class="text-gray-500 text-sm">平均健康度</p>
                    <p class="text-2xl font-bold text-blue-600 mt-1" id="avg-health-score">0%</p>
                </div>
            </div>

            <!-- 评估结果表格 -->
            <div class="bg-white rounded-xl shadow-md overflow-hidden">
                <div class="px-6 py-4 border-b flex justify-between items-center">
                    <h3 class="text-lg font-semibold">详细评估结果</h3>
                    <div class="flex items-center gap-4 text-sm">
                        <div class="flex items-center gap-1">
                            <span class="w-3 h-3 rounded-full bg-red-500"></span>
                            <span class="text-gray-600">&gt;5个项目（过载）</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="w-3 h-3 rounded-full bg-yellow-500"></span>
                            <span class="text-gray-600">&gt;300km（距离远）</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="w-3 h-3 rounded-full bg-blue-500"></span>
                            <span class="text-gray-600">技能匹配度</span>
                        </div>
                    </div>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">人员</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">部门</th>
                                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">项目数量</th>
                                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">技能匹配度</th>
                                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">最远距离</th>
                                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">健康度评分</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">建议</th>
                            </tr>
                        </thead>
                        <tbody id="assessment-table-body" class="divide-y divide-gray-200">
                            <tr><td colspan="7" class="text-center py-8 text-gray-500">点击"评估"按钮开始评估</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- 可视化图表 -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div class="bg-white rounded-xl shadow-md p-6">
                    <h3 class="text-lg font-semibold mb-4">人员项目负荷分布</h3>
                    <div id="project-load-chart" style="height: 300px;"></div>
                </div>
                
                <div class="bg-white rounded-xl shadow-md p-6">
                    <h3 class="text-lg font-semibold mb-4">健康度评分分布</h3>
                    <div id="health-score-chart" style="height: 300px;"></div>
                </div>
            </div>

            <!-- 技能匹配详情 -->
            <div class="bg-white rounded-xl shadow-md p-6 mt-6">
                <h3 class="text-lg font-semibold mb-4">技能匹配度详情</h3>
                <div id="skill-match-details" class="space-y-4">
                    <p class="text-gray-500">点击"评估"按钮查看详情</p>
                </div>
            </div>
        </div>`;
    },

    /**
     * 初始化人员负荷评估页面
     */
    initPersonnelAssessment() {
        console.log('[App] 初始化人员负荷评估页面...');
        
        // 确保容器存在
        const container = document.getElementById('personnel-assessment-container');
        if (!container) {
            console.error('[App] 未找到人员评估容器');
            return;
        }
        
        // 如果还没有内容，预加载
        if (!container.innerHTML.trim() || container.innerHTML.includes('由app.js动态加载')) {
            this.preloadPersonnelAssessment();
        }
        
        // 延迟初始化，确保DOM已渲染
        setTimeout(() => {
            if (typeof assessmentModule !== 'undefined' && assessmentModule.init) {
                console.log('[App] 调用 assessmentModule.init()');
                assessmentModule.init();
            } else {
                console.error('[App] assessmentModule 未定义或没有init方法');
            }
        }, 200);
    },

    /**
     * 加载人员负荷评估页面（加载HTML结构）- 保留此方法以兼容
     */
    loadPersonnelAssessment() {
        console.log('[App] loadPersonnelAssessment 被调用');
        this.preloadPersonnelAssessment();
    },

    // ==================== 项目相关 ====================

    /**
     * 渲染项目列表
     */
    renderProjects(filteredProjects) {
        const projects = filteredProjects || dataStore.getAllProjects();
        const tbody = document.getElementById('projects-table-body');
        
        if (!tbody) return;
        
        if (projects.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-8 text-gray-500">
                        <i class="fas fa-inbox text-4xl mb-2"></i><br>
                        暂无项目数据
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = projects.map(project => {
            const currentStage = projectManager.getCurrentStage(project);
            const stageClass = currentStage.status === 'completed' ? 'stage-completed' :
                              currentStage.status === 'ongoing' ? 'stage-ongoing' : 'stage-pending';
            const leader = currentStage.leaderId ? 
                dataStore.getPersonnel(currentStage.leaderId)?.name : '未分配';
            
            // 处理工艺显示
            const processes = project.scale?.processes || [project.scale?.processType].filter(Boolean);
            const processNames = processes.map(p => PROCESS_TYPES[p] || p).join(', ');
            
            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 font-medium text-gray-900">${project.name}</td>
                    <td class="px-6 py-4 text-gray-600">${project.location?.province || ''} ${project.location?.city || ''} ${project.location?.district || ''}</td>
                    <td class="px-6 py-4">${project.scale?.designCapacity ? project.scale.designCapacity + ' Nm³/h' : '-'}</td>
                    <td class="px-6 py-4">${processNames || '-'}</td>
                    <td class="px-6 py-4">
                        <span class="stage-badge ${stageClass}">${currentStage.stageName}</span>
                    </td>
                    <td class="px-6 py-4 text-gray-600">${leader}</td>
                    <td class="px-6 py-4">
                        <div class="table-actions">
                            <button onclick="app.showProjectDetail('${project.id}')" class="table-action-btn" title="详情">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button onclick="app.editProject('${project.id}')" class="table-action-btn" title="编辑">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="app.showRecommendations('${project.id}')" class="table-action-btn" title="推荐">
                                <i class="fas fa-lightbulb"></i>
                            </button>
                            <button onclick="app.deleteProject('${project.id}')" class="table-action-btn delete" title="删除">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * 筛选项目
     */
    filterProjects() {
        const keyword = document.getElementById('project-search')?.value.toLowerCase() || '';
        const stageFilter = document.getElementById('project-stage-filter')?.value || '';
        const provinceFilter = document.getElementById('project-province-filter')?.value || '';
        
        let projects = dataStore.getAllProjects();
        
        if (keyword) {
            projects = projects.filter(p => 
                p.name.toLowerCase().includes(keyword) ||
                p.location?.province?.includes(keyword) ||
                p.location?.city?.includes(keyword) ||
                p.location?.district?.includes(keyword)
            );
        }
        
        if (stageFilter) {
            projects = projects.filter(p => {
                const currentStage = projectManager.getCurrentStage(p);
                return currentStage.stage === stageFilter;
            });
        }
        
        if (provinceFilter) {
            projects = projects.filter(p => p.location?.province === provinceFilter);
        }
        
        this.renderProjects(projects);
    },

    /**
     * 显示项目详情
     * @param {string} projectId - 项目ID
     */
    showProjectDetail(projectId) {
        const project = projectManager.getProjectDetail(projectId);
        if (!project) return;
        
        // 处理工艺显示
        const processes = project.scale?.processes || [project.scale?.processType].filter(Boolean);
        const processNames = processes.map(p => PROCESS_TYPES[p] || p).join(', ') || '未知';
        
        let stagesHtml = '';
        const stageKeys = ['tracking', 'contract', 'procedure', 'construction', 'operation'];
        
        stageKeys.forEach(key => {
            const stage = project.lifecycle?.[key];
            if (stage) {
                const leaderName = stage.leaderId ? 
                    dataStore.getPersonnel(stage.leaderId)?.name : '未分配';
                stagesHtml += `
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                            <span class="font-medium">${STAGE_NAMES[key]}</span>
                            <span class="text-gray-500 text-sm ml-2">${formatDateDisplay(stage.startDate)} 至 ${formatDateDisplay(stage.endDate)}</span>
                        </div>
                        <div class="text-right">
                            <span class="text-sm text-gray-600">牵头: ${leaderName}</span>
                        </div>
                    </div>
                `;
            }
        });

        // 其他信息
        let otherInfoHtml = '';
        if (project.notes) {
            otherInfoHtml = `
                <div class="mt-4">
                    <label class="text-sm text-gray-500">备注信息</label>
                    <p class="font-medium bg-gray-50 p-3 rounded-lg mt-1">${project.notes}</p>
                </div>
            `;
        }
        
        const content = `
            <div class="space-y-6">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-sm text-gray-500">设计规模</label>
                        <p class="font-medium">${project.scale?.designCapacity || '-'} Nm³/h</p>
                    </div>
                    <div>
                        <label class="text-sm text-gray-500">日产气量</label>
                        <p class="font-medium">${project.scale?.dailyOutput || '-'} 千方/天</p>
                    </div>
                    <div>
                        <label class="text-sm text-gray-500">处理工艺</label>
                        <p class="font-medium">${processNames}</p>
                    </div>
                    <div>
                        <label class="text-sm text-gray-500">详细地址</label>
                        <p class="font-medium">${project.location?.province || ''}${project.location?.city || ''}${project.location?.district || ''}${project.location?.address || '-'}</p>
                    </div>
                </div>
                
                ${otherInfoHtml}
                
                <div>
                    <h4 class="font-semibold mb-3">项目生命周期</h4>
                    <div class="space-y-2">
                        ${stagesHtml}
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('detail-project-name').textContent = project.name;
        document.getElementById('project-detail-content').innerHTML = content;
        document.getElementById('project-detail-modal').classList.remove('hidden');
    },

    /**
     * 关闭项目详情弹窗
     */
    closeProjectDetailModal() {
        document.getElementById('project-detail-modal').classList.add('hidden');
    },

    /**
     * 显示项目编辑弹窗
     * @param {string} projectId - 项目ID（可选，为空则新建）
     */
    showProjectModal(projectId) {
        console.log('[App] 显示项目弹窗, projectId:', projectId || '(新建)');
        
        const modal = document.getElementById('project-modal');
        const form = document.getElementById('project-form');
        const title = document.getElementById('project-modal-title');
        
        if (!modal || !form) {
            console.error('[App] 未找到项目弹窗或表单');
            return;
        }
        
        form.reset();
        document.getElementById('project-id').value = '';
        
        // 重置省市区选择
        const citySelect = document.getElementById('project-city');
        const districtSelect = document.getElementById('project-district');
        if (citySelect) citySelect.innerHTML = '<option value="">请选择城市</option>';
        if (districtSelect) districtSelect.innerHTML = '<option value="">请选择区县</option>';
        
        // 填充人员选择器
        this.fillPersonnelSelects();
        
        if (projectId) {
            const project = dataStore.getProject(projectId);
            if (!project) {
                console.error('[App] 未找到项目:', projectId);
                return;
            }
            
            title.textContent = '编辑项目';
            document.getElementById('project-id').value = project.id;
            document.getElementById('project-name').value = project.name || '';
            document.getElementById('project-address').value = project.location?.address || '';
            document.getElementById('project-capacity').value = project.scale?.designCapacity || '';
            document.getElementById('project-daily-output').value = project.scale?.dailyOutput || '';
            document.getElementById('project-electricity').value = project.costs?.electricityPrice || '';
            document.getElementById('project-steam').value = project.costs?.steamPrice || '';
            document.getElementById('project-notes').value = project.notes || '';
            
            // 设置省市区 - 使用同步方式确保正确
            if (project.location?.province) {
                const provinceSelect = document.getElementById('project-province');
                if (provinceSelect) {
                    provinceSelect.value = project.location.province;
                    this.onProvinceChange();
                    
                    if (project.location.city) {
                        setTimeout(() => {
                            const citySelect = document.getElementById('project-city');
                            if (citySelect) {
                                citySelect.value = project.location.city;
                                this.onCityChange();
                                
                                if (project.location.district) {
                                    setTimeout(() => {
                                        const districtSelect = document.getElementById('project-district');
                                        if (districtSelect) {
                                            districtSelect.value = project.location.district;
                                        }
                                    }, 50);
                                }
                            }
                        }, 50);
                    }
                }
            }
            
            // 设置处理工艺多选框
            const processes = project.scale?.processes || [project.scale?.processType].filter(Boolean);
            if (processes) {
                const checkboxes = form.querySelectorAll('input[name="processes"]');
                checkboxes.forEach(cb => {
                    cb.checked = processes.includes(cb.value);
                });
                
                // 处理其他工艺
                const otherCheck = document.getElementById('process-other-check');
                const otherInputContainer = document.getElementById('process-other-input-container');
                const otherProcesses = processes.filter(p => !PROCESS_TYPES[p]);
                if (otherProcesses.length > 0 && otherCheck && otherInputContainer) {
                    otherCheck.checked = true;
                    otherInputContainer.classList.remove('hidden');
                    const otherInput = document.getElementById('project-process-other');
                    if (otherInput) otherInput.value = otherProcesses.join(', ');
                }
            }
            
            // 填充阶段信息
            const stages = project.lifecycle || {};
            Object.entries(stages).forEach(([key, stage]) => {
                const startEl = document.getElementById(`stage-${key}-start`);
                const endEl = document.getElementById(`stage-${key}-end`);
                const leaderEl = document.getElementById(`stage-${key}-leader`);
                
                if (startEl) startEl.value = stage.startDate || '';
                if (endEl) endEl.value = stage.endDate || '';
                if (leaderEl) leaderEl.value = stage.leaderId || '';
            });
        } else {
            title.textContent = '新建项目';
            // 设置默认日期
            const today = getToday();
            const startEl = document.getElementById('stage-tracking-start');
            if (startEl) startEl.value = today;
        }
        
        modal.classList.remove('hidden');
        console.log('[App] 项目弹窗已显示');
    },

    /**
     * 关闭项目编辑弹窗
     */
    closeProjectModal() {
        const modal = document.getElementById('project-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    /**
     * 保存项目
     */
    saveProject() {
        console.log('[App] saveProject 被调用');
        
        const id = document.getElementById('project-id')?.value || '';
        
        // 收集处理工艺
        const processes = [];
        document.querySelectorAll('input[name="processes"]:checked').forEach(cb => {
            processes.push(cb.value);
        });
        
        // 收集其他工艺
        const otherCheck = document.getElementById('process-other-check');
        if (otherCheck && otherCheck.checked) {
            const otherValue = document.getElementById('project-process-other')?.value;
            if (otherValue) {
                otherValue.split(/[,，]/).map(s => s.trim()).filter(s => s).forEach(p => {
                    processes.push(p);
                });
            }
        }

        // 获取省市区信息
        const province = document.getElementById('project-province')?.value || '';
        const city = document.getElementById('project-city')?.value || '';
        const district = document.getElementById('project-district')?.value || '';
        
        // 获取坐标 - 如果是编辑，保留原坐标；如果是新建，尝试从区县获取
        let longitude = 0;
        let latitude = 0;
        
        if (id) {
            const existingProject = dataStore.getProject(id);
            if (existingProject?.location?.longitude) {
                longitude = existingProject.location.longitude;
                latitude = existingProject.location.latitude;
            }
        }
        
        const projectData = {
            id: id || undefined,
            name: document.getElementById('project-name')?.value || '',
            location: {
                province: province,
                city: city,
                district: district,
                address: document.getElementById('project-address')?.value || '',
                longitude: longitude,
                latitude: latitude
            },
            scale: {
                designCapacity: parseFloat(document.getElementById('project-capacity')?.value) || 0,
                dailyOutput: parseFloat(document.getElementById('project-daily-output')?.value) || 0,
                processes: processes,
                processType: processes[0] || 'psa'
            },
            costs: {
                electricityPrice: parseFloat(document.getElementById('project-electricity')?.value) || 0,
                steamPrice: parseFloat(document.getElementById('project-steam')?.value) || 0
            },
            notes: document.getElementById('project-notes')?.value || '',
            lifecycle: {}
        };
        
        // 收集阶段信息
        const stageKeys = ['tracking', 'contract', 'procedure', 'construction', 'operation'];
        stageKeys.forEach(key => {
            const startDate = document.getElementById(`stage-${key}-start`)?.value;
            if (startDate) {
                projectData.lifecycle[key] = {
                    startDate: startDate,
                    endDate: document.getElementById(`stage-${key}-end`)?.value || null,
                    leaderId: document.getElementById(`stage-${key}-leader`)?.value || null,
                    status: 'pending'
                };
            }
        });
        
        console.log('[App] 项目数据已收集:', projectData);
        
        // 如果没有坐标但有区县信息，先尝试通过区县获取坐标
        if ((!longitude || !latitude) && (province || city || district)) {
            console.log('[App] 项目无坐标，尝试通过区县获取...');
            this.performSaveWithGeocode(projectData);
        } else {
            // 执行保存
            this.performSave(projectData);
        }
    },

    /**
     * 带地理编码的保存
     */
    async performSaveWithGeocode(projectData) {
        // 使用区县坐标库（不依赖高德API）
        let coords = null;
        const district = projectData.location.district;
        const city = projectData.location.city;
        const province = projectData.location.province;
        
        // 尝试区县
        if (district && typeof getDistrictCoordinate === 'function') {
            coords = getDistrictCoordinate(district);
            if (coords) {
                console.log('[App] ✅ 从区县库获取坐标:', district, coords);
            }
        }
        
        // 尝试城市
        if (!coords && city && typeof getDistrictCoordinate === 'function') {
            coords = getDistrictCoordinate(city);
            if (coords) {
                console.log('[App] ✅ 从城市库获取坐标:', city, coords);
            }
        }
        
        // 尝试省份
        if (!coords && province && typeof getDistrictCoordinate === 'function') {
            coords = getDistrictCoordinate(province);
            if (coords) {
                console.log('[App] ✅ 从省份库获取坐标:', province, coords);
            }
        }
        
        if (coords) {
            projectData.location.longitude = coords[0];
            projectData.location.latitude = coords[1];
        } else {
            console.warn('[App] ⚠️ 未找到坐标:', province, city, district);
        }
        
        // 继续保存
        this.performSave(projectData);
    },

    /**
     * 执行保存
     */
    performSave(projectData) {
        console.log('[App] 执行保存，项目ID:', projectData.id || '(新建)');

        let result;

        if (projectData.id) {
            result = projectManager.updateProject(projectData.id, projectData);
            console.log('[App] 调用 updateProject 结果:', result);
        } else {
            result = projectManager.createProject(projectData);
            console.log('[App] 调用 createProject 结果:', result);
        }

        if (result.success) {
            // 根据用户权限决定是否同步到云端
            if (auth.isAdmin()) {
                // 管理员：自动同步到云端
                dataStore.syncProjectToCloud(result.project);
                showToast(projectData.id ? '项目更新成功，已同步到云端' : '项目创建成功，已同步到云端', 'success');
            } else {
                // 普通用户：保存本地，提示需要管理员授权才能同步到云端
                showToast(projectData.id ? '项目更新成功（本地保存）' : '项目创建成功（本地保存）', 'success');
            }

            this.closeProjectModal();
            this.renderProjects();
            this.updateDashboard();

            // 异步尝试地理编码更新坐标
            this.tryGeocodeAsync(result.project || projectData);

            if (mapVisualization.map) {
                mapVisualization.showAllProjects();
            }
        } else {
            const errors = result.errors || result.error || ['保存失败'];
            const errorMsg = Array.isArray(errors) ? errors.join('，') : String(errors);
            console.error('[App] 保存失败:', errorMsg);
            showToast(errorMsg, 'error');
        }
    },
    
    /**
     * 异步尝试地理编码
     */
    async tryGeocodeAsync(project) {
        try {
            const address = `${project.location?.province || ''}${project.location?.city || ''}${project.location?.district || ''}${project.location?.address || ''}`;
            if (!address || typeof mapVisualization.geocodeAddress !== 'function') {
                return;
            }
            
            console.log('[App] 尝试地理编码:', address);
            const coords = await mapVisualization.geocodeAddress(address);
            
            if (coords && project.id) {
                const updatedProject = dataStore.getProject(project.id);
                if (updatedProject) {
                    updatedProject.location.longitude = coords.longitude;
                    updatedProject.location.latitude = coords.latitude;
                    dataStore.saveProject(updatedProject);
                    console.log('[App] 地理编码成功，坐标已更新');
                    
                    // 刷新地图
                    if (mapVisualization.map) {
                        mapVisualization.showAllProjects();
                    }
                }
            }
        } catch (error) {
            console.warn('[App] 地理编码失败（不影响保存）:', error);
        }
    },

    /**
     * 编辑项目
     * @param {string} projectId - 项目ID
     */
    editProject(projectId) {
        this.showProjectModal(projectId);
    },

    /**
     * 删除项目
     * @param {string} projectId - 项目ID
     */
    deleteProject(projectId) {
        confirmDialog('确定要删除这个项目吗？', () => {
            if (projectManager.deleteProject(projectId)) {
                showToast('项目删除成功', 'success');
                this.renderProjects();
                this.updateDashboard();
            }
        });
    },

    // ==================== 人员相关 ====================

    /**
     * 渲染人员列表
     */
    renderPersonnel(filterDept = '') {
        let personnel = dataStore.getAllPersonnel();
        
        // 按部门筛选
        if (filterDept) {
            personnel = personnel.filter(p => p.department === filterDept);
        }
        
        const grid = document.getElementById('personnel-grid');
        
        if (!grid) return;
        
        if (personnel.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12 text-gray-500">
                    <i class="fas fa-users text-4xl mb-2"></i><br>
                    暂无人员数据
                </div>
            `;
            return;
        }
        
        grid.innerHTML = personnel.map(person => {
            const workload = personnelManager.calculateWorkload(person.id);
            
            // 技能标签
            const skills = person.experience?.processes || [];
            const skillTags = skills.map(p => {
                const name = PROCESS_TYPES[p] || p;
                const isStandard = PROCESS_TYPES[p];
                return `<span class="personnel-tag ${isStandard ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}">${name}</span>`;
            }).join('');
            
            // 自定义技能
            const customSkills = person.customSkills || [];
            const customSkillTags = customSkills.map(s => 
                `<span class="personnel-tag bg-purple-100 text-purple-700">${s}</span>`
            ).join('');
            
            const avatarText = person.name ? person.name.charAt(0) : '?';
            const workloadColor = workload?.isOverloaded ? 'text-red-600' : 
                                 workload?.workloadPercent >= 70 ? 'text-yellow-600' : 'text-green-600';
            
            return `
                <div class="personnel-card card-hover">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center gap-3">
                            <div class="personnel-avatar">${avatarText}</div>
                            <div>
                                <div class="personnel-name">${person.name}</div>
                                <div class="personnel-role">${person.position || '无职位'} | ${person.department || '无部门'}</div>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="app.editPersonnel('${person.id}')" class="text-blue-400 hover:text-blue-600" title="编辑">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="app.deletePersonnel('${person.id}')" class="text-red-400 hover:text-red-600" title="删除">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="personnel-tags mb-3">${skillTags}${customSkillTags}</div>
                    
                    <div class="personnel-stats">
                        <div class="stat-item">
                            <div class="stat-value">${person.experience?.projectCount || 0}</div>
                            <div class="stat-label">项目经验</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value ${workloadColor}">${workload?.currentProjects || 0}/${person.maxProjects || 3}</div>
                            <div class="stat-label">当前项目</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${person.experience?.years || '-'}</div>
                            <div class="stat-label">工作年限</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * 按部门筛选人员
     */
    filterPersonnelByDept(dept) {
        // 更新按钮样式 - 使用 data-dept 属性匹配
        const buttons = document.querySelectorAll('#department-filters button');
        buttons.forEach(btn => {
            const btnDept = btn.dataset.dept || '';
            if (btnDept === dept) {
                btn.className = 'px-4 py-2 bg-blue-600 text-white rounded-lg text-sm';
            } else {
                btn.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition';
            }
        });
        
        this.renderPersonnel(dept);
    },

    /**
     * 显示人员编辑弹窗
     */
    showPersonnelModal(personId) {
        const modal = document.getElementById('personnel-modal');
        const form = document.getElementById('personnel-form');
        const title = document.getElementById('personnel-modal-title');
        
        if (!modal || !form) return;
        
        form.reset();
        const idInput = document.getElementById('personnel-id');
        if (idInput) idInput.value = '';
        
        if (personId) {
            const person = dataStore.getPersonnel(personId);
            if (!person) return;
            
            title.textContent = '编辑人员';
            if (idInput) idInput.value = person.id;
            
            const nameEl = document.getElementById('personnel-name');
            const genderEl = document.getElementById('personnel-gender');
            const ageEl = document.getElementById('personnel-age');
            const deptEl = document.getElementById('personnel-department');
            const posEl = document.getElementById('personnel-position');
            const expEl = document.getElementById('personnel-experience');
            const yearsEl = document.getElementById('personnel-years');
            const maxProjEl = document.getElementById('personnel-max-projects');
            const phoneEl = document.getElementById('personnel-phone');
            const emailEl = document.getElementById('personnel-email');
            
            if (nameEl) nameEl.value = person.name || '';
            if (genderEl) genderEl.value = person.gender || '男';
            if (ageEl) ageEl.value = person.age || '';
            if (deptEl) deptEl.value = person.department || '';
            if (posEl) posEl.value = person.position || '';
            if (expEl) expEl.value = person.experience?.projectCount || '';
            if (yearsEl) yearsEl.value = person.experience?.years || '';
            if (maxProjEl) maxProjEl.value = person.maxProjects || 3;
            if (phoneEl) phoneEl.value = person.contact?.phone || '';
            if (emailEl) emailEl.value = person.contact?.email || '';
            
            // 设置熟悉工艺（技能）
            const skillCheckboxes = form.querySelectorAll('input[name="skills"]');
            skillCheckboxes.forEach(cb => {
                cb.checked = person.experience?.processes?.includes(cb.value) || false;
            });
            
            // 设置自定义技能
            const customSkillsEl = document.getElementById('personnel-custom-skills');
            if (customSkillsEl && person.customSkills) {
                customSkillsEl.value = person.customSkills.join(', ');
            }
            
            // 设置能力评分
            if (person.capabilities) {
                const capFields = ['technical', 'management', 'coordination', 'communication', 'problem', 'learning', 'safety', 'teamwork'];
                capFields.forEach(field => {
                    const slider = document.getElementById(`capability-${field}`);
                    const valueEl = document.getElementById(`capability-${field}-value`);
                    if (slider && person.capabilities[field] !== undefined) {
                        slider.value = person.capabilities[field];
                    }
                    if (valueEl && person.capabilities[field] !== undefined) {
                        valueEl.textContent = person.capabilities[field];
                    }
                });
            }

            // 设置学历、专业、职称
            const eduEl = document.getElementById('personnel-education');
            const majorEl = document.getElementById('personnel-major');
            const titleEl = document.getElementById('personnel-title');
            const certEl = document.getElementById('personnel-certificates');
            if (eduEl) eduEl.value = person.education || '';
            if (majorEl) majorEl.value = person.major || '';
            if (titleEl) titleEl.value = person.title || '';
            if (certEl) certEl.value = person.certificates || '';
        } else {
            title.textContent = '添加人员';
            // 重置能力评估滑块
            const capabilityFields = ['technical', 'management', 'coordination', 'communication', 'problem', 'learning', 'safety', 'teamwork'];
            capabilityFields.forEach(field => {
                const slider = document.getElementById(`capability-${field}`);
                const value = document.getElementById(`capability-${field}-value`);
                if (slider) slider.value = 5;
                if (value) value.textContent = '5';
            });
        }

        modal.classList.remove('hidden');
    },

    /**
     * 关闭人员编辑弹窗
     */
    closePersonnelModal() {
        const modal = document.getElementById('personnel-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    /**
     * 保存人员
     */
    savePersonnel() {
        console.log('[App] savePersonnel 被调用');

        const id = document.getElementById('personnel-id')?.value || '';

        // 收集熟悉技能
        const skills = [];
        document.querySelectorAll('input[name="skills"]:checked').forEach(cb => {
            skills.push(cb.value);
        });

        // 收集自定义技能
        const customSkillsInput = document.getElementById('personnel-custom-skills')?.value;
        const customSkills = customSkillsInput ? customSkillsInput.split(/[,，]/).map(s => s.trim()).filter(s => s) : [];

        const personData = {
            id: id || undefined,
            name: document.getElementById('personnel-name')?.value || '',
            gender: document.getElementById('personnel-gender')?.value || '男',
            age: parseInt(document.getElementById('personnel-age')?.value) || null,
            department: document.getElementById('personnel-department')?.value || '',
            position: document.getElementById('personnel-position')?.value || '',
            education: document.getElementById('personnel-education')?.value || '',
            major: document.getElementById('personnel-major')?.value || '',
            title: document.getElementById('personnel-title')?.value || '',
            certificates: document.getElementById('personnel-certificates')?.value || '',
            experience: {
                projectCount: parseInt(document.getElementById('personnel-experience')?.value) || 0,
                years: parseInt(document.getElementById('personnel-years')?.value) || 0,
                processes: skills
            },
            customSkills: customSkills,
            capabilities: {
                technical: parseInt(document.getElementById('capability-technical')?.value) || 5,
                management: parseInt(document.getElementById('capability-management')?.value) || 5,
                coordination: parseInt(document.getElementById('capability-coordination')?.value) || 5,
                communication: parseInt(document.getElementById('capability-communication')?.value) || 5,
                problem: parseInt(document.getElementById('capability-problem')?.value) || 5,
                learning: parseInt(document.getElementById('capability-learning')?.value) || 5,
                safety: parseInt(document.getElementById('capability-safety')?.value) || 5,
                teamwork: parseInt(document.getElementById('capability-teamwork')?.value) || 5
            },
            maxProjects: parseInt(document.getElementById('personnel-max-projects')?.value) || 3,
            contact: {
                phone: document.getElementById('personnel-phone')?.value || '',
                email: document.getElementById('personnel-email')?.value || ''
            }
        };

        console.log('[App] 人员数据已收集:', personData);

        let result;
        if (id) {
            result = personnelManager.updatePersonnel(id, personData);
            console.log('[App] 调用 updatePersonnel 结果:', result);
        } else {
            result = personnelManager.createPersonnel(personData);
            console.log('[App] 调用 createPersonnel 结果:', result);
        }

        if (result.success) {
            // 根据用户权限决定是否同步到云端
            if (auth.isAdmin()) {
                // 管理员：自动同步到云端
                dataStore.syncPersonnelToCloud(result.person);
                showToast(id ? '人员更新成功，已同步到云端' : '人员添加成功，已同步到云端', 'success');
            } else {
                // 普通用户：保存本地，提示需要管理员授权才能同步到云端
                showToast(id ? '人员更新成功（本地保存）' : '人员添加成功（本地保存）', 'success');
            }

            this.closePersonnelModal();
            this.renderPersonnel();
            this.updateDashboard();
        } else {
            const errors = result.errors || result.error || ['保存失败'];
            const errorMsg = Array.isArray(errors) ? errors.join('，') : String(errors);
            console.error('[App] 人员保存失败:', errorMsg);
            showToast(errorMsg, 'error');
        }
    },

    /**
     * 编辑人员
     */
    editPersonnel(personId) {
        this.showPersonnelModal(personId);
    },

    /**
     * 删除人员
     * @param {string} personId - 人员ID
     */
    deletePersonnel(personId) {
        const person = dataStore.getPersonnel(personId);
        if (!person) {
            showToast('人员不存在', 'error');
            return;
        }

        // 检查该人员是否是项目的牵头人
        const projects = dataStore.getAllProjects();
        let leaderProjects = [];
        projects.forEach(project => {
            if (project.lifecycle) {
                Object.values(project.lifecycle).forEach(stage => {
                    if (stage.leaderId === personId) {
                        leaderProjects.push(project.name);
                    }
                });
            }
        });

        let confirmMessage = `确定要删除"${person.name}"吗？`;
        if (leaderProjects.length > 0) {
            confirmMessage += `\n\n注意：该人员是以下项目的牵头人：\n${leaderProjects.join('\n')}`;
        }

        if (confirm(confirmMessage)) {
            if (personnelManager.deletePersonnel(personId)) {
                showToast('人员删除成功', 'success');
                this.renderPersonnel();
                this.updateDashboard();
            } else {
                showToast('删除失败', 'error');
            }
        }
    },

    // ==================== 智能推荐 ====================

    /**
     * 显示推荐结果
     * @param {string} projectId - 项目ID
     */
    showRecommendations(projectId) {
        const project = dataStore.getProject(projectId);
        if (!project) return;
        
        const recommendations = smartRecommendation.batchRecommend(projectId);
        
        let content = `
            <div class="mb-6">
                <h4 class="text-lg font-semibold mb-2">${project.name}</h4>
                <p class="text-gray-500">基于项目位置、工艺、人员负荷等因素的智能推荐</p>
            </div>
        `;
        
        Object.entries(recommendations).forEach(([stageKey, data]) => {
            if (data.recommendations.length === 0) return;
            
            content += `
                <div class="mb-6">
                    <h5 class="font-medium mb-3 text-gray-700">${data.stageName}阶段推荐</h5>
                    <div class="space-y-2">
            `;
            
            data.recommendations.slice(0, 3).forEach((rec, index) => {
                const scoreClass = rec.score >= 80 ? 'score-high' : rec.score >= 60 ? 'score-medium' : 'score-low';
                
                content += `
                    <div class="recommendation-item">
                        <div class="recommendation-score ${scoreClass}">${rec.score}</div>
                        <div class="flex-1">
                            <div class="font-medium">${rec.person.name}</div>
                            <div class="text-sm text-gray-500">${rec.reason}</div>
                            <div class="text-xs text-gray-400 mt-1">
                                工艺匹配:${rec.details.processMatch}% | 
                                经验:${rec.details.experience}% | 
                                距离:${rec.details.distance}% | 
                                负荷:${rec.details.workload}% | 
                                能力:${rec.details.capability}%
                            </div>
                        </div>
                        <button onclick="app.assignLeader('${projectId}', '${stageKey}', '${rec.person.id}')" 
                                class="px-3 py-1 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700">
                            指派
                        </button>
                    </div>
                `;
            });
            
            content += `</div></div>`;
        });
        
        const recContent = document.getElementById('recommendation-content');
        if (recContent) recContent.innerHTML = content;
        
        const recModal = document.getElementById('recommendation-modal');
        if (recModal) recModal.classList.remove('hidden');
    },

    /**
     * 关闭推荐弹窗
     */
    closeRecommendationModal() {
        const modal = document.getElementById('recommendation-modal');
        if (modal) modal.classList.add('hidden');
    },

    /**
     * 指派牵头人
     */
    assignLeader(projectId, stageKey, personId) {
        const project = dataStore.getProject(projectId);
        if (!project) return;

        if (!project.lifecycle) project.lifecycle = {};
        if (!project.lifecycle[stageKey]) project.lifecycle[stageKey] = {};

        project.lifecycle[stageKey].leaderId = personId;

        // 保存项目
        const savedProject = dataStore.saveProject(project);

        // 根据用户权限决定是否同步到云端
        if (auth.isAdmin()) {
            // 管理员：自动同步到云端
            dataStore.syncProjectToCloud(savedProject);
            showToast('指派成功，已同步到云端', 'success');
        } else {
            // 普通用户：仅保存本地
            showToast('指派成功（本地保存）', 'success');
        }

        dataStore.updatePersonnelProjects(personId, projectId, 'add');

        this.closeRecommendationModal();
        this.renderProjects();
    },

    // ==================== 辅助方法 ====================

    /**
     * 填充人员选择器
     */
    fillPersonnelSelects() {
        const personnel = dataStore.getAllPersonnel();
        const selects = document.querySelectorAll('.personnel-select');
        
        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">请选择</option>';
            
            personnel.forEach(person => {
                const option = document.createElement('option');
                option.value = person.id;
                option.textContent = `${person.name} (${person.department || '无部门'})`;
                select.appendChild(option);
            });
            
            select.value = currentValue;
        });
    },

    /**
     * 更新概览面板
     */
    updateDashboard() {
        const stats = dataStore.getStatistics();
        
        const totalProjectsEl = document.getElementById('stat-total-projects');
        const totalPersonnelEl = document.getElementById('stat-total-personnel');
        const projectGroupsEl = document.getElementById('stat-project-groups');
        const activeProjectsEl = document.getElementById('stat-active-projects');
        
        if (totalProjectsEl) totalProjectsEl.textContent = stats.totalProjects;
        if (totalPersonnelEl) totalPersonnelEl.textContent = stats.totalPersonnel;
        if (projectGroupsEl) projectGroupsEl.textContent = stats.projectGroups;
        if (activeProjectsEl) activeProjectsEl.textContent = stats.activeProjects;
        
        // 渲染状态分布图
        this.renderStatusChart();
    },

    /**
     * 渲染状态分布图
     */
    renderStatusChart() {
        const chartDom = document.getElementById('status-chart');
        if (!chartDom) return;
        
        const stats = projectManager.getStatistics();
        const data = Object.entries(stats.byStage).map(([key, value]) => ({
            name: STAGE_NAMES[key],
            value: value
        }));
        
        const chart = echarts.init(chartDom);
        const option = {
            tooltip: { trigger: 'item' },
            legend: { bottom: 0, left: 'center' },
            series: [{
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: { show: false },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: 'bold'
                    }
                },
                data: data
            }]
        };
        
        chart.setOption(option);
    },

    /**
     * 加载示例项目
     */
    loadSampleProjects() {
        const sampleProjects = [
            {
                name: '山东潍坊沼气提纯站',
                location: { province: '山东省', city: '潍坊市', district: '奎文区', address: '奎文区工业园路1号', longitude: 119.1619, latitude: 36.7089 },
                scale: { designCapacity: 5000, dailyOutput: 12, processes: ['dry_desulfurization', 'psa'], processType: 'psa' },
                costs: { electricityPrice: 0.6, steamPrice: 200 },
                notes: '首个示范项目，采用干法脱硫+PSA工艺',
                lifecycle: {
                    tracking: { startDate: '2025-01-01', endDate: '2025-01-31', status: 'completed' },
                    contract: { startDate: '2025-02-01', endDate: '2025-02-28', status: 'completed' },
                    procedure: { startDate: '2025-03-01', endDate: '2025-06-30', status: 'ongoing' },
                    construction: { startDate: '2025-07-01', endDate: '2025-11-30', status: 'pending' },
                    operation: { startDate: '2025-12-01', endDate: null, status: 'pending' }
                }
            },
            {
                name: '河北唐山沼气提纯站',
                location: { province: '河北省', city: '唐山市', district: '路北区', address: '路北区能源大道88号', longitude: 118.1812, latitude: 39.6292 },
                scale: { designCapacity: 8000, dailyOutput: 20, processes: ['wet_desulfurization', 'membrane'], processType: 'membrane' },
                costs: { electricityPrice: 0.55, steamPrice: 180 },
                notes: '大型项目，使用湿法脱硫+膜分离工艺',
                lifecycle: {
                    tracking: { startDate: '2025-02-01', endDate: '2025-02-28', status: 'completed' },
                    contract: { startDate: '2025-03-01', endDate: '2025-03-31', status: 'ongoing' },
                    procedure: { startDate: '2025-04-01', endDate: '2025-07-31', status: 'pending' },
                    construction: { startDate: '2025-08-01', endDate: '2025-12-31', status: 'pending' },
                    operation: { startDate: '2026-01-01', endDate: null, status: 'pending' }
                }
            },
            {
                name: '河南郑州沼气提纯站',
                location: { province: '河南省', city: '郑州市', district: '金水区', address: '金水区环保路66号', longitude: 113.6253, latitude: 34.7466 },
                scale: { designCapacity: 6000, dailyOutput: 15, processes: ['biological_desulfurization', 'psa'], processType: 'psa' },
                costs: { electricityPrice: 0.58, steamPrice: 190 },
                notes: '环保型项目，采用生物脱硫技术',
                lifecycle: {
                    tracking: { startDate: '2025-01-15', endDate: '2025-02-14', status: 'completed' },
                    contract: { startDate: '2025-02-15', endDate: '2025-03-15', status: 'completed' },
                    procedure: { startDate: '2025-03-16', endDate: '2025-07-15', status: 'ongoing' },
                    construction: { startDate: '2025-07-16', endDate: '2025-12-15', status: 'pending' },
                    operation: { startDate: '2025-12-16', endDate: null, status: 'pending' }
                }
            },
            {
                name: '山东青岛沼气提纯站',
                location: { province: '山东省', city: '青岛市', district: '城阳区', address: '城阳区新能源产业园', longitude: 120.3826, latitude: 36.0671 },
                scale: { designCapacity: 4500, dailyOutput: 10, processes: ['dry_desulfurization', 'chemical_absorption'], processType: 'chemical_absorption' },
                costs: { electricityPrice: 0.62, steamPrice: 210 },
                notes: '沿海项目，采用化学吸收法脱碳',
                lifecycle: {
                    tracking: { startDate: '2025-03-01', endDate: '2025-03-31', status: 'completed' },
                    contract: { startDate: '2025-04-01', endDate: '2025-04-30', status: 'completed' },
                    procedure: { startDate: '2025-05-01', endDate: '2025-08-31', status: 'ongoing' },
                    construction: { startDate: '2025-09-01', endDate: '2026-01-31', status: 'pending' },
                    operation: { startDate: '2026-02-01', endDate: null, status: 'pending' }
                }
            },
            {
                name: '天津沼气提纯站',
                location: { province: '天津市', city: '天津市', district: '滨海新区', address: '滨海新区能源路108号', longitude: 117.7028, latitude: 39.0265 },
                scale: { designCapacity: 7000, dailyOutput: 16, processes: ['wet_desulfurization', 'psa'], processType: 'psa' },
                costs: { electricityPrice: 0.65, steamPrice: 220 },
                notes: '直辖市项目，政策支持度高',
                lifecycle: {
                    tracking: { startDate: '2025-02-15', endDate: '2025-03-15', status: 'completed' },
                    contract: { startDate: '2025-03-16', endDate: '2025-04-15', status: 'completed' },
                    procedure: { startDate: '2025-04-16', endDate: '2025-08-15', status: 'ongoing' },
                    construction: { startDate: '2025-08-16', endDate: '2026-01-15', status: 'pending' },
                    operation: { startDate: '2026-01-16', endDate: null, status: 'pending' }
                }
            }
        ];

        sampleProjects.forEach(p => projectManager.createProject(p));
    },

    /**
     * 加载示例人员
     */
    loadSamplePersonnel() {
        const samplePersonnel = [
            {
                name: '张伟',
                gender: '男',
                age: 38,
                department: '工程部',
                position: '项目经理',
                experience: { projectCount: 15, years: 12, processes: ['psa', 'membrane', 'dry_desulfurization'] },
                customSkills: ['电气设计', '项目管理'],
                capabilities: { technical: 9, management: 8, coordination: 8 },
                maxProjects: 4,
                contact: { phone: '13800138001', email: 'zhangwei@example.com' }
            },
            {
                name: '李芳',
                gender: '女',
                age: 35,
                department: '技术部',
                position: '高级工程师',
                experience: { projectCount: 12, years: 10, processes: ['psa', 'chemical_absorption', 'biological_desulfurization'] },
                customSkills: ['工艺设计', '技术研发'],
                capabilities: { technical: 10, management: 7, coordination: 7 },
                maxProjects: 3,
                contact: { phone: '13800138002', email: 'lifang@example.com' }
            },
            {
                name: '王强',
                gender: '男',
                age: 42,
                department: '工程部',
                position: '工程总监',
                experience: { projectCount: 20, years: 15, processes: ['membrane', 'wet_desulfurization', 'dry_desulfurization'] },
                customSkills: ['现场施工', '安全管理'],
                capabilities: { technical: 8, management: 9, coordination: 9 },
                maxProjects: 5,
                contact: { phone: '13800138003', email: 'wangqiang@example.com' }
            },
            {
                name: '刘洋',
                gender: '男',
                age: 32,
                department: '运营部',
                position: '运营主管',
                experience: { projectCount: 8, years: 7, processes: ['psa', 'wet_desulfurization'] },
                customSkills: ['设备调试', '运营管理'],
                capabilities: { technical: 8, management: 7, coordination: 8 },
                maxProjects: 3,
                contact: { phone: '13800138004', email: 'liuyang@example.com' }
            },
            {
                name: '陈静',
                gender: '女',
                age: 29,
                department: '质量部',
                position: '质量工程师',
                experience: { projectCount: 5, years: 5, processes: ['membrane', 'chemical_absorption'] },
                customSkills: ['质量检测', '标准化'],
                capabilities: { technical: 9, management: 6, coordination: 7 },
                maxProjects: 2,
                contact: { phone: '13800138005', email: 'chenjing@example.com' }
            }
        ];

        samplePersonnel.forEach(p => personnelManager.createPersonnel(p));
    },

    // ==================== 部门管理 ====================

    /**
     * 显示部门管理弹窗
     */
    showDepartmentModal() {
        const modal = document.getElementById('department-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.renderDepartmentList();
        }
    },

    /**
     * 关闭部门管理弹窗
     */
    closeDepartmentModal() {
        const modal = document.getElementById('department-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    /**
     * 渲染部门列表
     */
    renderDepartmentList() {
        const container = document.getElementById('department-list');
        if (!container) return;

        if (DEPARTMENTS.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">暂无部门</p>';
            return;
        }

        container.innerHTML = DEPARTMENTS.map((dept, index) => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span class="font-medium">${dept}</span>
                <div class="flex gap-2">
                    <button onclick="app.editDepartment(${index})" class="text-blue-600 hover:text-blue-800 px-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="app.deleteDepartment(${index})" class="text-red-600 hover:text-red-800 px-2">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    /**
     * 添加新部门
     */
    addDepartment() {
        const input = document.getElementById('new-department-name');
        const name = input?.value?.trim();

        if (!name) {
            showToast('请输入部门名称', 'error');
            return;
        }

        if (DEPARTMENTS.includes(name)) {
            showToast('该部门已存在', 'error');
            return;
        }

        DEPARTMENTS.push(name);
        if (input) input.value = '';
        this.renderDepartmentList();
        this.initDepartmentFilters(); // 更新部门筛选按钮
        this.updateDepartmentSelects(); // 更新下拉选择框
        showToast('部门添加成功', 'success');
    },

    /**
     * 编辑部门
     */
    editDepartment(index) {
        const oldName = DEPARTMENTS[index];
        const newName = prompt('请输入新的部门名称:', oldName);

        if (newName === null) return; // 用户取消

        const trimmedName = newName.trim();
        if (!trimmedName) {
            showToast('部门名称不能为空', 'error');
            return;
        }

        if (trimmedName !== oldName && DEPARTMENTS.includes(trimmedName)) {
            showToast('该部门名称已存在', 'error');
            return;
        }

        // 更新所有使用该部门的人员
        const personnel = dataStore.getAllPersonnel();
        personnel.forEach(person => {
            if (person.department === oldName) {
                dataStore.savePersonnel({ ...person, department: trimmedName });
            }
        });

        DEPARTMENTS[index] = trimmedName;
        this.renderDepartmentList();
        this.initDepartmentFilters();
        this.updateDepartmentSelects();
        this.renderPersonnel(); // 刷新人员列表
        showToast('部门修改成功', 'success');
    },

    /**
     * 删除部门
     */
    deleteDepartment(index) {
        const dept = DEPARTMENTS[index];
        
        // 检查是否有人员在使用该部门
        const personnel = dataStore.getAllPersonnel();
        const usingCount = personnel.filter(p => p.department === dept).length;

        if (usingCount > 0) {
            showToast(`该部门下有 ${usingCount} 名人员，请先修改这些人员的部门`, 'error');
            return;
        }

        if (!confirm(`确定要删除部门"${dept}"吗？`)) return;

        DEPARTMENTS.splice(index, 1);
        this.renderDepartmentList();
        this.initDepartmentFilters();
        this.updateDepartmentSelects();
        showToast('部门删除成功', 'success');
    },

    /**
     * 更新所有部门选择框
     */
    updateDepartmentSelects() {
        // 更新人员表单中的部门选择
        const selects = document.querySelectorAll('#personnel-department, .personnel-select');
        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">请选择部门</option>' + 
                DEPARTMENTS.map(d => `<option value="${d}" ${d === currentValue ? 'selected' : ''}>${d}</option>`
                ).join('');
        });
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] DOMContentLoaded 事件触发');
    app.init();
});
