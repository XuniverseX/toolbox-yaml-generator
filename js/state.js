// 多数据源模式全局状态管理
window.yamlConfigState = {
  sources: [
    // { name: 'mysql1', type: 'mysql', config: { host, port, ... } }
    // { name: 'sqlite1', type: 'sqlite', config: { database } }
    // { name: 'mongo1', type: 'mongodb', config: { host, port, ... } }
  ],
  builtinTools: [
    // { name: 'execute_sql', type: 'mysql', source: 'mysql1', enabled: true }
    // { name: 'sqlite_execute', type: 'sqlite', source: 'sqlite1', enabled: true }
    // { name: 'mongo_execute', type: 'mongodb', source: 'mongo1', enabled: true }
  ],
  customTools: [
    // { name, kind, source, description, statement, parameters: [...] }
  ],
  yamlText: ''
};

// 工具名唯一校验（全局 tools 名称不可重复）
window.isToolNameUnique = function(name) {
  if (window.yamlConfigState.builtinTools.some(t => t.name === name)) return false;
  return !window.yamlConfigState.customTools.some(t => t.name === name);
};

// 重置所有状态
window.resetYamlConfigState = function() {
  window.yamlConfigState = {
    sources: [],
    builtinTools: [],
    customTools: [],
    yamlText: ''
  };
};