# toolbox-yaml-generator

本工具为 genai-toolbox 的 YAML 配置可视化生成器，支持多数据源、多工具的配置、导入、编辑、预览、复制与下载，完全离线可用。

当前支持的数据源类型

- MySQL
- SQLite
- MongoDB
- Redis
- HTTP

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
  - MongoDB: uri
- 可添加多个不同类型的数据源，名称全局唯一。

3) 内置工具

- 每个数据源自动生成的内置工具如下（可勾选启用/禁用）：
  - MySQL: execute_sql_${source}、list_tables_${source}
  - SQLite: sqlite_execute_${source}
  - Redis: redis_ping_${source}、redis_get_${source}、redis_set_${source}
- MongoDB 不再自动生成“通用执行器”。请使用“Mongo 工具向导”创建官方支持的具体工具种类：mongodb-find、mongodb-find-one、mongodb-aggregate、mongodb-insert-one、mongodb-insert-many、mongodb-update-one、mongodb-update-many、mongodb-delete-one、mongodb-delete-many。
- HTTP 不自动生成内置工具，请使用 HTTP 自定义工具编辑器配置。

4) 自定义工具

- 在“自定义工具”中可添加自定义工具，填写工具名、类型、绑定数据源、描述与参数。
  - mysql-sql / sqlite-sql：需填写 SQL 语句 statement；参数列表（name、description、default，类型固定 string）。
  - mongodb-*（九种官方工具）：显示 Mongo 专用字段与参数分组，不使用 statement：
    - 通用字段：database、collection
    - find/find-one：filterPayload/filterParams；可选 projectPayload/projectParams、sortPayload/sortParams、limit（仅 find）
    - aggregate：pipelinePayload/pipelineParams；可选 canonical、readOnly
    - insert-one/insert-many：canonical（文档数据在运行时通过 data 参数输入）
    - update-one/update-many：filterPayload/filterParams、updatePayload/updateParams、canonical；可选 upsert
    - delete-one/delete-many：filterPayload/filterParams
  - redis：使用命令编辑器（每行一条命令，空格分隔参数；支持 $name 占位符）；参数列表输出到 tools.Parameters（类型为 string）。
    - 示例：SET $key $value、GET $key、LPUSH $list $values（数组参数将在执行时展开）
  - http：提供 method、path（支持 {{param}} 模板）、headers（KV 文本）、requestBody（模板），以及四组参数 path/query/body/header（类型为 string）。
    - 说明：请求实际执行时会将 Source.headers 与 Tool.headers 合并，Tool 覆盖 Source
- 占位符规则：Redis 使用 $name；HTTP 路径/体模板使用 {{name}}
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
  myredis:
    kind: redis
    address:
      - 127.0.0.1:6379
    # username: ${USER}
    # password: ${PASS}
    # database: 0
    # clusterEnabled: false
    # useGCPIAM: false
  myapi:
    kind: http
    baseUrl: https://api.example.com
    timeout: 30s
    headers:
      Accept: application/json
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
  redis_ping_myredis:
    kind: redis
    source: myredis
    description: Redis PING 健康检查
    commands:
      - [ "PING" ]
  redis_get_myredis:
    kind: redis
    source: myredis
    description: Redis GET
    commands:
      - [ "GET", "$key" ]
    parameters:
      - { name: key, type: string }
  http_get_user:
    kind: http
    source: myapi
    description: 获取用户信息
    method: GET
    path: /users/{{userId}}
    headerParams:
      - { name: Authorization, type: string }
    pathParams:
      - { name: userId, type: string }
toolsets:
  all-database-tools:
    - execute_sql_mydb
    - list_tables_mydb
    - redis_ping_myredis
    - redis_get_myredis
    - http_get_user
```

## 依赖说明

- 本工具所有依赖均已本地化，无需外网。
- 使用 [js-yaml](https://github.com/nodeca/js-yaml) 进行 YAML 解析与生成，MIT 协议，见 [libs/js-yaml.min.js](libs/js-yaml.min.js) 与 `LICENSES/js-yaml-LICENSE.txt`。

## 兼容性与已知限制

- 内置 MySQL list_tables 工具依赖 MySQL 8.0+ 的 JSON_ARRAYAGG/JSON_OBJECT 等函数。
- 对 MySQL 5.7 及以下版本不再提供兼容实现。
- 输出模式：
  - output_format=simple 仅返回表名
  - output_format=detailed 返回完整结构对象

## 目录结构

- [index.html](index.html)：主页面
- [css/styles.css](css/styles.css)：样式
- [js/](js/)：主逻辑与模块
- [libs/js-yaml.min.js](libs/js-yaml.min.js)：YAML 解析/生成库
- [LICENSES/](LICENSES/)：第三方依赖许可证
- [README.md](README.md)：本说明

## 变更记录

- 2025-08-25
  - MongoDB 源仅保留 uri 字段，生成不再拼接/输出 database；导入时兼容旧式 host/port/user/password/database/options，并在导入后归一为 uri
  - 自定义工具参数支持描述与默认值编辑，类型固定为 string；UI 改为参数列表可增删行；生成前校验参数名非空

- 2025-08-23
  - 修复导入 YAML 后不显示数据源的问题：将 UI 渲染函数暴露为全局以供导入逻辑调用，参见 [renderSources()](js/ui.js)、[renderBuiltinTools()](js/ui.js)、[renderCustomTools()](js/ui.js) 的 window 绑定。
  - 导入时恢复内置工具启用状态：若 YAML 中存在同名内置工具，则在 [importYamlToState()](js/yamlImporter.js) 中自动将对应内置工具 enabled 设为 true。
  - 修复删除数据源的联动清理：在 [renderSources() 删除监听](js/ui.js) 中先缓存被删项名称再移除，并据此过滤相应内置工具。

## 导入 YAML 支持说明

- 支持导入 kind=redis 与 kind=http 的 sources 与 tools，并回填至界面：
  - Redis 源：address 可为数组或单行/多行字符串；其余字段按界面项回填
  - HTTP 源：headers/queryParams 对象将转换为“key: value”多行文本；timeout 默认 30s
  - 内置 Redis 工具：如 YAML 中存在 redis_ping_/redis_get_/redis_set_，将自动勾选对应内置工具
  - 自定义 Redis 工具：commands 数组将回填为 commandsText 多行输入；parameters 回填
  - 自定义 HTTP 工具：method/path/headersText/requestBody 与四组参数（path/query/body/header）回填
- 生成与导入之间可实现等价往返（KV 顺序不保证稳定）

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
