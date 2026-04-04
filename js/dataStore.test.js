/**
 * 自动化测试脚本 - 数据保存功能测试
 * 运行方式: 在浏览器控制台执行 testAll()
 */

const dataStoreTest = {
    results: [],

    log(message, passed) {
        const icon = passed ? '✅' : '❌';
        const result = { message: `${icon} ${message}`, passed, time: new Date().toISOString() };
        this.results.push(result);
        console.log(`${icon} ${message}`);
        return passed;
    },

    async runAll() {
        this.results = [];
        console.log('\n========== 开始数据保存功能测试 ==========\n');

        // 1. DataStore 初始化测试
        await this.testDataStoreInit();

        // 2. 项目 CRUD 测试
        await this.testProjectCRUD();

        // 3. 人员 CRUD 测试
        await this.testPersonnelCRUD();

        // 4. 数据持久化测试
        await this.testPersistence();

        // 5. 地图数据测试
        await this.testMapData();

        // 6. 甘特图数据测试
        await this.testGanttData();

        // 显示总结
        this.showSummary();

        return this.results;
    },

    // ========== 测试用例 ==========

    async testDataStoreInit() {
        console.log('\n--- DataStore 初始化测试 ---');
        
        // 检查 dataStore 是否存在
        if (typeof dataStore === 'undefined') {
            this.log('dataStore 对象已定义', false);
            return;
        }
        this.log('dataStore 对象已定义', true);

        // 检查必要方法
        const requiredMethods = ['init', 'getAllProjects', 'getAllPersonnel', 'saveProject', 'savePersonnel', 'deleteProject', 'deletePersonnel'];
        let allMethodsExist = true;
        requiredMethods.forEach(method => {
            if (typeof dataStore[method] !== 'function') {
                this.log(`dataStore.${method} 方法不存在`, false);
                allMethodsExist = false;
            }
        });
        
        if (allMethodsExist) {
            this.log('所有必要方法都存在', true);
        }

        // 测试初始化
        try {
            dataStore.init();
            this.log('dataStore.init() 调用成功', true);
        } catch (e) {
            this.log(`dataStore.init() 失败: ${e.message}`, false);
        }

        // 检查存储键
        const version = localStorage.getItem('biogas_data_version');
        this.log(`数据版本: ${version || '未设置'}`, !!version);
    },

    async testProjectCRUD() {
        console.log('\n--- 项目 CRUD 测试 ---');

        // 清理测试数据
        const existingProjects = dataStore.getAllProjects();
        existingProjects.filter(p => p.name?.startsWith('测试项目')).forEach(p => {
            dataStore.deleteProject(p.id);
        });

        // 1. 创建项目
        const testProject = {
            name: '测试项目-' + Date.now(),
            location: {
                province: '山东省',
                city: '济南市',
                district: '历下区',
                address: '测试地址123号',
                longitude: 117.0,
                latitude: 36.65
            },
            scale: {
                designCapacity: 5000,
                dailyOutput: 12,
                processes: ['psa', 'dry_desulfurization'],
                processType: 'psa'
            },
            costs: {
                electricityPrice: 0.6,
                steamPrice: 200
            },
            notes: '这是一个测试项目',
            lifecycle: {
                tracking: { startDate: '2025-01-01', endDate: '2025-01-31', status: 'completed' },
                contract: { startDate: '2025-02-01', endDate: '2025-02-28', status: 'ongoing' }
            }
        };

        let saved;
        try {
            saved = dataStore.saveProject(testProject);
            if (saved && saved.id) {
                this.log(`创建项目成功，ID: ${saved.id}`, true);
            } else {
                this.log('创建项目失败：未返回有效对象', false);
                return;
            }
        } catch (e) {
            this.log(`创建项目失败: ${e.message}`, false);
            return;
        }

        // 2. 读取项目
        const retrieved = dataStore.getProject(saved.id);
        if (retrieved && retrieved.name === testProject.name) {
            this.log('读取项目成功', true);
        } else {
            this.log('读取项目失败', false);
        }

        // 3. 更新项目
        const newName = testProject.name + '-已更新';
        saved.name = newName;
        try {
            const updated = dataStore.saveProject(saved);
            if (updated.name === newName) {
                this.log('更新项目成功', true);
            } else {
                this.log('更新项目失败', false);
            }
        } catch (e) {
            this.log(`更新项目失败: ${e.message}`, false);
        }

        // 4. 删除项目
        try {
            const deleted = dataStore.deleteProject(saved.id);
            if (deleted) {
                this.log('删除项目成功', true);
            } else {
                this.log('删除项目返回失败', false);
            }
            
            const shouldBeNull = dataStore.getProject(saved.id);
            if (!shouldBeNull) {
                this.log('删除验证成功（项目已不存在）', true);
            } else {
                this.log('删除验证失败（项目仍存在）', false);
            }
        } catch (e) {
            this.log(`删除项目失败: ${e.message}`, false);
        }
    },

    async testPersonnelCRUD() {
        console.log('\n--- 人员 CRUD 测试 ---');

        // 清理测试数据
        const existingPersonnel = dataStore.getAllPersonnel();
        existingPersonnel.filter(p => p.name?.startsWith('测试人员')).forEach(p => {
            dataStore.deletePersonnel(p.id);
        });

        // 1. 创建人员
        const testPerson = {
            name: '测试人员-' + Date.now(),
            gender: '男',
            age: 30,
            department: '工程部',
            position: '工程师',
            experience: {
                projectCount: 5,
                years: 3,
                processes: ['psa', 'membrane']
            },
            capabilities: {
                technical: 8,
                management: 7,
                coordination: 6
            },
            maxProjects: 3,
            contact: {
                phone: '13800138000',
                email: 'test@example.com'
            }
        };

        let saved;
        try {
            saved = dataStore.savePersonnel(testPerson);
            if (saved && saved.id) {
                this.log(`创建人员成功，ID: ${saved.id}`, true);
            } else {
                this.log('创建人员失败：未返回有效对象', false);
                return;
            }
        } catch (e) {
            this.log(`创建人员失败: ${e.message}`, false);
            return;
        }

        // 2. 读取人员
        const retrieved = dataStore.getPersonnel(saved.id);
        if (retrieved && retrieved.name === testPerson.name) {
            this.log('读取人员成功', true);
        } else {
            this.log('读取人员失败', false);
        }

        // 3. 更新人员
        const newName = testPerson.name + '-已更新';
        saved.name = newName;
        try {
            const updated = dataStore.savePersonnel(saved);
            if (updated.name === newName) {
                this.log('更新人员成功', true);
            } else {
                this.log('更新人员失败', false);
            }
        } catch (e) {
            this.log(`更新人员失败: ${e.message}`, false);
        }

        // 4. 删除人员
        try {
            const deleted = dataStore.deletePersonnel(saved.id);
            if (deleted) {
                this.log('删除人员成功', true);
            } else {
                this.log('删除人员返回失败', false);
            }
        } catch (e) {
            this.log(`删除人员失败: ${e.message}`, false);
        }
    },

    async testPersistence() {
        console.log('\n--- 数据持久化测试 ---');

        // 创建测试项目
        const testProject = {
            name: '持久化测试项目',
            location: { province: '测试省', city: '测试市', district: '测试区', address: '测试地址' },
            scale: { designCapacity: 1000, dailyOutput: 5, processes: ['psa'], processType: 'psa' },
            lifecycle: { tracking: { startDate: '2025-01-01', endDate: '2025-01-31' } }
        };

        // 保存
        const saved = dataStore.saveProject(testProject);
        const id = saved.id;

        // 强制从 LocalStorage 重新读取
        const raw = localStorage.getItem('biogas_projects');
        let projects;
        try {
            projects = JSON.parse(raw);
        } catch (e) {
            this.log('LocalStorage 数据解析失败', false);
            return;
        }

        const foundInStorage = projects.find(p => p.id === id);
        if (foundInStorage && foundInStorage.name === testProject.name) {
            this.log('数据已正确保存到 LocalStorage', true);
        } else {
            this.log('数据未正确保存到 LocalStorage', false);
        }

        // 清理
        dataStore.deleteProject(id);
    },

    async testMapData() {
        console.log('\n--- 地图数据测试 ---');

        const projects = dataStore.getAllProjects();
        const projectsWithCoords = projects.filter(p => 
            p.location?.longitude && p.location?.latitude
        );

        if (projects.length === 0) {
            this.log('没有项目数据，跳过地图测试', true);
            return;
        }

        this.log(`共有 ${projects.length} 个项目，其中 ${projectsWithCoords.length} 个有坐标`, true);

        // 检查 mapVisualization
        if (typeof mapVisualization !== 'undefined') {
            this.log('mapVisualization 模块已加载', true);
            
            if (typeof mapVisualization.init === 'function') {
                this.log('mapVisualization.init 方法存在', true);
            } else {
                this.log('mapVisualization.init 方法不存在', false);
            }
        } else {
            this.log('mapVisualization 模块未加载', false);
        }
    },

    async testGanttData() {
        console.log('\n--- 甘特图数据测试 ---');

        const projects = dataStore.getAllProjects();
        
        if (projects.length === 0) {
            this.log('没有项目数据，跳过甘特图测试', true);
            return;
        }

        // 检查是否有有效的生命周期数据
        const projectsWithLifecycle = projects.filter(p => {
            if (!p.lifecycle) return false;
            return Object.values(p.lifecycle).some(stage => stage.startDate);
        });

        this.log(`${projectsWithLifecycle.length}/${projects.length} 个项目有生命周期数据`, 
            projectsWithLifecycle.length > 0);

        // 检查 ganttChart 模块
        if (typeof ganttChart !== 'undefined') {
            this.log('ganttChart 模块已加载', true);
            
            if (typeof ganttChart.init === 'function') {
                this.log('ganttChart.init 方法存在', true);
            } else {
                this.log('ganttChart.init 方法不存在', false);
            }
        } else {
            this.log('ganttChart 模块未加载', false);
        }
    },

    showSummary() {
        console.log('\n========== 测试结果总结 ==========\n');
        
        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        
        console.log(`总测试数: ${total}`);
        console.log(`通过: ${passed}`);
        console.log(`失败: ${total - passed}`);
        console.log(`通过率: ${(passed / total * 100).toFixed(1)}%`);
        
        if (passed === total) {
            console.log('\n🎉 所有测试通过！');
        } else {
            console.log('\n⚠️ 有测试未通过，请检查修复。');
        }
        
        return { passed, total, rate: passed / total };
    }
};

// 全局测试函数
window.testAll = function() {
    return dataStoreTest.runAll();
};

// 页面加载完成后自动运行测试（如果是测试页面）
if (document.title.includes('测试')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.testAll();
        }, 500);
    });
}

console.log('数据保存测试脚本已加载。在控制台运行 testAll() 开始测试。');
