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
    } else if (type === 'redis') {
      // 规范化 Redis 源配置到生成器使用的 config 结构
      const address = Array.isArray(src.address)
        ? src.address
        : (typeof src.address === 'string' ? src.address : '');
      config = {
        address,
        username: typeof src.username === 'string' ? src.username : '',
        password: typeof src.password === 'string' ? src.password : '',
        database: (typeof src.database === 'number' || typeof src.database === 'string') ? src.database : '',
        clusterEnabled: !!src.clusterEnabled,
        useGCPIAM: !!src.useGCPIAM
      };
    } else if (type === 'http') {
      // 将对象 headers/queryParams 转为 KV 文本，timeout 默认 30s
      const objToKVText = (o) => {
        if (!o || typeof o !== 'object') return '';
        return Object.entries(o).map(([k, v]) => `${k}: ${v}`).join('\n');
      };
      config = {
        baseUrl: typeof src.baseUrl === 'string' ? src.baseUrl : '',
        timeout: typeof src.timeout === 'string' && src.timeout.trim() ? src.timeout : '30s',
        headers: objToKVText(src.headers),
        queryParams: objToKVText(src.queryParams),
        disableSslVerification: !!src.disableSslVerification
      };
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
    if (type === 'redis') {
      window.yamlConfigState.builtinTools.push({ name: 'redis_ping_' + name, type, source: name, enabled: false });
      window.yamlConfigState.builtinTools.push({ name: 'redis_get_' + name, type, source: name, enabled: false });
      window.yamlConfigState.builtinTools.push({ name: 'redis_set_' + name, type, source: name, enabled: false });
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
    if (/^(execute_sql_|list_tables_|sqlite_execute_|mongo_execute_|pg_execute_|pg_list_tables_|redis_ping_|redis_get_|redis_set_)/.test(name)) continue;

    const kind = tool.kind || '';
    const base = {
      name,
      kind,
      source: tool.source,
      description: tool.description || ''
    };

    function mapParams(arr) {
      if (!Array.isArray(arr)) return [];
      return arr.map(p => ({
        name: (p && p.name) ? p.name : '',
        type: 'string',
        description: (p && p.description) ? p.description : '',
        default: (p && p.default) ? p.default : ''
      }));
    }

    // 兼容历史：跳过已废弃的 mongodb-execute 工具
    if (kind === 'mongodb-execute') {
      continue;
    }

    // 针对 MongoDB 官方工具，回填结构化字段；其他类型沿用原有 statement/parameters
    if (typeof kind === 'string' && kind.startsWith('mongodb-')) {
      const t = { ...base };
      // 通用
      if (tool.database) t.database = tool.database;
      if (tool.collection) t.collection = tool.collection;

      if (kind === 'mongodb-find' || kind === 'mongodb-find-one') {
        t.filterPayload = tool.filterPayload || '';
        t.filterParams = mapParams(tool.filterParams);
        if (tool.projectPayload) t.projectPayload = tool.projectPayload;
        if (tool.projectParams) t.projectParams = mapParams(tool.projectParams);
        if (tool.sortPayload) t.sortPayload = tool.sortPayload;
        if (tool.sortParams) t.sortParams = mapParams(tool.sortParams);
        if (kind === 'mongodb-find' && typeof tool.limit === 'number') t.limit = tool.limit;
      } else if (kind === 'mongodb-aggregate') {
        t.pipelinePayload = tool.pipelinePayload || '';
        t.pipelineParams = mapParams(tool.pipelineParams);
        if (tool.canonical === true) t.canonical = true;
        if (tool.readOnly === true) t.readOnly = true;
      } else if (kind === 'mongodb-insert-one' || kind === 'mongodb-insert-many') {
        t.canonical = !!tool.canonical;
      } else if (kind === 'mongodb-update-one' || kind === 'mongodb-update-many') {
        t.filterPayload = tool.filterPayload || '';
        t.filterParams = mapParams(tool.filterParams);
        t.updatePayload = tool.updatePayload || '';
        t.updateParams = mapParams(tool.updateParams);
        t.canonical = !!tool.canonical;
        if (tool.upsert === true) t.upsert = true;
      } else if (kind === 'mongodb-delete-one' || kind === 'mongodb-delete-many') {
        t.filterPayload = tool.filterPayload || '';
        t.filterParams = mapParams(tool.filterParams);
      }

      window.yamlConfigState.customTools.push(t);
      continue;
    }

    // Redis 自定义工具：commands -> commandsText，多行拼接
    if (kind === 'redis') {
      const commands = Array.isArray(tool.commands) ? tool.commands : [];
      const commandsText = commands.map(arr => Array.isArray(arr) ? arr.join(' ') : '').filter(Boolean).join('\n');
      window.yamlConfigState.customTools.push({
        ...base,
        commandsText,
        parameters: mapParams(tool.parameters)
      });
      continue;
    }

    // HTTP 自定义工具：method/path/headersText/requestBody + 四组参数
    if (kind === 'http') {
      const objToKVText = (o) => {
        if (!o || typeof o !== 'object') return '';
        return Object.entries(o).map(([k, v]) => `${k}: ${v}`).join('\n');
      };
      window.yamlConfigState.customTools.push({
        ...base,
        method: tool.method || 'GET',
        path: tool.path || '',
        headersText: objToKVText(tool.headers),
        requestBody: tool.requestBody || '',
        pathParams: mapParams(tool.pathParams),
        queryParams: mapParams(tool.queryParams),
        bodyParams: mapParams(tool.bodyParams),
        headerParams: mapParams(tool.headerParams),
      });
      continue;
    }

    // 其他（如 MySQL/SQLite 自定义）保持原逻辑
    window.yamlConfigState.customTools.push({
      ...base,
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