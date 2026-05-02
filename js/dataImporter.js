/**
 * 数据导入模块
 * 支持从Excel批量导入项目、人员数据
 */

const dataImporter = {
    /**
     * 导入项目数据
     * @param {File} file - Excel文件
     */
    async importProjects(file) {
        if (!file) return;
        
        try {
            showToast('正在导入项目数据...', 'info');
            const data = await this.readExcel(file);
            
            let successCount = 0;
            let errorCount = 0;
            
            // 处理每一行数据
            for (const row of data) {
                try {
                    const project = this.parseProjectRow(row);
                    if (project && project.name) {
                        // 检查是否已存在同名项目
                        const existing = dataStore.getAllProjects().find(p => p.name === project.name);
                        if (existing) {
                            // 更新现有项目
                            project.id = existing.id;
                            projectManager.updateProject(existing.id, project);
                        } else {
                            // 创建新项目
                            projectManager.createProject(project);
                        }
                        successCount++;
                    }
                } catch (e) {
                    console.error('导入项目行失败:', row, e);
                    errorCount++;
                }
            }
            
            // 刷新UI
            app.renderProjects();
            app.updateDashboard();
            
            showToast(`项目导入完成: ${successCount}个成功, ${errorCount}个失败`, successCount > 0 ? 'success' : 'warning');
            
        } catch (error) {
            console.error('导入项目失败:', error);
            showToast('导入失败: ' + error.message, 'error');
        }
    },
    
    /**
     * 导入人员数据
     * @param {File} file - Excel文件
     */
    async importPersonnel(file) {
        if (!file) return;
        
        try {
            showToast('正在导入人员数据...', 'info');
            const data = await this.readExcel(file);
            
            let successCount = 0;
            let errorCount = 0;
            
            for (const row of data) {
                try {
                    const person = this.parsePersonnelRow(row);
                    if (person && person.name) {
                        // 检查是否已存在
                        const existing = dataStore.getAllPersonnel().find(p => p.name === person.name);
                        if (existing) {
                            person.id = existing.id;
                            personnelManager.updatePersonnel(existing.id, person);
                        } else {
                            personnelManager.createPersonnel(person);
                        }
                        successCount++;
                    }
                } catch (e) {
                    console.error('导入人员行失败:', row, e);
                    errorCount++;
                }
            }
            
            // 刷新UI
            app.renderPersonnel();
            app.updateDashboard();
            
            showToast(`人员导入完成: ${successCount}个成功, ${errorCount}个失败`, successCount > 0 ? 'success' : 'warning');
            
        } catch (error) {
            console.error('导入人员失败:', error);
            showToast('导入失败: ' + error.message, 'error');
        }
    },
    
    /**
     * 导入完整数据（项目和人员）
     * @param {File} file - Excel文件
     */
    async importFullData(file) {
        if (!file) return;
        
        try {
            showToast('正在读取数据文件...', 'info');
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // 导入项目
                    const projectSheet = workbook.Sheets['项目列表'];
                    if (projectSheet) {
                        const projects = XLSX.utils.sheet_to_json(projectSheet);
                        this.importDataArray(projects, 'project');
                    }
                    
                    // 导入人员
                    const personnelSheet = workbook.Sheets['人员列表'];
                    if (personnelSheet) {
                        const personnel = XLSX.utils.sheet_to_json(personnelSheet);
                        this.importDataArray(personnel, 'personnel');
                    }
                    
                    showToast('数据导入完成', 'success');
                    
                } catch (error) {
                    console.error('解析数据失败:', error);
                    showToast('数据解析失败: ' + error.message, 'error');
                }
            };
            
            reader.readAsArrayBuffer(file);
            
        } catch (error) {
            console.error('导入失败:', error);
            showToast('导入失败: ' + error.message, 'error');
        }
    },
    
    /**
     * 导入数据数组
     * @param {Array} data - 数据数组
     * @param {string} type - 类型: 'project' | 'personnel'
     */
    importDataArray(data, type) {
        let successCount = 0;
        
        for (const row of data) {
            try {
                if (type === 'project') {
                    const project = this.parseProjectRow(row);
                    if (project?.name) {
                        const existing = dataStore.getAllProjects().find(p => p.name === project.name);
                        if (existing) {
                            project.id = existing.id;
                            projectManager.updateProject(existing.id, project);
                        } else {
                            projectManager.createProject(project);
                        }
                        successCount++;
                    }
                } else if (type === 'personnel') {
                    const person = this.parsePersonnelRow(row);
                    if (person?.name) {
                        const existing = dataStore.getAllPersonnel().find(p => p.name === person.name);
                        if (existing) {
                            person.id = existing.id;
                            personnelManager.updatePersonnel(existing.id, person);
                        } else {
                            personnelManager.createPersonnel(person);
                        }
                        successCount++;
                    }
                }
            } catch (e) {
                console.error(`导入${type}失败:`, row, e);
            }
        }
        
        console.log(`[Import] ${type}导入完成:`, successCount);
    },
    
    /**
     * 读取Excel文件
     * @param {File} file - 文件对象
     * @returns {Promise<Array>} 数据数组
     */
    readExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    },
    
    /**
     * 解析项目行数据
     * @param {Object} row - Excel行数据
     * @returns {Object} 项目对象
     */
    parseProjectRow(row) {
        // 处理可能的列名变体
        const getValue = (obj, keys) => {
            for (const key of keys) {
                if (obj[key] !== undefined) return obj[key];
            }
            return '';
        };
        
        const name = getValue(row, ['项目名称', '名称', 'name', 'Name']);
        if (!name) return null;
        
        return {
            name: String(name).trim(),
            location: {
                province: String(getValue(row, ['省份', '省', 'province']) || ''),
                city: String(getValue(row, ['城市', '市', 'city']) || ''),
                district: String(getValue(row, ['区县', '区/县', 'district']) || ''),
                address: String(getValue(row, ['详细地址', '地址', 'address']) || ''),
                longitude: parseFloat(getValue(row, ['经度', 'longitude', 'lng'])) || 0,
                latitude: parseFloat(getValue(row, ['纬度', 'latitude', 'lat'])) || 0
            },
            scale: {
                designCapacity: parseFloat(getValue(row, ['设计规模(标方/天)', '设计规模(Nm³/h)', '设计规模', '规模'])) || 0,
                dailyOutput: parseFloat(getValue(row, ['年产天然气预估(万标方/年)', '日产气量预估(千方/天)', '日产气量', '日产量'])) || 0,
                processType: this.parseProcessType(getValue(row, ['处理工艺', '工艺', 'processType']))
            },
            costs: {
                electricityPrice: parseFloat(getValue(row, ['电费单价(元/度)', '电费', '电价'])) || 0,
                steamPrice: parseFloat(getValue(row, ['蒸汽费单价(元/吨)', '蒸汽费', '汽价'])) || 0
            },
            lifecycle: {},
            notes: String(getValue(row, ['备注', 'notes', '备注信息']) || '')
        };
    },
    
    /**
     * 解析人员行数据
     * @param {Object} row - Excel行数据
     * @returns {Object} 人员对象
     */
    parsePersonnelRow(row) {
        const getValue = (obj, keys) => {
            for (const key of keys) {
                if (obj[key] !== undefined) return obj[key];
            }
            return '';
        };
        
        const name = getValue(row, ['姓名', '名称', 'name', 'Name']);
        if (!name) return null;
        
        return {
            name: String(name).trim(),
            gender: String(getValue(row, ['性别', 'gender']) || ''),
            age: parseInt(getValue(row, ['年龄', 'age'])) || 0,
            department: String(getValue(row, ['部门', 'department', 'dept']) || ''),
            position: String(getValue(row, ['职位', '岗位', 'position']) || ''),
            experience: {
                projectCount: parseInt(getValue(row, ['项目经验数', '经验数', 'projectCount'])) || 0,
                years: parseInt(getValue(row, ['工作年限', '年限', 'years'])) || 0,
                processes: this.parseProcessList(getValue(row, ['熟悉工艺', '工艺', 'processes']))
            },
            maxProjects: parseInt(getValue(row, ['最大可承担项目数', '最大项目数', 'maxProjects'])) || 3,
            capabilities: {
                technical: parseInt(getValue(row, ['技术能力', 'technical'])) || 5,
                management: parseInt(getValue(row, ['管理能力', 'management'])) || 5,
                coordination: parseInt(getValue(row, ['协调能力', 'coordination'])) || 5
            },
            contact: {
                phone: String(getValue(row, ['联系电话', '电话', 'phone']) || ''),
                email: String(getValue(row, ['邮箱', '电子邮件', 'email']) || '')
            },
            location: {
                province: String(getValue(row, ['常驻省份', '省份']) || ''),
                city: String(getValue(row, ['常驻城市', '城市']) || '')
            }
        };
    },
    
    /**
     * 解析工艺类型
     * @param {string} value - 工艺名称
     * @returns {string} 工艺key
     */
    parseProcessType(value) {
        if (!value) return 'psa';
        
        const map = {
            'PSA变压吸附': 'psa', '变压吸附': 'psa', 'PSA': 'psa', 'psa': 'psa',
            '膜分离': 'membrane', '膜': 'membrane', 'membrane': 'membrane',
            '化学吸收': 'chemical_absorption', '化学': 'chemical_absorption',
            '干法脱硫': 'dry_desulfurization', '干法': 'dry_desulfurization',
            '湿法脱硫': 'wet_desulfurization', '湿法': 'wet_desulfurization',
            '其他': 'other', '其他工艺': 'other'
        };
        
        return map[String(value).trim()] || 'psa';
    },
    
    /**
     * 解析工艺列表
     * @param {string} value - 工艺字符串
     * @returns {Array} 工艺数组
     */
    parseProcessList(value) {
        if (!value) return [];
        
        const processes = String(value).split(/[,，、;；]/);
        return processes.map(p => this.parseProcessType(p.trim())).filter(Boolean);
    },
    
    /**
     * 生成导入模板
     * @param {string} type - 'project' | 'personnel' | 'full'
     */
    downloadTemplate(type) {
        if (type === 'project') {
            const template = [{
                '项目名称': '示例项目',
                '省份': '山东省',
                '城市': '潍坊市',
                '区县': '奎文区',
                '详细地址': 'XX路XX号',
                '设计规模(标方/天)': 1000,
                '年产天然气预估(万标方/年)': 2.4,
                '处理工艺': 'PSA变压吸附',
                '电费单价(元/度)': 0.6,
                '蒸汽费单价(元/吨)': 200,
                '备注': ''
            }];
            this.downloadExcel(template, '项目导入模板');
            
        } else if (type === 'personnel') {
            const template = [{
                '姓名': '张三',
                '性别': '男',
                '年龄': 35,
                '部门': '技术部',
                '职位': '工程师',
                '项目经验数': 5,
                '工作年限': 10,
                '熟悉工艺': 'PSA变压吸附,膜分离',
                '最大可承担项目数': 3,
                '技术能力': 8,
                '管理能力': 6,
                '协调能力': 7,
                '联系电话': '13800138000',
                '邮箱': 'zhangsan@example.com',
                '常驻省份': '山东省',
                '常驻城市': '济南市'
            }];
            this.downloadExcel(template, '人员导入模板');
        }
    },
    
    /**
     * 下载Excel文件
     * @param {Array} data - 数据
     * @param {string} filename - 文件名
     */
    downloadExcel(data, filename) {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '模板');
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }
};

// 导出到全局
if (typeof window !== 'undefined') {
    window.dataImporter = dataImporter;
}
