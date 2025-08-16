// 全局状态管理：支持多数据源类型（mysql/sqlite/mongodb），源配置、内置工具、自定义工具、YAML 文本
window.yamlConfigState = {
  type: 'mysql', // 'mysql' | 'sqlite' | 'mongodb'
  source: {
    host: '',
    port: '',
    database: '',
    user: '',
    password: '',
    queryTimeout: ''
  },
  sqliteSource: {
    database: ''
  },
  mongoSource: {
    host: '',
    port: '',
    database: '',
    user: '',
    password: '',
    options: ''
  },
  builtin: {
    execute_sql: true, // mysql 固定
    list_tables: true, // mysql 可选
    sqlite_execute: true, // sqlite 可选
    mongo_execute: true // mongodb 可选
  },
  customTools: [
    // { name: '', description: '', statement: '', parameters: [ { name: '', type: '', description: '', default: '' } ] }
  ],
  yamlText: ''
};

// 工具名唯一校验
window.isToolNameUnique = function(name) {
  if (window.yamlConfigState.type === 'mysql') {
    if (name === 'execute_sql' || name === 'list_tables') return false;
  }
  if (window.yamlConfigState.type === 'sqlite') {
    if (name === 'sqlite_execute') return false;
  }
  if (window.yamlConfigState.type === 'mongodb') {
    if (name === 'mongo_execute') return false;
  }
  return !window.yamlConfigState.customTools.some(t => t.name === name);
};

// 重置所有状态
window.resetYamlConfigState = function() {
  window.yamlConfigState = {
    type: 'mysql',
    source: {
      host: '',
      port: '',
      database: '',
      user: '',
      password: '',
      queryTimeout: ''
    },
    sqliteSource: {
      database: ''
    },
    mongoSource: {
      host: '',
      port: '',
      database: '',
      user: '',
      password: '',
      options: ''
    },
    builtin: {
      execute_sql: true,
      list_tables: true,
      sqlite_execute: true,
      mongo_execute: true
    },
    customTools: [],
    yamlText: ''
  };
};