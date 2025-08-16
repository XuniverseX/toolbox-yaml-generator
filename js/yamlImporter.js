// YAML 导入：将 YAML 对象回填到 state 并刷新 UI
function importYamlToState(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('YAML 结构无效');
  // 源
  const src = obj.sources && obj.sources['mysql-source'];
  if (!src) throw new Error('未找到 mysql-source');
  window.yamlConfigState.source = {
    host: src.host || '',
    port: src.port || '',
    database: src.database || '',
    user: src.user || '',
    password: src.password || '',
    queryTimeout: src.queryTimeout || ''
  };
  // 内置工具
  const tools = obj.tools || {};
  window.yamlConfigState.builtin = {
    execute_sql: !!tools['execute_sql'],
    list_tables: !!tools['list_tables']
  };
  // 自定义工具
  window.yamlConfigState.customTools = [];
  for (const [name, tool] of Object.entries(tools)) {
    if (name === 'execute_sql' || name === 'list_tables') continue;
    window.yamlConfigState.customTools.push({
      name,
      description: tool.description || '',
      statement: tool.statement || '',
      parameters: Array.isArray(tool.parameters) ? tool.parameters.map(p => ({
        name: p.name || '', type: p.type || 'string', description: p.description || '', default: p.default || ''
      })) : []
    });
  }
  // 触发 UI 刷新
  document.querySelectorAll('#mysql-source-form input').forEach(input => {
    input.value = window.yamlConfigState.source[input.name] || '';
  });
  document.getElementById('tool-list-tables').checked = window.yamlConfigState.builtin.list_tables;
  // 重新渲染自定义工具
  if (typeof window.renderCustomTools === 'function') window.renderCustomTools();
  else {
    // 兼容首次导入
    const evt = new Event('DOMContentLoaded');
    document.dispatchEvent(evt);
  }
}