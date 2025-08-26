// 多数据源+多工具 YAML 生成器
function buildYamlConfig() {
  const state = window.yamlConfigState;
  // sources
  const sources = {};
  for (const src of state.sources) {
    if (src.type === 'mysql') {
      sources[src.name] = {
        kind: 'mysql',
        host: src.config.host,
        port: Number(src.config.port),
        database: src.config.database,
        user: src.config.user,
        password: src.config.password,
        ...(src.config.queryTimeout && src.config.queryTimeout.trim() ? {queryTimeout: src.config.queryTimeout.trim()} : {})
      };
    }
    if (src.type === 'sqlite') {
      sources[src.name] = {
        kind: 'sqlite',
        database: src.config.database
      };
    }
    if (src.type === 'mongodb') {
      sources[src.name] = {
        kind: 'mongodb',
        uri: src.config.uri
      };
    }
    if (src.type === 'redis') {
      // address 支持字符串(多行)或数组
      let addrs = [];
      if (Array.isArray(src.config.address)) {
        addrs = src.config.address.map(s => String(s).trim()).filter(s => s);
      } else if (typeof src.config.address === 'string') {
        addrs = src.config.address.split(/\r?\n/).map(s => s.trim()).filter(s => s);
      }
      const obj = {
        kind: 'redis',
        address: addrs
      };
      if (src.config.username && String(src.config.username).trim()) obj.username = String(src.config.username).trim();
      if (src.config.password && String(src.config.password).trim()) obj.password = String(src.config.password).trim();
      if (src.config.database !== '' && src.config.database !== undefined && src.config.database !== null) {
        const dbn = Number(src.config.database);
        if (!Number.isNaN(dbn)) obj.database = dbn;
      }
      if (src.config.clusterEnabled === true) obj.clusterEnabled = true;
      if (src.config.useGCPIAM === true) obj.useGCPIAM = true;
      sources[src.name] = obj;
    }
    if (src.type === 'http') {
      // 解析 KV 文本为对象
      const parseKVLines = (txt) => {
        const out = {};
        (String(txt || '')).split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(line => {
          let i = line.indexOf(':');
          let sep = ':';
          if (i === -1) { i = line.indexOf('='); sep = '='; }
          if (i === -1) { out[line.trim()] = ''; return; }
          const k = line.slice(0, i).trim();
          const v = line.slice(i + 1).trim();
          if (k) out[k] = v;
        });
        return out;
      };
      const obj = {
        kind: 'http',
        baseUrl: String(src.config.baseUrl || '').trim()
      };
      const timeout = String(src.config.timeout || '').trim();
      if (timeout) obj.timeout = timeout;
      const headersObj = parseKVLines(src.config.headers || '');
      if (Object.keys(headersObj).length) obj.headers = headersObj;
      const qpObj = parseKVLines(src.config.queryParams || '');
      if (Object.keys(qpObj).length) obj.queryParams = qpObj;
      if (src.config.disableSslVerification === true) obj.disableSslVerification = true;
      sources[src.name] = obj;
    }
  }
  // tools
  const tools = {};

  // Helper to build MongoDB tool configs that match genai-toolbox official kinds
  function buildMongoToolConfig(tool) {
    const base = {
      kind: tool.kind,
      source: tool.source,
      description: tool.description || ''
    };
    const withDBColl = (obj) => {
      obj.database = tool.database || '';
      obj.collection = tool.collection || '';
      return obj;
    };
    switch (tool.kind) {
      case 'mongodb-find': {
        const obj = withDBColl({
          ...base,
          filterPayload: tool.filterPayload || '',
          filterParams: Array.isArray(tool.filterParams) ? tool.filterParams : []
        });
        if (tool.projectPayload) obj.projectPayload = tool.projectPayload;
        if (Array.isArray(tool.projectParams)) obj.projectParams = tool.projectParams;
        if (tool.sortPayload) obj.sortPayload = tool.sortPayload;
        if (Array.isArray(tool.sortParams)) obj.sortParams = tool.sortParams;
        if (typeof tool.limit === 'number' && !isNaN(tool.limit) && tool.limit > 0) {
          obj.limit = Math.trunc(tool.limit);
        }
        return obj;
      }
      case 'mongodb-find-one': {
        const obj = withDBColl({
          ...base,
          filterPayload: tool.filterPayload || '',
          filterParams: Array.isArray(tool.filterParams) ? tool.filterParams : []
        });
        if (tool.projectPayload) obj.projectPayload = tool.projectPayload;
        if (Array.isArray(tool.projectParams)) obj.projectParams = tool.projectParams;
        if (tool.sortPayload) obj.sortPayload = tool.sortPayload;
        if (Array.isArray(tool.sortParams)) obj.sortParams = tool.sortParams;
        return obj;
      }
      case 'mongodb-aggregate': {
        const obj = withDBColl({
          ...base,
          pipelinePayload: tool.pipelinePayload || '',
          pipelineParams: Array.isArray(tool.pipelineParams) ? tool.pipelineParams : []
        });
        if (tool.canonical === true) obj.canonical = true;
        if (tool.readOnly === true) obj.readOnly = true;
        return obj;
      }
      case 'mongodb-insert-one': {
        const obj = withDBColl({
          ...base,
          canonical: !!tool.canonical
        });
        return obj;
      }
      case 'mongodb-insert-many': {
        const obj = withDBColl({
          ...base,
          canonical: !!tool.canonical
        });
        return obj;
      }
      case 'mongodb-update-one': {
        const obj = withDBColl({
          ...base,
          filterPayload: tool.filterPayload || '',
          filterParams: Array.isArray(tool.filterParams) ? tool.filterParams : [],
          updatePayload: tool.updatePayload || '',
          updateParams: Array.isArray(tool.updateParams) ? tool.updateParams : [],
          canonical: !!tool.canonical
        });
        if (tool.upsert === true) obj.upsert = true;
        return obj;
      }
      case 'mongodb-update-many': {
        const obj = withDBColl({
          ...base,
          filterPayload: tool.filterPayload || '',
          filterParams: Array.isArray(tool.filterParams) ? tool.filterParams : [],
          updatePayload: tool.updatePayload || '',
          updateParams: Array.isArray(tool.updateParams) ? tool.updateParams : [],
          canonical: !!tool.canonical
        });
        if (tool.upsert === true) obj.upsert = true;
        return obj;
      }
      case 'mongodb-delete-one':
      case 'mongodb-delete-many': {
        const obj = withDBColl({
          ...base,
          filterPayload: tool.filterPayload || '',
          filterParams: Array.isArray(tool.filterParams) ? tool.filterParams : []
        });
        return obj;
      }
      default:
        return base;
    }
  }

  for (const tool of state.builtinTools) {
    if (!tool.enabled) continue;
    if (tool.type === 'mysql' && tool.name.startsWith('execute_sql')) {
      tools[tool.name] = {
        kind: 'mysql-execute-sql',
        source: tool.source,
        description: 'MySQL 通用 SQL 执行'
      };
    }
    if (tool.type === 'mysql' && tool.name.startsWith('list_tables')) {
      tools[tool.name] = {
        kind: 'mysql-sql',
        source: tool.source,
        description: "MySQL 表结构/元数据查询",
        statement: getListTablesSQL(),
        parameters: [
          {
            name: "table_names",
            type: "string",
            description: "可选：逗号分隔的表名列表，留空则返回所有表",
            default: ""
          },
          {
            name: "output_format",
            type: "string",
            description: "可选：simple 仅返回表名，detailed 返回完整结构",
            default: "detailed"
          }
        ]
      };
    }
    if (tool.type === 'sqlite') {
      tools[tool.name] = {
        kind: 'sqlite-sql',
        source: tool.source,
        description: 'SQLite 通用 SQL 执行',
        statement: 'SELECT 1;',
        parameters: [
          {
            name: "sql",
            type: "string",
            description: "要执行的 SQL 语句"
          }
        ]
      };
    }
    if (tool.type === 'redis' && tool.name.startsWith('redis_ping_')) {
      tools[tool.name] = {
        kind: 'redis',
        source: tool.source,
        description: 'Redis PING 健康检查',
        commands: [
          ["PING"]
        ]
      };
    }
    if (tool.type === 'redis' && tool.name.startsWith('redis_get_')) {
      tools[tool.name] = {
        kind: 'redis',
        source: tool.source,
        description: 'Redis GET key',
        commands: [
          ["GET", "$key"]
        ],
        parameters: [
          { name: "key", type: "string", description: "键名" }
        ]
      };
    }
    if (tool.type === 'redis' && tool.name.startsWith('redis_set_')) {
      tools[tool.name] = {
        kind: 'redis',
        source: tool.source,
        description: 'Redis SET key value',
        commands: [
          ["SET", "$key", "$value"]
        ],
        parameters: [
          { name: "key", type: "string", description: "键名" },
          { name: "value", type: "string", description: "值" }
        ]
      };
    }
  }
  for (const tool of state.customTools) {
    const kind = String(tool.kind || '').trim();
    if (!tool.name || !tool.source) continue;

    // 仅在需要 statement 的种类（mysql-sql/sqlite-sql 等）做 statement 必填
    const needsStatement = !(kind.startsWith('mongodb-') || kind === 'redis' || kind === 'http');
    if (needsStatement && !tool.statement) continue;

    // 通用参数校验（名称非空）
    const checkParams = (arr) => {
      if (!Array.isArray(arr)) return;
      for (const p of arr) {
        if (!p || !String(p.name || '').trim()) {
          throw new Error('自定义工具 ' + tool.name + ' 存在未命名的参数');
        }
      }
    };

    // Mongo 官方种类：沿用结构化构造器
    if (kind.startsWith('mongodb-')) {
      tools[tool.name] = buildMongoToolConfig(tool);
      continue;
    }

    // Redis 自定义工具：commandsText -> commands [][]string
    if (kind === 'redis') {
      checkParams(tool.parameters);
      const commandsText = String(tool.commandsText || '').trim();
      const lines = commandsText ? commandsText.split(/\r?\n/) : [];
      const commands = [];
      for (const line of lines) {
        const l = line.trim();
        if (!l) continue;
        const parts = l.split(/\s+/);
        if (parts.length) commands.push(parts);
      }
      if (!commands.length) continue;

      tools[tool.name] = {
        kind: 'redis',
        source: tool.source,
        description: tool.description || '',
        commands,
        parameters: (tool.parameters || []).map(p => ({
          name: p.name,
          type: 'string',
          description: p.description || '',
          default: p.default || ''
        }))
      };
      continue;
    }

    // HTTP 自定义工具：method/path/headersText/requestBody + 四组参数
    if (kind === 'http') {
      const parseKVLines = (txt) => {
        const out = {};
        (String(txt || '')).split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(line => {
          let i = line.indexOf(':');
          if (i === -1) i = line.indexOf('=');
          if (i === -1) { out[line.trim()] = ''; return; }
          const k = line.slice(0, i).trim();
          const v = line.slice(i + 1).trim();
          if (k) out[k] = v;
        });
        return out;
      };

      checkParams(tool.pathParams);
      checkParams(tool.queryParams);
      checkParams(tool.bodyParams);
      checkParams(tool.headerParams);

      const obj = {
        kind: 'http',
        source: tool.source,
        description: tool.description || '',
        method: String(tool.method || 'GET'),
        path: String(tool.path || '')
      };

      const headersObj = parseKVLines(tool.headersText || '');
      if (Object.keys(headersObj).length) obj.headers = headersObj;

      const reqBody = String(tool.requestBody || '').trim();
      if (reqBody) obj.requestBody = reqBody;

      const mapParamArr = (arr) => (Array.isArray(arr) ? arr.map(p => ({
        name: p.name,
        type: 'string',
        description: p.description || '',
        default: p.default || ''
      })) : undefined);

      const pathParams = mapParamArr(tool.pathParams);
      const queryParams = mapParamArr(tool.queryParams);
      const bodyParams = mapParamArr(tool.bodyParams);
      const headerParams = mapParamArr(tool.headerParams);

      if (pathParams && pathParams.length) obj.pathParams = pathParams;
      if (queryParams && queryParams.length) obj.queryParams = queryParams;
      if (bodyParams && bodyParams.length) obj.bodyParams = bodyParams;
      if (headerParams && headerParams.length) obj.headerParams = headerParams;

      // 必填
      if (!obj.path) continue;

      tools[tool.name] = obj;
      continue;
    }

    // 其他类型：保留原逻辑（需要 statement）
    checkParams(tool.parameters);
    tools[tool.name] = {
      kind: tool.kind,
      source: tool.source,
      description: tool.description || '',
      statement: tool.statement,
      parameters: (tool.parameters || []).map(p => ({
        name: p.name,
        type: 'string',
        description: p.description || '',
        default: p.default || ''
      }))
    };
  }
  // toolsets
  const toolsets = {
    'all-database-tools': Object.keys(tools)
  };
  return { sources, tools, toolsets };
}

