---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 3045022100fdde80cda954379199a51b74f016910d8d8086f4999e6608c82c5f8a70c6383302203b086c35dec308cad742be9586ede0aadd6a80ec20382e009f582fd209b93f8e
    ReservedCode2: 3043021f103aed61aa20970ca3bf2ea277c80ca874fe2f83ab1bd62c2e0ecb926b6daa0220449a768d3ab65b4bd3fff61d717d84198cf55910c1e80ac11e7561f2c59dfddd
---

# 沼气提纯站项目全生命周期管理系统

> 企业级项目管理解决方案，实现项目可视化、人员智能调配、进度管控。

## 📋 功能特性

### 1. 项目管理
- ✏️ 项目信息全生命周期管理（跟踪→签约→手续→建设→运营）
- 📍 地理位置精确到区县
- ⚙️ 技术参数管理（设计规模、日产气量、处理工艺等）
- 📅 各阶段时间安排与牵头人配置
- 🔍 多维度筛选与搜索

### 2. 地图可视化
- 🗺️ 高德地图集成，全国项目分布一目了然
- 📌 项目点位标记，点击查看详情
- ⭕ 150公里自动聚合项目群
- 🎯 项目群范围圈可视化

### 3. 人员管理
- 👤 人员档案管理（基本信息、能力评估）
- 🏢 组织架构与部门归属
- 🎯 能力雷达图可视化
- 📊 工作负荷实时监控

### 4. 智能推荐
- 🤖 基于距离、经验、工艺匹配度的牵头人推荐
- 📍 150km项目群自动聚合
- ⚠️ 人员配置合理性检查（超负荷、距离过远等）

### 5. 甘特图
- 📈 项目进度甘特图展示
- 👁️ 按项目/人员双视图切换
- 📅 生命周期阶段颜色区分
- 📊 人员工作负荷分析图表

### 6. 数据导出
- 📤 项目列表导出Excel
- 📤 人员列表导出Excel
- 📤 项目群数据导出
- 📤 完整报告多工作表导出

---

## 🚀 快速开始

### 环境要求
- 现代浏览器（Chrome/Firefox/Edge/Safari）
- 网络连接（加载CDN资源）

### 运行方式

#### 方式一：直接打开
```bash
# 下载项目后，直接用浏览器打开 index.html
open index.html
```

#### 方式二：本地服务器（推荐）
```bash
# 使用 Python 启动本地服务器
cd biogas-purification-system
python -m http.server 8080

# 浏览器访问 http://localhost:8080
```

#### 方式三：VS Code Live Server
安装 Live Server 插件，右键点击 index.html → "Open with Live Server"

---

## 📁 项目结构

```
biogas-purification-system/
├── index.html              # 主入口页面
├── DESIGN.md              # 设计文档
├── README.md              # 使用说明
├── css/
│   ├── main.css           # 全局样式
│   ├── components.css     # 组件样式
│   └── gantt.css          # 甘特图样式
├── js/
│   ├── app.js             # 应用主入口
│   ├── dataStore.js       # 数据存储管理
│   ├── projectManager.js  # 项目管理模块
│   ├── personnelManager.js # 人员管理模块
│   ├── mapVisualization.js # 地图可视化模块
│   ├── ganttChart.js      # 甘特图模块
│   ├── smartRecommendation.js # 智能推荐模块
│   ├── excelExporter.js   # Excel导出模块
│   └── utils.js           # 工具函数
└── data/                  # 示例数据目录
```

---

## 📖 使用指南

### 1. 新建项目
1. 点击导航栏「项目管理」
2. 点击「新建项目」按钮
3. 填写项目信息：
   - 基本信息：名称、位置（省市区县）
   - 技术参数：设计规模、日产量、处理工艺
   - 生命周期：各阶段时间范围
4. 点击保存

### 2. 添加人员
1. 点击导航栏「人员管理」
2. 点击「添加人员」按钮
3. 填写人员信息：
   - 基本信息：姓名、性别、年龄、部门
   - 能力评估：技术/管理/协调能力（1-10分）
   - 熟悉工艺：PSA/膜分离/深冷分离
4. 点击保存

### 3. 智能推荐牵头人
1. 在项目列表中找到目标项目
2. 点击操作栏的💡图标
3. 查看各阶段推荐列表
4. 点击「指派」按钮分配牵头人

### 4. 查看地图
1. 点击导航栏「地图视图」
2. 点击「显示所有项目」查看全部点位
3. 点击「显示项目群」查看150km聚合结果
4. 点击地图标记查看项目详情

