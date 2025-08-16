// 表单校验与用户提示，支持多数据源类型
function validateConfig() {
  const state = window.yamlConfigState;
  if (state.type === 'mysql') {
    const s = state.source;
    if (!s.host || !s.port || !s.database || !s.user || !s.password) {
      return '所有 MySQL 源字段均为必填';
    }
    if (!/^\d+$/.test(s.port) || +s.port < 1 || +s.port > 65535) {
      return '端口号必须为 1~65535 的整数';
    }
    // 工具名唯一
    const names = new Set(['execute_sql', 'list_tables']);
    for (const t of state.customTools) {
      if (!t.name) return '自定义工具名不能为空';
      if (names.has(t.name)) return '工具名重复: ' + t.name;
      names.add(t.name);
      if (!t.statement) return `自定义工具 ${t.name} 的 SQL 不能为空`;
    }
    return '';
  } else if (state.type === 'sqlite') {
    const s = state.sqliteSource;
    if (!s.database) return 'SQLite 数据库文件路径为必填';
    // 工具名唯一
    const names = new Set();
    for (const t of state.customTools) {
      if (!t.name) return '自定义工具名不能为空';
      if (names.has(t.name)) return '工具名重复: ' + t.name;
      names.add(t.name);
      if (!t.statement) return `自定义工具 ${t.name} 的 SQL 不能为空`;
    }
    return '';
  }
  return '';
}