// list_tables SQL（仅 MySQL 用）
function getListTablesSQL() {
  return `SELECT
    T.TABLE_SCHEMA AS schema_name,
    T.TABLE_NAME AS object_name,
    CASE
        WHEN @output_format = 'simple' THEN
            JSON_OBJECT('name', T.TABLE_NAME)
        ELSE
          CONVERT( JSON_OBJECT(
              'schema_name', T.TABLE_SCHEMA,
              'object_name', T.TABLE_NAME,
              'object_type', 'TABLE',
              'owner', (
                  SELECT
                      IFNULL(U.GRANTEE, 'N/A')
                  FROM
                      INFORMATION_SCHEMA.SCHEMA_PRIVILEGES U
                  WHERE
                      U.TABLE_SCHEMA = T.TABLE_SCHEMA
                  LIMIT 1
              ),
              'comment', IFNULL(T.TABLE_COMMENT, ''),
              'columns', (
                  SELECT
                      IFNULL(
                          JSON_ARRAYAGG(
                              JSON_OBJECT(
                                  'column_name', C.COLUMN_NAME,
                                  'data_type', C.COLUMN_TYPE,
                                  'ordinal_position', C.ORDINAL_POSITION,
                                  'is_not_nullable', IF(C.IS_NULLABLE = 'NO', TRUE, FALSE),
                                  'column_default', C.COLUMN_DEFAULT,
                                  'column_comment', IFNULL(C.COLUMN_COMMENT, '')
                              )
                          ),
                          JSON_ARRAY()
                      )
                  FROM
                      INFORMATION_SCHEMA.COLUMNS C
                  WHERE
                      C.TABLE_SCHEMA = T.TABLE_SCHEMA AND C.TABLE_NAME = T.TABLE_NAME
                  ORDER BY C.ORDINAL_POSITION
              ),
              'constraints', (
                  SELECT
                      IFNULL(
                          JSON_ARRAYAGG(
                              JSON_OBJECT(
                                  'constraint_name', TC.CONSTRAINT_NAME,
                                  'constraint_type',
                                      CASE TC.CONSTRAINT_TYPE
                                          WHEN 'PRIMARY KEY' THEN 'PRIMARY KEY'
                                          WHEN 'FOREIGN KEY' THEN 'FOREIGN KEY'
                                          WHEN 'UNIQUE' THEN 'UNIQUE'
                                          ELSE TC.CONSTRAINT_TYPE
                                      END,
                                  'constraint_definition', '',
                                  'constraint_columns', (
                                      SELECT
                                          IFNULL(JSON_ARRAYAGG(KCU.COLUMN_NAME), JSON_ARRAY())
                                      FROM
                                          INFORMATION_SCHEMA.KEY_COLUMN_USAGE KCU
                                      WHERE
                                          KCU.CONSTRAINT_SCHEMA = TC.CONSTRAINT_SCHEMA
                                          AND KCU.CONSTRAINT_NAME = TC.CONSTRAINT_NAME
                                          AND KCU.TABLE_NAME = TC.TABLE_NAME
                                      ORDER BY KCU.ORDINAL_POSITION
                                  ),
                                  'foreign_key_referenced_table', IF(TC.CONSTRAINT_TYPE = 'FOREIGN KEY', RC.REFERENCED_TABLE_NAME, NULL),
                                  'foreign_key_referenced_columns', IF(TC.CONSTRAINT_TYPE = 'FOREIGN KEY',
                                      (SELECT IFNULL(JSON_ARRAYAGG(FKCU.REFERENCED_COLUMN_NAME), JSON_ARRAY())
                                      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE FKCU
                                      WHERE FKCU.CONSTRAINT_SCHEMA = TC.CONSTRAINT_SCHEMA
                                          AND FKCU.CONSTRAINT_NAME = TC.CONSTRAINT_NAME
                                          AND FKCU.TABLE_NAME = TC.TABLE_NAME
                                          AND FKCU.REFERENCED_TABLE_NAME IS NOT NULL
                                      ORDER BY FKCU.ORDINAL_POSITION),
                                      NULL
                                  )
                              )
                          ),
                          JSON_ARRAY()
                      )
                  FROM
                      INFORMATION_SCHEMA.TABLE_CONSTRAINTS TC
                  LEFT JOIN
                      INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS RC
                      ON TC.CONSTRAINT_SCHEMA = RC.CONSTRAINT_SCHEMA
                      AND TC.CONSTRAINT_NAME = RC.CONSTRAINT_NAME
                      AND TC.TABLE_NAME = RC.TABLE_NAME
                  WHERE
                      TC.TABLE_SCHEMA = T.TABLE_SCHEMA AND TC.TABLE_NAME = T.TABLE_NAME
              ),
              'indexes', (
                  SELECT
                      IFNULL(
                          JSON_ARRAYAGG(
                              JSON_OBJECT(
                                  'index_name', IndexData.INDEX_NAME,
                                  'is_unique', IF(IndexData.NON_UNIQUE = 0, TRUE, FALSE),
                                  'is_primary', IF(IndexData.INDEX_NAME = 'PRIMARY', TRUE, FALSE),
                                  'index_columns', IFNULL(IndexData.INDEX_COLUMNS_ARRAY, JSON_ARRAY())
                              )
                          ),
                          JSON_ARRAY()
                      )
                  FROM (
                      SELECT
                          S.TABLE_SCHEMA,
                          S.TABLE_NAME,
                          S.INDEX_NAME,
                          MIN(S.NON_UNIQUE) AS NON_UNIQUE,
                          JSON_ARRAYAGG(S.COLUMN_NAME) AS INDEX_COLUMNS_ARRAY
                      FROM
                          INFORMATION_SCHEMA.STATISTICS S
                      WHERE
                          S.TABLE_SCHEMA = T.TABLE_SCHEMA AND S.TABLE_NAME = T.TABLE_NAME
                      GROUP BY
                          S.TABLE_SCHEMA, S.TABLE_NAME, S.INDEX_NAME
                  ) AS IndexData
                  ORDER BY IndexData.INDEX_NAME
              ),
              'triggers', (
                  SELECT
                      IFNULL(
                          JSON_ARRAYAGG(
                              JSON_OBJECT(
                                  'trigger_name', TR.TRIGGER_NAME,
                                  'trigger_definition', TR.ACTION_STATEMENT
                              )
                          ),
                          JSON_ARRAY()
                      )
                  FROM
                      INFORMATION_SCHEMA.TRIGGERS TR
                  WHERE
                      TR.EVENT_OBJECT_SCHEMA = T.TABLE_SCHEMA AND TR.EVENT_OBJECT_TABLE = T.TABLE_NAME
                  ORDER BY TR.TRIGGER_NAME
              )
          ) USING utf8mb4)
      END AS object_details
FROM
    INFORMATION_SCHEMA.TABLES T
CROSS JOIN (SELECT @table_names := ?, @output_format := ?) AS variables
WHERE
    T.TABLE_SCHEMA NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')
    AND (NULLIF(TRIM(@table_names), '') IS NULL OR FIND_IN_SET(T.TABLE_NAME, @table_names))
    AND T.TABLE_TYPE = 'BASE TABLE'
ORDER BY
    T.TABLE_SCHEMA, T.TABLE_NAME;`;
}