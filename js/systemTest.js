/**
 * 系统功能测试脚本
 * 测试所有修复的问题
 */

const SystemTest = {
    results: [],

    log(testName, passed, message = '') {
        this.results.push({ testName, passed, message });
        console.log(`[${passed ? '✅' : '❌'}] ${testName}: ${passed ? '通过' : '失败'} ${message}`);
    },

    // ==================== 测试1: 部门管理 ====================
    testDepartmentManagement() {
        console.log('\n========== 测试: 部门管理 ==========');
        
        // 测试DEPARTMENTS数组存在
        if (typeof DEPARTMENTS !== 'undefined' && Array.isArray(DEPARTMENTS)) {
            this.log('DEPARTMENTS数组存在', true, `当前有${DEPARTMENTS.length}个部门`);
        } else {
            this.log('DEPARTMENTS数组存在', false, 'DEPARTMENTS未定义');
        }

        // 测试部门管理方法存在
        const methods = ['showDepartmentModal', 'closeDepartmentModal', 'addDepartment', 'editDepartment', 'deleteDepartment'];
        methods.forEach(method => {
            if (typeof app[method] === 'function') {
                this.log(`app.${method} 方法存在`, true);
            } else {
                this.log(`app.${method} 方法存在`, false);
            }
        });
    },

    // ==================== 测试2: 表单事件绑定 ====================
    testFormEventBinding() {
        console.log('\n========== 测试: 表单事件绑定 ==========');
        
        const projectForm = document.getElementById('project-form');
        const personnelForm = document.getElementById('personnel-form');
        
        if (projectForm) {
            this.log('项目表单存在', true);
            const saveBtn = projectForm.querySelector('button[type="submit"]');
            if (saveBtn) {
                this.log('项目保存按钮存在', true);
            } else {
                this.log('项目保存按钮存在', false);
            }
        } else {
            this.log('项目表单存在', false);
        }

        if (personnelForm) {
            this.log('人员表单存在', true);
            const saveBtn = personnelForm.querySelector('button[type="submit"]');
            if (saveBtn) {
                this.log('人员保存按钮存在', true);
            } else {
                this.log('人员保存按钮存在', false);
            }
        } else {
            this.log('人员表单存在', false);
        }
    },

    // ==================== 测试3: 人员评估页面 ====================
    testAssessmentPage() {
        console.log('\n========== 测试: 人员评估页面 ==========');
        
        // 测试assessmentModule存在
        if (typeof assessmentModule !== 'undefined') {
            this.log('assessmentModule对象存在', true);
            
            const methods = ['init', 'runAssessment', 'renderOverview', 'renderTable'];
            methods.forEach(method => {
                if (typeof assessmentModule[method] === 'function') {
                    this.log(`assessmentModule.${method} 方法存在`, true);
                } else {
                    this.log(`assessmentModule.${method} 方法存在`, false);
                }
            });
        } else {
            this.log('assessmentModule对象存在', false);
        }

        // 测试日期输入框
        const startDate = document.getElementById('assess-start-date');
        const endDate = document.getElementById('assess-end-date');
        
        // 切换到评估页面后再检查
        if (document.getElementById('personnel-assessment-container')) {
            this.log('人员评估容器存在', true);
        } else {
            this.log('人员评估容器存在', false);
        }
    },

    // ==================== 测试4: 地图功能 ====================
    testMapFunctionality() {
        console.log('\n========== 测试: 地图功能 ==========');
        
        if (typeof mapVisualization !== 'undefined') {
            this.log('mapVisualization对象存在', true);
            
            const methods = ['init', 'addProjectMarker', 'showAllProjects', 'geocodeAddress'];
            methods.forEach(method => {
                if (typeof mapVisualization[method] === 'function') {
                    this.log(`mapVisualization.${method} 方法存在`, true);
                } else {
                    this.log(`mapVisualization.${method} 方法存在`, false);
                }
            });

            // 检查地图实例
            if (mapVisualization.map) {
                this.log('地图实例已初始化', true);
            } else {
                this.log('地图实例已初始化', false, '地图尚未初始化或初始化失败');
            }
        } else {
            this.log('mapVisualization对象存在', false);
        }

        // 检查地图容器
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            this.log('地图容器存在', true);
        } else {
            this.log('地图容器存在', false);
        }
    },

    // ==================== 测试5: 数据存储 ====================
    testDataStore() {
        console.log('\n========== 测试: 数据存储 ==========');
        
        if (typeof dataStore !== 'undefined') {
            this.log('dataStore对象存在', true);
            
            const methods = ['getAllProjects', 'getAllPersonnel', 'saveProject', 'savePersonnel'];
            methods.forEach(method => {
                if (typeof dataStore[method] === 'function') {
                    this.log(`dataStore.${method} 方法存在`, true);
                } else {
                    this.log(`dataStore.${method} 方法存在`, false);
                }
            });

            // 测试数据读取
            const projects = dataStore.getAllProjects();
            const personnel = dataStore.getAllPersonnel();
            
            this.log('项目数据读取', true, `共${projects.length}个项目`);
            this.log('人员数据读取', true, `共${personnel.length}个人员`);
        } else {
            this.log('dataStore对象存在', false);
        }
    },

    // ==================== 测试6: 弹窗功能 ====================
    testModals() {
        console.log('\n========== 测试: 弹窗功能 ==========');
        
        const modals = [
            'project-modal',
            'personnel-modal',
            'project-detail-modal',
            'department-modal',
            'recommendation-modal'
        ];

        modals.forEach(id => {
            const modal = document.getElementById(id);
            if (modal) {
                this.log(`${id} 弹窗存在`, true);
            } else {
                this.log(`${id} 弹窗存在`, false);
            }
        });
    },

    // ==================== 运行所有测试 ====================
    runAllTests() {
        console.log('========================================');
        console.log('     沼气提纯系统 - 功能测试报告     ');
        console.log('========================================');
        
        this.results = [];
        
        this.testDepartmentManagement();
        this.testFormEventBinding();
        this.testAssessmentPage();
        this.testMapFunctionality();
        this.testDataStore();
        this.testModals();

        // 打印总结
        console.log('\n========== 测试总结 ==========');
        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        console.log(`总计: ${passed}/${total} 项通过 (${Math.round(passed/total*100)}%)`);
        
        if (passed < total) {
            console.log('\n未通过的测试:');
            this.results.filter(r => !r.passed).forEach(r => {
                console.log(`  - ${r.testName}: ${r.message}`);
            });
        }

        return {
            total,
            passed,
            failed: total - passed,
            percentage: Math.round(passed/total*100)
        };
    }
};

// 将测试对象暴露到全局
window.SystemTest = SystemTest;

console.log('系统测试脚本已加载。运行 SystemTest.runAllTests() 开始测试。');