### 5. 查看甘特图
1. 点击导航栏「甘特图」
2. 切换「按项目」/「按人员」视图
3. 查看人员工作负荷分析
4. 红色虚线表示今日位置

### 6. 导出数据
1. 点击顶部导航「导出」下拉菜单
2. 选择导出类型：
   - 导出项目：仅项目列表
   - 导出人员：仅人员列表
   - 导出完整报告：包含多个工作表

---

## 🔧 技术架构

### 前端技术栈
| 技术 | 用途 | 版本 |
|------|------|------|
| HTML5 | 页面结构 | - |
| CSS3 + Tailwind CSS | 样式框架 | 3.x |
| JavaScript (ES6+) | 逻辑实现 | - |
| 高德地图 API | 地图可视化 | 2.0 |
| ECharts | 图表组件 | 5.x |
| SheetJS | Excel导出 | 0.20.x |
| Font Awesome | 图标库 | 6.x |

### 数据存储
- **当前版本**：LocalStorage（浏览器本地存储）
- **数据格式**：JSON
- **容量限制**：约5MB（浏览器限制）

### 推荐算法
```
匹配度 = 工艺匹配×0.25 + 经验值×0.20 + 距离因子×0.20 + 负载因子×0.20 + 能力×0.15

- 工艺匹配: 人员熟悉工艺包含项目工艺 ? 100 : 0
- 经验值: min(项目经验数/10, 1) × 100
- 距离因子: (1 - min(距离/500, 1)) × 100
- 负载因子: (1 - min(当前项目数/最大项目数, 1)) × 100
- 能力: 综合技术/管理/协调能力评分
```

---

## 🎯 业务流程

```
┌─────────────┐
│   项目跟踪   │
└──────┬──────┘
       ▼
┌─────────────┐
│   项目签约   │ ← 签约日作为基准
└──────┬──────┘
       ▼
┌─────────────┐     ┌─────────────┐
│   手续办理   │ ←→ │ 智能推荐牵头人 │
└──────┬──────┘     └─────────────┘
       ▼
┌─────────────┐
│   建设施工   │
└──────┬──────┘
       ▼
┌─────────────┐
│   运营维护   │
└─────────────┘
```

---

## ⚙️ 配置说明

### 高德地图API Key
系统已内置测试Key，如需更换：
```html
<!-- index.html 中修改 -->
<script src="https://webapi.amap.com/maps?v=2.0&key=你的KEY"></script>
```

### 项目阶段默认时长
```javascript
// js/utils.js 中修改
const PROJECT_STAGES = [
    { key: 'tracking', name: '跟踪', defaultDuration: 30 },      // 30天
    { key: 'contract', name: '签约', defaultDuration: 30 },      // 30天
    { key: 'procedure', name: '手续', defaultDuration: 120 },    // 120天
    { key: 'construction', name: '建设', defaultDuration: 150 }, // 150天
    { key: 'operation', name: '运营', defaultDuration: 365 }     // 持续运营
];
```

### 项目群聚合距离
```javascript
// js/smartRecommendation.js 中修改
groupProjectsByDistance(maxDistance = 150) // 默认150公里
```

---

## 📝 数据备份与恢复

### 导出备份
```javascript
// 浏览器控制台执行
const data = dataStore.exportToJSON();
const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'backup_' + new Date().toISOString().split('T')[0] + '.json';
a.click();
```

### 导入恢复
```javascript
// 读取备份文件后执行
dataStore.importFromJSON(backupData);
```

---

## 🐛 常见问题

### Q: 地图无法显示？
A: 检查网络连接，确保能访问高德地图API。如在中国大陆外，可能需要代理。

### Q: 数据丢失？
A: 本系统使用浏览器LocalStorage存储数据，清理浏览器缓存会导致数据丢失。建议定期导出Excel备份。

### Q: 项目群不聚合？
A: 确保项目位置信息包含经纬度坐标。编辑项目时会自动进行地理编码。

### Q: 推荐算法不准确？
A: 确保人员信息完整（熟悉工艺、常驻位置等），算法依赖这些数据计算匹配度。

---

## 🛣️ 未来规划

- [ ] 后端API支持（数据持久化到服务器）
- [ ] 用户登录与权限管理
- [ ] 项目文件附件上传
- [ ] 消息通知系统
- [ ] 移动端App
- [ ] 数据可视化大屏

---

## 📄 License

MIT License - 仅供内部使用

---

## 👨‍💻 开发团队

**清科威创** - 企业级项目管理解决方案

如有问题或建议，欢迎反馈！

---

*文档版本: 1.0*  
*更新日期: 2026-03-28*
