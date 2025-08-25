// YAML 导入：将 YAML 对象回填到 state 并刷新 UI，支持自定义 source 名称与 kind，并自动回填表单
function importYamlToState(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('YAML 结构无效');
  // 解析 sources
  window.yamlConfigState.sources = [];
  window.yamlConfigState.builtinTools = [];
  for (const [name, src] of Object.entries(obj.sources || {})) {
    const type = src.kind;
    let config = { ...src };
    delete config.kind;
    // 统一 MongoDB 源配置为 { uri }，向后兼容旧字段
    if (type === 'mongodb') {
      const hasUri = typeof src.uri === 'string' && src.uri.trim() !== '';
      if (hasUri) {
        config = { uri: src.uri };
      } else {
        // 兼容旧式 host/port/user/password/database/options，按旧生成逻辑拼接
        let uri = 'mongodb://';
        if (src.user && src.password) {
          uri += encodeURIComponent(src.user) + ':' + encodeURIComponent(src.password) + '@';
        }
        uri += src.host || 'localhost';
        if (src.port) uri += ':' + src.port;
        if (src.options && String(src.options).trim()) {
          const opts = String(src.options);
          uri += '/' + (src.database || '') + (opts.startsWith('?') ? opts : '?' + opts);
        } else if (src.database) {
          uri += '/' + src.database;
        }
        config = { uri };
      }
    }
    window.yamlConfigState.sources.push({ name, type, config });
    // 自动添加内置工具（仅识别常见 kind，其他类型可扩展）
    if (type === 'mysql') {
      window.yamlConfigState.builtinTools.push({ name: 'execute_sql_' + name, type, source: name, enabled: false });
      window.yamlConfigState.builtinTools.push({ name: 'list_tables_' + name, type, source: name, enabled: false });
    }
    if (type === 'sqlite') {
      window.yamlConfigState.builtinTools.push({ name: 'sqlite_execute_' + name, type, source: name, enabled: false });
    }
    if (type === 'mongodb') {
      window.yamlConfigState.builtinTools.push({ name: 'mongo_execute_' + name, type, source: name, enabled: false });
    }
    if (type === 'postgres') {
      window.yamlConfigState.builtinTools.push({ name: 'pg_execute_' + name, type, source: name, enabled: false });
      window.yamlConfigState.builtinTools.push({ name: 'pg_list_tables_' + name, type, source: name, enabled: false });
    }
  }
  // 根据 YAML tools 恢复内置工具启用状态（将存在于 YAML 的内置工具名标记为启用）
  {
    const yamlToolNames = new Set(Object.keys(obj.tools || {}));
    window.yamlConfigState.builtinTools.forEach(bt => {
      if (yamlToolNames.has(bt.name)) bt.enabled = true;
    });
  }
  // 解析 tools
  window.yamlConfigState.customTools = [];
  for (const [name, tool] of Object.entries(obj.tools || {})) {
    // 跳过已知内置工具
    if (/^(execute_sql_|list_tables_|sqlite_execute_|mongo_execute_|pg_execute_|pg_list_tables_)/.test(name)) continue;
    window.yamlConfigState.customTools.push({
      name,
      kind: tool.kind,
      source: tool.source,
      description: tool.description || '',
      statement: tool.statement || '',
      parameters: Array.isArray(tool.parameters) ? tool.parameters.map(p => ({
        name: p.name || '', type: p.type || 'string', description: p.description || '', default: p.default || ''
      })) : []
    });
  }
  // 触发 UI 刷新
  if (typeof window.renderSources === 'function') window.renderSources();
  if (typeof window.renderBuiltinTools === 'function') window.renderBuiltinTools();
  if (typeof window.renderCustomTools === 'function') window.renderCustomTools();

  // 自动展开所有数据源表单（聚焦每个数据源的第一个字段）
  setTimeout(() => {
    document.querySelectorAll('.source-fields input[data-field]').forEach(input => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }, 100);
}