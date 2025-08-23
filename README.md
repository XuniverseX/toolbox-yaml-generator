# 数据库 YAML 配置生成器

本工具为 genai-toolbox 的 YAML 配置可视化生成器，支持多数据源、多工具的配置、导入、编辑、预览、复制与下载，完全离线可用。

当前支持的数据源类型
- MySQL
- SQLite
- MongoDB

核心页面与脚本
- 页面入口: [index.html](webapps/yaml-configurator/index.html)
- UI 渲染: [js/ui.js](webapps/yaml-configurator/js/ui.js)
- YAML 生成: [js/yamlGenerator.js](webapps/yaml-configurator/js/yamlGenerator.js)
- YAML 导入: [js/yamlImporter.js](webapps/yaml-configurator/js/yamlImporter.js)
- 主流程: [js/app.js](webapps/yaml-configurator/js/app.js)

## 使用方法

1) 打开页面
- 直接用浏览器打开 [index.html](webapps/yaml-configurator/index.html)，无需服务器。

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

生成器输出结构由 [buildYamlConfig()](webapps/yaml-configurator/js/yamlGenerator.js:2) 定义，形如：
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
- 使用 [js-yaml](https://github.com/nodeca/js-yaml) 进行 YAML 解析与生成，MIT 协议，见 [libs/js-yaml.min.js](webapps/yaml-configurator/libs/js-yaml.min.js) 与 `LICENSES/js-yaml-LICENSE.txt`。

## 目录结构

- [index.html](webapps/yaml-configurator/index.html)：主页面
- [css/styles.css](webapps/yaml-configurator/css/styles.css)：样式
- [js/](webapps/yaml-configurator/js/)：主逻辑与模块
- [libs/js-yaml.min.js](webapps/yaml-configurator/libs/js-yaml.min.js)：YAML 解析/生成库
- [LICENSES/](webapps/yaml-configurator/LICENSES/)：第三方依赖许可证
- [README.md](webapps/yaml-configurator/README.md)：本说明

## 变更记录

- 2025-08-23
  - 修复导入 YAML 后不显示数据源的问题：将 UI 渲染函数暴露为全局以供导入逻辑调用，参见 [renderSources()](webapps/yaml-configurator/js/ui.js:6)、[renderBuiltinTools()](webapps/yaml-configurator/js/ui.js:149)、[renderCustomTools()](webapps/yaml-configurator/js/ui.js:179) 的 window 绑定。
  - 导入时恢复内置工具启用状态：若 YAML 中存在同名内置工具，则在 [importYamlToState()](webapps/yaml-configurator/js/yamlImporter.js:28) 中自动将对应内置工具 enabled 设为 true。
  - 修复删除数据源的联动清理：在 [renderSources() 删除监听](webapps/yaml-configurator/js/ui.js:18) 中先缓存被删项名称再移除，并据此过滤相应内置工具。
