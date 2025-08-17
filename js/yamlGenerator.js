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
      let uri = 'mongodb://';
      if (src.config.user && src.config.password) {
        uri += encodeURIComponent(src.config.user) + ':' + encodeURIComponent(src.config.password) + '@';
      }
      uri += src.config.host || 'localhost';
      if (src.config.port) uri += ':' + src.config.port;
      if (src.config.options && src.config.options.trim()) {
        uri += '/' + (src.config.database || '') + (src.config.options.startsWith('?') ? src.config.options : '?' + src.config.options);
      } else if (src.config.database) {
        uri += '/' + src.config.database;
      }
      sources[src.name] = {
        kind: 'mongodb',
        uri,
        database: src.config.database
      };
    }
  }
  // tools
  const tools = {};
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
    if (tool.type === 'mongodb') {
      tools[tool.name] = {
        kind: 'mongodb-execute',
        source: tool.source,
        description: 'MongoDB 通用操作',
        parameters: [
          {
            name: "collection",
            type: "string",
            description: "集合名"
          },
          {
            name: "operation",
            type: "string",
            description: "操作类型，如 find、aggregate、insert、update、delete"
          },
          {
            name: "query",
            type: "object",
            description: "操作参数（如 filter、document、pipeline 等）"
          }
        ]
      };
    }
  }
  for (const tool of state.customTools) {
    if (!tool.name || !tool.statement || !tool.source) continue;
    tools[tool.name] = {
      kind: tool.kind,
      source: tool.source,
      description: tool.description || '',
      statement: tool.statement,
      parameters: (tool.parameters || []).map(p => ({
        name: p.name,
        type: p.type || 'string',
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