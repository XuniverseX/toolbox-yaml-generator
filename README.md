# MySQL YAML 配置生成器

本工具为 genai-toolbox YAML 配置的可视化生成器，支持 MySQL 源与工具的配置、导入、编辑、预览、复制与下载，完全离线可用。

## 使用方法

1. 打开 `index.html`，无需服务器，直接用浏览器访问即可。
2. 填写 MySQL 源配置（host、port、database、user、password、queryTimeout 可选）。
3. 勾选/取消内置工具（execute_sql 固定，list_tables 可选）。
4. 可添加自定义工具，填写工具名、描述、SQL 及参数（参数用逗号分隔）。
5. 点击“生成 YAML”后可预览、复制或下载 YAML 文件。
6. 支持导入 YAML 文件，自动回填表单，便于二次编辑。

## 依赖说明

- 本工具所有依赖均已本地化，无需外网。
- 使用 [js-yaml](https://github.com/nodeca/js-yaml) 进行 YAML 解析与生成，MIT 协议，见 `libs/js-yaml.min.js` 与 `LICENSES/js-yaml-LICENSE.txt`。

## 目录结构

- `index.html`：主页面
- `css/styles.css`：样式
- `js/`：主逻辑与模块
- `libs/js-yaml.min.js`：YAML 解析/生成库
- `LICENSES/`：第三方依赖许可证
- `README.md`：本说明

## 扩展说明

- 目前仅支持 MySQL，后续可扩展 Postgres、MSSQL 等，建议通过抽象字段元数据与渲染器实现多数据库支持。
- 如需自定义导出格式或字段校验，可在 `js/yamlGenerator.js` 与 `js/validation.js` 中扩展。

## 离线使用

- 所有资源本地可用，适合内网或无外网环境。
- 建议使用现代浏览器（Chrome、Edge、Firefox、Safari）。
