# toolbox-yaml-generator

本工具为 genai-toolbox 的 YAML 配置可视化生成器，支持多数据源、多工具的配置、导入、编辑、预览、复制与下载，完全离线可用。

当前支持的数据源类型

- MySQL
- SQLite
- MongoDB

核心页面与脚本

- 页面入口: [index.html](index.html)
- UI 渲染: [js/ui.js](js/ui.js)
- YAML 生成: [js/yamlGenerator.js](js/yamlGenerator.js)
- YAML 导入: [js/yamlImporter.js](js/yamlImporter.js)
- 主流程: [js/app.js](js/app.js)

## 使用方法

1) 打开页面

- 直接用浏览器打开 [index.html](index.html)，无需服务器。

2) 管理数据源

- 在“数据源管理”中点击“添加数据源”，选择类型并输入名称。
- 根据不同类型填写必要字段：
  - MySQL: host、port、database、user、password、queryTimeout(可选)
  - SQLite: database
  - MongoDB: host、port、database、user、password、options(附加连接参数)
- 可添加多个不同类型的数据源，名称全局唯一。

3) 内置工具

- 每个数据源自动生成对应的内置工具，并可通过勾选启用/禁用：
  - MySQL: execute_sql_${source}、list_tables_${source}
  - SQLite: sqlite_execute_${source}
  - MongoDB: mongo_execute_${source}

4) 自定义工具

- 在“自定义工具”中可添加自定义工具，填写工具名、类型、绑定数据源、描述、SQL/操作、参数（逗号分隔）。
- 工具名全局唯一（内置与自定义之间不允许重名）。

5) 生成与导出

- 点击“生成 YAML”后可在“YAML 预览”查看输出，并可复制或下载。

6) 导入 YAML

- 点击“导入 YAML”选择本地 YAML 文件，系统将自动回填到表单并刷新 UI。

导入行为说明

- 数据源：将 YAML 中的 sources 对象映射为多数据源列表展示。
- 自定义工具：将 YAML 中的 tools 中非内置命名的条目作为自定义工具回填。
- 内置工具启用状态：若 YAML 的 tools 中存在某个内置工具的同名条目，则对应内置工具的复选框恢复为已勾选；否则保持未勾选。
- 渲染：导入完成后会调用渲染函数刷新 UI，确保数据源与工具列表即时更新。

## YAML 结构

生成器输出结构由 [buildYamlConfig()](js/yamlGenerator.js) 定义，形如：

- sources: 映射对象，以数据源名为键，值包含 kind 与各自配置字段
- tools: 映射对象，以工具名为键，值包含 kind、source、description、statement、parameters
- toolsets: 预置的工具集合，当前提供 all-database-tools，包含所有启用的工具名

示例片段（简化）:

```yaml
sources:
  mydb:
    kind: mysql
    host: 127.0.0.1
    port: 3306
    database: demo
    user: root
    password: xxx
tools:
  execute_sql_mydb:
    kind: mysql-execute-sql
    source: mydb
    description: MySQL 通用 SQL 执行
  list_tables_mydb:
    kind: mysql-sql
    source: mydb
    description: MySQL 表结构/元数据查询
    statement: SELECT ...
toolsets:
  all-database-tools:
    - execute_sql_mydb
    - list_tables_mydb
```

## 依赖说明

- 本工具所有依赖均已本地化，无需外网。
- 使用 [js-yaml](https://github.com/nodeca/js-yaml) 进行 YAML 解析与生成，MIT 协议，见 [libs/js-yaml.min.js](libs/js-yaml.min.js) 与 `LICENSES/js-yaml-LICENSE.txt`。

## 目录结构

- [index.html](index.html)：主页面
- [css/styles.css](css/styles.css)：样式
- [js/](js/)：主逻辑与模块
- [libs/js-yaml.min.js](libs/js-yaml.min.js)：YAML 解析/生成库
- [LICENSES/](LICENSES/)：第三方依赖许可证
- [README.md](README.md)：本说明

## 变更记录

- 2025-08-23
  - 修复导入 YAML 后不显示数据源的问题：将 UI 渲染函数暴露为全局以供导入逻辑调用，参见 [renderSources()](js/ui.js)、[renderBuiltinTools()](js/ui.js)、[renderCustomTools()](js/ui.js) 的 window 绑定。
  - 导入时恢复内置工具启用状态：若 YAML 中存在同名内置工具，则在 [importYamlToState()](js/yamlImporter.js) 中自动将对应内置工具 enabled 设为 true。
  - 修复删除数据源的联动清理：在 [renderSources() 删除监听](js/ui.js) 中先缓存被删项名称再移除，并据此过滤相应内置工具。


## 本地开发与部署

本项目为纯静态站点，可直接通过 npm 脚本完成本地预览、构建与部署（GitHub Pages）。已在项目中加入以下脚本与构建工具，离线可用。

### 环境要求
- Node.js 16+（推荐 18+）
- 已安装 npm
- 若要部署到 GitHub Pages，需要已初始化 Git 仓库并设置远程 origin 指向你的 GitHub 仓库

### 安装依赖
```bash
npm install
```

### 本地预览（开发）
```bash
npm start
# 启动本地静态服务，默认端口 5173
# 访问 http://localhost:5173
```

### 构建静态文件
```bash
npm run build
# 产物输出到 dist/ 目录
```

### 通过 npm 一键部署到 GitHub Pages
```bash
npm run deploy
```
说明：
- 首次执行会自动创建 gh-pages 分支并推送构建产物（dist/）
- 前往 GitHub 仓库 Settings -> Pages，将 Source 配置为 gh-pages 分支
- 如需自定义域名，仓库根目录创建 CNAME 文件并在部署前放入 dist/（或按需扩展 build 脚本）

### 目录与脚本说明
- 构建脚本：[`scripts/build.js`](scripts/build.js)
  - 逐项复制 `index.html`、[`css/`](css/)、[`js/`](js/)、[`libs/`](libs/)、[`LICENSES/`](LICENSES/) 到 dist/
  - 不依赖打包器，保持完全离线与可读目录结构
- npm 脚本：见 [`package.json`](package.json)
  - `start` 本地静态服务（http-server）
  - `build` 生成 dist
  - `deploy` 构建并使用 gh-pages 将 dist 发布到 gh-pages 分支
- 忽略文件：见 [`.gitignore`](.gitignore)

### 其他部署方式（可选）
- 任意静态服务器（Nginx/Apache/OSS/对象存储）：执行 `npm run build` 后将 dist/ 上传到你的静态托管环境即可
- Docker/Nginx：可将 dist/ 用 Nginx 镜像部署（后续可按需增加 Dockerfile）
