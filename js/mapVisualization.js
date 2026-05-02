/**
 * 地图可视化模块
 * 基于高德地图 API 2.0 实现项目点位展示、项目群聚合等功能
 */

const mapVisualization = {
    map: null,
    markers: [],
    circles: [],
    infoWindow: null,
    isInitialized: false,
    initRetryCount: 0,
    maxRetries: 5,

    /**
     * 初始化地图
     * @param {string} containerId - 容器ID
     */
    init(containerId = 'map-container') {
        console.log('[Map] ==================== 开始初始化地图 ====================');
        console.log('[Map] 容器ID:', containerId);
        console.log('[Map] AMap是否定义:', typeof AMap !== 'undefined');
        
        // 检查高德地图API是否加载
        if (typeof AMap === 'undefined') {
            console.error('[Map] ❌ 高德地图API未加载！');
            this.showError('地图API加载失败，请刷新页面重试');
            return;
        }

        // 检查容器是否存在
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[Map] ❌ 地图容器不存在:', containerId);
            return;
        }
        console.log('[Map] ✅ 容器存在');

        // 检查容器是否可见
        const computedStyle = window.getComputedStyle(container);
        console.log('[Map] 容器display:', computedStyle.display);
        console.log('[Map] 容器visibility:', computedStyle.visibility);
        console.log('[Map] 容器尺寸:', container.offsetWidth, 'x', container.offsetHeight);

        // 如果容器尺寸为0，延迟重试
        if (container.offsetWidth === 0 || container.offsetHeight === 0) {
            console.warn('[Map] ⚠️ 容器尺寸为0，可能尚未显示');
            if (this.initRetryCount < this.maxRetries) {
                this.initRetryCount++;
                console.log(`[Map] 第${this.initRetryCount}次重试，100ms后...`);
                setTimeout(() => this.init(containerId), 100);
                return;
            } else {
                console.error('[Map] ❌ 达到最大重试次数，放弃初始化');
                return;
            }
        }

        // 如果已经初始化，先销毁
        if (this.map) {
            console.log('[Map] 地图已存在，销毁后重新初始化');
            this.destroy();
        }

        try {
            console.log('[Map] 创建地图实例...');
            
            // 高德地图1.4.15 API创建方式
            this.map = new AMap.Map(containerId, {
                zoom: 5,
                center: [104.5, 35.5], // 中国中心
                resizeEnable: true
            });

            console.log('[Map] ✅ 地图实例创建成功');

            // 添加地图图层
            this.addTileLayer();

            // 添加地图控件
            this.addMapControls();

            // 创建信息窗体
            this.infoWindow = new AMap.InfoWindow({
                offset: new AMap.Pixel(0, -30)
            });

            this.isInitialized = true;
            this.initRetryCount = 0;
            
            // 添加加载完成标记
            container.classList.add('map-loaded');
            
            console.log('[Map] ✅ 地图初始化完成');

            // 强制刷新尺寸
            setTimeout(() => {
                if (this.map) {
                    console.log('[Map] 执行地图resize...');
                    this.map.resize();
                    
                    // 再次确认中心点和缩放级别
                    this.map.setCenter([104.5, 35.5]);
                    this.map.setZoom(5);
                }
            }, 300);

        } catch (error) {
            console.error('[Map] ❌ 地图初始化失败:', error);
            console.error('[Map] 错误堆栈:', error.stack);
            this.isInitialized = false;
            this.showError('地图初始化失败: ' + error.message);
        }
    },

    /**
     * 添加地图图层
     */
    addTileLayer() {
        if (!this.map) return;
        
        try {
            // 高德地图2.0默认会自动添加图层，不需要手动添加
            console.log('[Map] ✅ 地图图层已加载');
        } catch (e) {
            console.warn('[Map] 添加图层失败:', e);
        }
    },

    /**
     * 添加地图控件
     */
    addMapControls() {
        if (!this.map) return;

        try {
            // 添加比例尺
            const scale = new AMap.Scale({
                position: 'LB'
            });
            this.map.addControl(scale);
            console.log('[Map] ✅ 比例尺控件添加成功');
        } catch (e) {
            console.warn('[Map] 比例尺控件加载失败:', e);
        }
        
        try {
            // 添加工具条
            const toolbar = new AMap.ToolBar({
                position: 'RB',
                offset: new AMap.Pixel(10, 10)
            });
            this.map.addControl(toolbar);
            console.log('[Map] ✅ 工具条控件添加成功');
        } catch (e) {
            console.warn('[Map] 工具条控件加载失败:', e);
        }
    },

    /**
     * 显示错误信息
     */
    showError(message) {
        const container = document.getElementById('map-container');
        if (container) {
            container.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;color:#666;">
                    <i class="fas fa-exclamation-triangle" style="font-size:48px;color:#f59e0b;margin-bottom:16px;"></i>
                    <p>${message}</p>
                    <button onclick="mapVisualization.init()" style="margin-top:16px;padding:8px 16px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;">
                        重新加载
                    </button>
                </div>
            `;
        }
    },

    /**
     * 确保地图已初始化
     */
    ensureInitialized() {
        if (!this.map) {
            console.log('[Map] 地图未初始化，执行初始化');
            this.init();
            return false;
        }
        return true;
    },

    /**
     * 添加项目标记
     * @param {Object} project - 项目数据
     */
    addProjectMarker(project) {
        if (!this.map) {
            console.warn('[Map] ⚠️ 地图未初始化，无法添加标记');
            return;
        }

        // 检查是否有有效坐标
        const hasValidCoords = project.location?.longitude && project.location?.latitude &&
            project.location.longitude !== 0 && project.location.latitude !== 0;

        if (hasValidCoords) {
            // 有有效坐标，直接添加标记
            this._createMarker(project);
        } else {
            // 无有效坐标，尝试按省市区获取坐标
            console.log('[Map] 项目无有效坐标，尝试按区县定位:', project.name);
            this._geocodeByDistrict(project);
        }
    },

    /**
     * 创建标记（内部方法）
     * @param {Object} project - 项目数据
     * @param {Array} position - 坐标 [lng, lat]
     */
    _createMarker(project, position) {
        if (!position) {
            position = [project.location.longitude, project.location.latitude];
        }
        
        // 验证坐标有效性
        if (!position || position.length !== 2 || 
            isNaN(position[0]) || isNaN(position[1]) ||
            position[0] === 0 || position[1] === 0) {
            console.error('[Map] ❌ 无效坐标，无法创建标记:', project.name, position);
            return;
        }
        
        try {
            // 使用 CircleMarker 替代 Marker - 更稳定，能随地图缩放
            const marker = new AMap.CircleMarker({
                center: position,
                radius: 12,
                fillColor: '#3B82F6',
                fillOpacity: 0.8,
                strokeColor: '#1D4ED8',
                strokeWeight: 2,
                strokeOpacity: 1,
                extData: { projectId: project.id } // 存储项目ID
            });

            // 点击事件
            marker.on('click', () => {
                this.showProjectInfoWindow(project);
            });

            marker.setMap(this.map);
            this.markers.push({ marker, project });
            console.log('[Map] ✅ 添加标记成功:', project.name, position);
        } catch (error) {
            console.error('[Map] ❌ 添加标记失败:', project.name, error);
        }
    },

    /**
     * 按区县地理编码获取坐标
     * @param {Object} project - 项目数据
     */
    _geocodeByDistrict(project) {
        const location = project.location || {};
        const district = location.district || '';
        const city = location.city || '';
        const province = location.province || '';

        // 优先使用区县坐标库（不依赖高德API）
        let coords = null;
        let matchedLocation = '';
        
        // 尝试区县名称
        if (district && typeof getDistrictCoordinate === 'function') {
            coords = getDistrictCoordinate(district);
            if (coords) {
                matchedLocation = district;
                console.log('[Map] ✅ 从区县库获取坐标:', project.name, district, coords);
            }
        }
        
        // 如果区县没找到，尝试城市
        if (!coords && city && typeof getDistrictCoordinate === 'function') {
            coords = getDistrictCoordinate(city);
            if (coords) {
                matchedLocation = city;
                console.log('[Map] ✅ 从城市库获取坐标:', project.name, city, coords);
            }
        }
        
        // 如果城市没找到，尝试省份
        if (!coords && province && typeof getDistrictCoordinate === 'function') {
            coords = getDistrictCoordinate(province);
            if (coords) {
                matchedLocation = province;
                console.log('[Map] ✅ 从省份库获取坐标:', project.name, province, coords);
            }
        }

        if (coords && coords.length === 2) {
            // 保存坐标到项目
            project.location = project.location || {};
            project.location.longitude = coords[0];
            project.location.latitude = coords[1];
            
            // 保存到数据存储（重要：让项目群归并能读取到坐标）
            if (project.id) {
                try {
                    const savedProject = dataStore.getProject(project.id);
                    if (savedProject) {
                        // 创建新对象避免引用问题
                        const updatedProject = JSON.parse(JSON.stringify(savedProject));
                        updatedProject.location = updatedProject.location || {};
                        updatedProject.location.longitude = coords[0];
                        updatedProject.location.latitude = coords[1];
                        dataStore.saveProject(updatedProject);
                        console.log('[Map] ✅ 坐标已保存到项目:', project.name);
                    }
                } catch (e) {
                    console.warn('[Map] ⚠️ 保存坐标失败:', project.name, e);
                }
            }
            
            // 创建标记
            this._createMarker(project, coords);
            return true;
        } else {
            console.warn('[Map] ⚠️ 未找到坐标:', project.name, '省:', province, '市:', city, '区:', district);
            return false;
        }
    },

    /**
     * 批量添加项目标记
     * @param {Array} projects - 项目列表
     */
    addProjectMarkers(projects) {
        this.clearMarkers();
        
        if (!projects || projects.length === 0) {
            console.log('[Map] 没有项目可显示');
            return;
        }
        
        if (!this.map) {
            console.warn('[Map] ⚠️ 地图未初始化，无法添加标记');
            return;
        }
        
        console.log('[Map] 添加项目标记, 数量:', projects.length);
        
        projects.forEach((project, index) => {
            // 添加小延迟避免一次性添加过多标记导致卡顿
            setTimeout(() => {
                this.addProjectMarker(project);
            }, index * 10);
        });

        // 自动调整视野
        setTimeout(() => {
            if (this.markers.length > 0) {
                try {
                    this.map.setFitView();
                    console.log('[Map] ✅ 视野调整完成');
                } catch (e) {
                    console.warn('[Map] 视野调整失败:', e);
                }
            }
        }, projects.length * 10 + 100);
    },

    /**
     * 显示项目信息窗
     * @param {Object} project - 项目数据
     */
    showProjectInfoWindow(project) {
        if (!this.infoWindow || !this.map) {
            console.warn('[Map] 信息窗或地图未初始化');
            return;
        }
        
        const currentStage = projectManager.getCurrentStage(project);
        
        // 处理工艺显示
        const processes = project.scale?.processes || [project.scale?.processType].filter(Boolean);
        const processNames = processes.map(p => PROCESS_TYPES[p] || p).join(', ');
        
        const leader = currentStage.leaderId ? 
            dataStore.getPersonnel(currentStage.leaderId)?.name : '未分配';

        const content = `
            <div style="padding: 12px; min-width: 280px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                <h4 style="font-size: 16px; font-weight: 700; color: #059669; margin-bottom: 12px;">${project.name}</h4>
                <div style="font-size: 13px; line-height: 1.8; color: #4b5563;">
                    <p><span style="color: #9ca3af;">位置：</span>${project.location?.province || ''} ${project.location?.city || ''} ${project.location?.district || ''}</p>
                    <p><span style="color: #9ca3af;">设计规模(标方/天)：</span>${project.scale?.designCapacity || '-'} 标方/天</p>
                    <p><span style="color: #9ca3af;">年产天然气预估(万标方/年)：</span>${project.scale?.dailyOutput || '-'} 万标方/年</p>
                    <p><span style="color: #9ca3af;">处理工艺：</span><span style="padding: 2px 8px; border-radius: 4px; color: white; background: ${this.getProcessColor(project.scale?.processType)};">${processNames || '-'}</span></p>
                    <p><span style="color: #9ca3af;">当前阶段：</span><span style="font-weight: 500;">${currentStage.stageName}</span></p>
                    <p><span style="color: #9ca3af;">阶段牵头：</span>${leader}</p>
                </div>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                    <button onclick="app.showProjectDetail('${project.id}')" 
                            style="color: #059669; font-size: 13px; font-weight: 500; background: none; border: none; cursor: pointer;">
                        查看详情 →
                    </button>
                </div>
            </div>
        `;

        this.infoWindow.setContent(content);
        this.infoWindow.open(this.map, [project.location.longitude, project.location.latitude]);
    },

    /**
     * 清除所有标记
     */
    clearMarkers() {
        if (!this.map) return;
        
        this.markers.forEach(({ marker }) => {
            try {
                marker.setMap(null);
            } catch (e) {
                // 忽略移除失败
            }
        });
        this.markers = [];
        console.log('[Map] 标记已清除');
    },

    /**
     * 清除所有圆圈和标签
     */
    clearCircles() {
        if (!this.map) return;
        
        this.circles.forEach(circle => {
            try {
                circle.setMap(null);
            } catch (e) {
                // 忽略移除失败
            }
        });
        this.circles = [];
        console.log('[Map] 圆圈已清除');
    },

    /**
     * 显示所有项目
     */
    showAllProjects() {
        console.log('[Map] ==================== 显示所有项目 ====================');
        
        // 确保地图已初始化
        if (!this.map) {
            console.log('[Map] 地图未初始化，先初始化');
            this.init();
            // 初始化完成后再显示项目
            setTimeout(() => this.showAllProjects(), 500);
            return;
        }
        
        const projects = dataStore.getAllProjects();
        console.log('[Map] 获取项目数量:', projects.length);
        
        this.clearCircles();
        this.addProjectMarkers(projects);
        
        // 如果没有项目，显示提示
        if (projects.length === 0) {
            console.log('[Map] 暂无项目数据');
            return;
        }

        // 延迟调整视野，等待地理编码完成
        setTimeout(() => {
            if (this.markers.length > 0) {
                try {
                    this.map.setFitView();
                    console.log('[Map] ✅ 视野调整完成，显示', this.markers.length, '个项目');
                } catch (e) {
                    console.warn('[Map] 视野调整失败:', e);
                }
            } else {
                console.warn('[Map] 没有成功添加的标记');
            }
        }, projects.length * 100 + 500);
    },

    /**
     * 显示项目群
     */
    showProjectGroups() {
        console.log('[Map] ==================== 显示项目群 ====================');
        
        // 获取用户输入的半径值
        const radiusInput = document.getElementById('group-radius');
        const radius = radiusInput ? parseInt(radiusInput.value) || 150 : 150;
        console.log('[Map] 使用归类半径:', radius, 'km');
        
        // 确保地图已初始化
        if (!this.map) {
            console.log('[Map] 地图未初始化，先初始化');
            this.init();
            setTimeout(() => this.showProjectGroups(), 500);
            return;
        }
        
        // 先获取所有项目并确保它们都有坐标
        const allProjects = dataStore.getAllProjects();
        console.log('[Map] 项目总数:', allProjects.length);
        
        // 为没有坐标的项目获取坐标
        let needGeocodeCount = 0;
        let hasCoordsCount = 0;
        allProjects.forEach(project => {
            const hasValidCoords = project.location?.longitude && project.location?.latitude &&
                project.location.longitude !== 0 && project.location.latitude !== 0;
            
            if (hasValidCoords) {
                hasCoordsCount++;
            } else {
                needGeocodeCount++;
                console.log('[Map] 项目需要获取坐标:', project.name, 
                    '省:', project.location?.province, 
                    '市:', project.location?.city, 
                    '区:', project.location?.district);
                this._geocodeByDistrict(project);
            }
        });
        
        console.log('[Map] 已有坐标项目数:', hasCoordsCount);
        console.log('[Map] 需要获取坐标的项目数:', needGeocodeCount);
        
        // 延迟执行项目群归并，等待坐标获取和保存完成
        const delayTime = needGeocodeCount > 0 ? Math.max(needGeocodeCount * 100, 500) : 0;
        console.log('[Map] 等待', delayTime, 'ms 后执行项目群归并...');
        
        setTimeout(() => {
            this._doShowProjectGroups(radius);
        }, delayTime);
    },
    
    /**
     * 实际执行项目群显示（内部方法）
     * @param {number} radius - 归类半径（公里）
     */
    _doShowProjectGroups(radius = 150) {
        console.log('[Map] 执行项目群归并，半径:', radius, 'km');
        
        const groups = smartRecommendation.groupProjectsByDistance(radius);
        
        this.clearMarkers();
        this.clearCircles();

        if (!groups || groups.length === 0) {
            console.log('[Map] 没有项目群可显示');
            // 显示所有项目
            this.showAllProjects();
            return;
        }
        
        console.log('[Map] 项目群数量:', groups.length);
        
        // 统计总项目数
        let totalProjects = 0;
        groups.forEach(g => totalProjects += g.projects.length);
        console.log('[Map] 参与归并的项目总数:', totalProjects);

        groups.forEach((group, index) => {
            // 绘制项目群范围圈
            if (group.centerPoint) {
                try {
                    const circle = new AMap.Circle({
                        center: [group.centerPoint.longitude, group.centerPoint.latitude],
                        radius: radius * 1000, // 转换为米
                        strokeColor: '#8b5cf6',
                        strokeWeight: 2,
                        strokeOpacity: 0.8,
                        fillColor: '#8b5cf6',
                        fillOpacity: 0.15,
                        strokeStyle: 'dashed'
                    });
                    circle.setMap(this.map);
                    this.circles.push(circle);

                    // 添加项目群标签
                    const label = new AMap.Text({
                        text: `项目群 ${index + 1}\n(${group.projects.length}个项目)`,
                        position: [group.centerPoint.longitude, group.centerPoint.latitude],
                        style: {
                            'background-color': 'rgba(139, 92, 246, 0.9)',
                            'border-radius': '6px',
                            'padding': '6px 12px',
                            'color': 'white',
                            'font-size': '12px',
                            'font-weight': 'bold',
                            'text-align': 'center',
                            'border': 'none'
                        }
                    });
                    label.setMap(this.map);
                    this.circles.push(label);
                    
                    console.log(`[Map] 项目群 ${index + 1} 绘制完成，包含 ${group.projects.length} 个项目`);
                } catch (e) {
                    console.warn('[Map] 绘制项目群失败:', e);
                }
            }

            // 添加项目标记
            group.projects.forEach(project => {
                this.addProjectMarker(project);
            });
        });

        // 调整视野显示所有项目群
        setTimeout(() => {
            if (this.markers.length > 0 || this.circles.length > 0) {
                try {
                    const allOverlays = [...this.markers.map(m => m.marker), ...this.circles];
                    this.map.setFitView(allOverlays);
                    console.log('[Map] 项目群视野调整完成');
                } catch (e) {
                    console.warn('[Map] 项目群视野调整失败:', e);
                }
            }
        }, 300);
    },

    /**
     * 项目聚类显示
     * @param {number} distance - 聚合距离（公里）
     */
    clusterProjects(distance = 150) {
        this.showProjectGroups();
    },

    /**
     * 地理编码（地址转坐标）
     * @param {string} address - 地址
     * @returns {Promise} 坐标信息
     */
    async geocodeAddress(address) {
        console.log('[Map] 开始地理编码:', address);
        
        return new Promise((resolve, reject) => {
            if (typeof AMap === 'undefined') {
                reject(new Error('高德地图API未加载'));
                return;
            }
            
            try {
                const geocoder = new AMap.Geocoder();
                geocoder.getLocation(address, (status, result) => {
                    console.log('[Map] 地理编码结果:', status, result);
                    if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
                        resolve({
                            longitude: result.geocodes[0].location.lng,
                            latitude: result.geocodes[0].location.lat,
                            formattedAddress: result.geocodes[0].formattedAddress
                        });
                    } else {
                        reject(new Error('地理编码失败: ' + (result.info || '未知错误')));
                    }
                });
            } catch (e) {
                reject(new Error('地理编码器初始化失败: ' + e.message));
            }
        });
    },

    /**
     * 逆地理编码（坐标转地址）
     * @param {number} longitude - 经度
     * @param {number} latitude - 纬度
     * @returns {Promise} 地址信息
     */
    async reverseGeocode(longitude, latitude) {
        console.log('[Map] 开始逆地理编码:', longitude, latitude);
        
        return new Promise((resolve, reject) => {
            if (typeof AMap === 'undefined') {
                reject(new Error('高德地图API未加载'));
                return;
            }
            
            try {
                const geocoder = new AMap.Geocoder();
                geocoder.getAddress([longitude, latitude], (status, result) => {
                    console.log('[Map] 逆地理编码结果:', status, result);
                    if (status === 'complete' && result.regeocode) {
                        const address = result.regeocode.addressComponent;
                        resolve({
                            province: address.province,
                            city: address.city || address.province,
                            district: address.district,
                            street: address.street,
                            address: result.regeocode.formattedAddress
                        });
                    } else {
                        reject(new Error('逆地理编码失败: ' + (result.info || '未知错误')));
                    }
                });
            } catch (e) {
                reject(new Error('地理编码器初始化失败: ' + e.message));
            }
        });
    },

    /**
     * 获取工艺颜色
     * @param {string} processType - 工艺类型
     * @returns {string} 颜色代码
     */
    getProcessColor(processType) {
        const colors = {
            'psa': '#3b82f6',
            'membrane': '#ec4899',
            'chemical_absorption': '#06b6d4',
            'dry_desulfurization': '#f59e0b',
            'wet_desulfurization': '#8b5cf6',
            'biological_desulfurization': '#10b981',
            'other': '#6b7280'
        };
        return colors[processType] || colors.other;
    },

    /**
     * 绘制路线
     * @param {Array} points - 点数组 [{longitude, latitude}]
     * @param {Object} options - 选项
     */
    drawRoute(points, options = {}) {
        if (!this.map || !points || points.length < 2) return;

        const path = points.map(p => [p.longitude, p.latitude]);
        
        try {
            const polyline = new AMap.Polyline({
                path: path,
                strokeColor: options.color || '#3b82f6',
                strokeWeight: options.weight || 3,
                strokeOpacity: options.opacity || 0.8,
                strokeStyle: options.style || 'solid'
            });

            polyline.setMap(this.map);
            this.circles.push(polyline);
        } catch (e) {
            console.warn('[Map] 绘制路线失败:', e);
        }
    },

    /**
     * 高亮显示项目
     * @param {string} projectId - 项目ID
     */
    highlightProject(projectId) {
        const markerInfo = this.markers.find(m => m.project.id === projectId);
        if (markerInfo && this.map) {
            const { marker, project } = markerInfo;
            try {
                this.map.setCenter([project.location.longitude, project.location.latitude]);
                this.map.setZoom(12);
                
                // 高德2.0使用setAnimation方式不同
                marker.setAnimation('AMAP_ANIMATION_BOUNCE');
                setTimeout(() => {
                    try {
                        marker.setAnimation('AMAP_ANIMATION_NONE');
                    } catch (e) {}
                }, 2000);
            } catch (e) {
                console.warn('[Map] 高亮项目失败:', e);
            }
        }
    },

    /**
     * 销毁地图
     */
    destroy() {
        console.log('[Map] 销毁地图...');
        if (this.map) {
            try {
                this.map.destroy();
            } catch (e) {
                console.warn('[Map] 销毁地图失败:', e);
            }
            this.map = null;
        }
        this.markers = [];
        this.circles = [];
        this.isInitialized = false;
        this.initRetryCount = 0;
        
        // 移除加载完成标记
        const container = document.getElementById('map-container');
        if (container) {
            container.classList.remove('map-loaded');
        }
    }
};

console.log('[Map] 地图可视化模块已加载');

/**
 * 调试检查函数
 * 在浏览器控制台运行 mapVisualization.debug() 查看地图状态
 */
mapVisualization.debug = function() {
    console.log('================== 地图调试信息 ==================');
    console.log('AMap定义:', typeof AMap !== 'undefined');
    console.log('地图实例:', this.map ? '已创建' : '未创建');
    console.log('是否初始化:', this.isInitialized);
    console.log('标记数量:', this.markers.length);
    console.log('圆圈数量:', this.circles.length);
    
    const container = document.getElementById('map-container');
    if (container) {
        console.log('容器存在: 是');
        console.log('容器尺寸:', container.offsetWidth, 'x', container.offsetHeight);
        console.log('容器可见:', container.offsetParent !== null);
    } else {
        console.log('容器存在: 否');
    }
    
    const wrapper = document.getElementById('map-container-wrapper');
    if (wrapper) {
        const style = window.getComputedStyle(wrapper);
        console.log('wrapper display:', style.display);
        console.log('wrapper visibility:', style.visibility);
    }
    
    const mapTab = document.getElementById('map-tab');
    if (mapTab) {
        console.log('map-tab hidden:', mapTab.classList.contains('hidden'));
    }
    console.log('================================================');
};

// 自动检查API加载
if (typeof AMap === 'undefined') {
    console.error('[Map] ⚠️ 高德地图API未加载！请检查网络连接和API Key');
} else {
    console.log('[Map] ✅ 高德地图API已加载');
}

/**
 * 显示地图错误信息
 */
mapVisualization.showError = function(message) {
    const container = document.getElementById('map-container');
    if (container) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full bg-gray-50 text-gray-600 p-8">
                <i class="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
                <p class="text-lg font-medium mb-2">地图加载失败</p>
                <p class="text-sm text-gray-500 mb-4 text-center">${message}</p>
                <p class="text-xs text-gray-400 text-center max-w-md">
                    提示：通过 file:// 协议打开时，高德地图可能因安全限制无法加载。
                    <br>建议通过本地服务器访问：
                    <br>1. 安装 Node.js
                    <br>2. 在项目目录运行：npx http-server -p 8080
                    <br>3. 浏览器访问：http://localhost:8080
                </p>
            </div>
        `;
    }
    console.error('[Map]', message);
};
