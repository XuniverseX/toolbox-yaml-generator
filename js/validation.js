/**
 * 多数据源/多工具配置校验
 * 覆盖 MySQL / SQLite / MongoDB / Redis / HTTP 源与工具的基础校验
 * 返回空字符串表示通过；否则返回换行分隔的错误消息
 */
function validateYamlConfigState(state) {
  const errors = [];

  if (!state || typeof state !== 'object') {
    return '内部错误：缺少全局状态 window.yamlConfigState';
  }

  // 1) 校验 Sources
  const sourceNames = new Set();
  const sourceByName = new Map();

  for (const src of state.sources || []) {
    if (!src || !src.name || !String(src.name).trim()) {
      errors.push('数据源名称不能为空');
      continue;
    }
    if (sourceNames.has(src.name)) {
      errors.push(`数据源名称重复: ${src.name}`);
    }
    sourceNames.add(src.name);
    sourceByName.set(src.name, src);

    const t = src.type;
    const cfg = src.config || {};

    // MySQL
    if (t === 'mysql') {
      if (!cfg.host || !cfg.port || !cfg.database || !cfg.user || !cfg.password) {
        errors.push(`MySQL 源(${src.name})字段不完整：host/port/database/user/password 均为必填`);
      } else {
        const p = Number(cfg.port);
        if (!Number.isInteger(p) || p < 1 || p > 65535) {
          errors.push(`MySQL 源(${src.name})端口号必须为 1~65535 的整数`);
        }
      }
    }

    // SQLite
    else if (t === 'sqlite') {
      if (!cfg.database) {
        errors.push(`SQLite 源(${src.name})的 database 为必填`);
      }
    }

    // MongoDB
    else if (t === 'mongodb') {
      if (!cfg.uri || !String(cfg.uri).trim()) {
        errors.push(`MongoDB 源(${src.name})的 uri 为必填`);
      } else {
        const u = String(cfg.uri).trim();
        if (!/^mongodb(\+srv)?:\/\//i.test(u)) {
          errors.push(`MongoDB 源(${src.name})的 uri 看起来不合法（应以 mongodb:// 或 mongodb+srv:// 开头）`);
        }
      }
    }

    // Redis
    else if (t === 'redis') {
      let addrs = [];
      if (Array.isArray(cfg.address)) addrs = cfg.address;
      else if (typeof cfg.address === 'string') {
        addrs = cfg.address.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      }
      if (!addrs.length) {
        errors.push(`Redis 源(${src.name})的 address 至少需要 1 条 host:port`);
      } else {
        for (const a of addrs) {
          if (!/^[^:\s]+:\d{1,5}$/.test(a)) {
            errors.push(`Redis 源(${src.name})的地址不合法: ${a}（期望形如 host:port）`);
          } else {
            const port = Number(a.split(':')[1]);
            if (port < 1 || port > 65535) errors.push(`Redis 源(${src.name})端口越界: ${a}`);
          }
        }
      }
      if (cfg.database !== '' && cfg.database !== undefined && cfg.database !== null) {
        const dbn = Number(cfg.database);
        if (!Number.isInteger(dbn) || dbn < 0) {
          errors.push(`Redis 源(${src.name})的 database 应为非负整数`);
        }
      }
    }

    // HTTP
    else if (t === 'http') {
      const baseUrl = String(cfg.baseUrl || '').trim();
      if (!baseUrl) {
        errors.push(`HTTP 源(${src.name})的 baseUrl 为必填`);
      } else if (!/^https?:\/\//i.test(baseUrl)) {
        errors.push(`HTTP 源(${src.name})的 baseUrl 需以 http:// 或 https:// 开头`);
      } else {
        try {
          // eslint-disable-next-line no-new
          new URL(baseUrl);
        } catch {
          errors.push(`HTTP 源(${src.name})的 baseUrl 不是有效 URL: ${baseUrl}`);
        }
      }
      const timeout = String(cfg.timeout || '').trim();
      if (timeout && !/^\d+(ms|s|m|h)$/.test(timeout)) {
        errors.push(`HTTP 源(${src.name})的 timeout 格式应为 数字+单位(ms|s|m|h)，例如 30s`);
      }
    }

    // 其他源类型：不做强校验
  }

  // 2) 工具名唯一性 + 内置工具基本合法性
  const toolNames = new Set();

  const enabledBuiltin = (state.builtinTools || []).filter(t => t && t.enabled);
  for (const bt of enabledBuiltin) {
    if (!bt.name) { errors.push('内置工具存在未命名条目'); continue; }
    if (toolNames.has(bt.name)) errors.push(`工具名重复: ${bt.name}`);
    toolNames.add(bt.name);
    if (!bt.source || !sourceByName.has(bt.source)) {
      errors.push(`内置工具(${bt.name})绑定的 source 不存在: ${bt.source || '(空)'}`);
    }
  }

  // 3) 自定义工具基础校验
  const ensureKindToSourceType = (kind) => {
    if (kind === 'redis') return 'redis';
    if (kind === 'http') return 'http';
    if (kind === 'mysql-sql' || kind === 'mysql-execute-sql') return 'mysql';
    if (kind === 'sqlite-sql') return 'sqlite';
    if (typeof kind === 'string' && kind.startsWith('mongodb-')) return 'mongodb';
    return null; // 不强制匹配
  };

  const collectParams = (...groups) => {
    const arr = [];
    for (const g of groups) if (Array.isArray(g)) arr.push(...g);
    return arr;
  };

  for (const ct of (state.customTools || [])) {
    if (!ct || !ct.name) { errors.push('自定义工具名不能为空'); continue; }
    if (toolNames.has(ct.name)) errors.push(`工具名重复: ${ct.name}`);
    toolNames.add(ct.name);

    // 关联源存在
    if (!ct.source || !sourceByName.has(ct.source)) {
      errors.push(`自定义工具(${ct.name})绑定的 source 不存在: ${ct.source || '(空)'}`);
      continue;
    }

    const kind = String(ct.kind || '').trim();
    const boundSource = sourceByName.get(ct.source);
    const expectedSourceType = ensureKindToSourceType(kind);
    if (expectedSourceType && boundSource && boundSource.type !== expectedSourceType) {
      errors.push(`自定义工具(${ct.name})类型(${kind})与数据源(${ct.source})类型(${boundSource.type})不匹配，应为 ${expectedSourceType}`);
    }

    // 参数名非空且唯一（HTTP 的四组参数也需与通用参数不重复）
    const params = collectParams(ct.parameters, ct.pathParams, ct.queryParams, ct.bodyParams, ct.headerParams);
    const pnames = new Set();
    for (const p of params) {
      const pn = p && String(p.name || '').trim();
      if (!pn) { errors.push(`自定义工具(${ct.name})存在未命名的参数`); continue; }
      if (pnames.has(pn)) errors.push(`自定义工具(${ct.name})参数名重复: ${pn}`);
      pnames.add(pn);
    }

    // 各类型特有必填与一致性校验
    if (kind === 'mysql-sql' || kind === 'sqlite-sql') {
      if (!ct.statement || !String(ct.statement).trim()) {
        errors.push(`自定义工具(${ct.name})的 SQL/语句不能为空`);
      }
    } else if (kind === 'redis') {
      if (!ct.commandsText || !String(ct.commandsText).trim()) {
        errors.push(`自定义工具(${ct.name})为 redis 类型，commands 不能为空`);
      } else {
        const lines = String(ct.commandsText).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        if (!lines.length) errors.push(`自定义工具(${ct.name})为 redis 类型，commands 不能为空`);
      }
    } else if (kind === 'http') {
      const method = String(ct.method || '').trim();
      const path = String(ct.path || '').trim();
      if (!method) errors.push(`自定义工具(${ct.name})为 http 类型，method 必填`);
      if (!path) errors.push(`自定义工具(${ct.name})为 http 类型，path 必填`);
      // path 模板参数一致性
      const tplVars = new Set();
      const re = /{{\s*([\w-]+)\s*}}/g;
      let m;
      while ((m = re.exec(path)) !== null) {
        tplVars.add(m[1]);
      }
      const declared = new Set((ct.pathParams || []).map(p => String(p.name || '').trim()).filter(Boolean));
      for (const v of tplVars) {
        if (!declared.has(v)) errors.push(`自定义工具(${ct.name})的 path 含参数 "{{${v}}}" 但未在 pathParams 声明`);
      }
    } else if (kind.startsWith('mongodb-')) {
      // Mongo 官方工具不要求 statement；此处不做深入校验
    } else {
      // 其他通用执行类：默认要求 statement
      if (!ct.statement || !String(ct.statement).trim()) {
        errors.push(`自定义工具(${ct.name})的 SQL/操作不能为空`);
      }
    }
  }

  return errors.join('\n');
}

/**
 * 兼容旧接口：保持 validateConfig 存在并委托新实现
 * 返回空串表示通过，否则为错误描述
 */
function validateConfig() {
  if (typeof window !== 'undefined' && window.yamlConfigState) {
    return validateYamlConfigState(window.yamlConfigState);
  }
  return '';
}

// 暴露到 window 以便其它模块直接调用
if (typeof window !== 'undefined') {
  window.validateYamlConfigState = validateYamlConfigState;
  window.validateConfig = validateConfig;
}