// UI 渲染与事件绑定，支持多数据源类型
document.addEventListener('DOMContentLoaded', function () {
  // 数据源类型切换
  const typeSelect = document.getElementById('db-type-select');
  const mysqlSection = document.getElementById('source-config-mysql');
  const sqliteSection = document.getElementById('source-config-sqlite');
  const builtinMysql = document.getElementById('builtin-mysql');
  const builtinSqlite = document.getElementById('builtin-sqlite');
  typeSelect.value = window.yamlConfigState.type;
  function switchType(type) {
    window.yamlConfigState.type = type;
    if (type === 'mysql') {
      mysqlSection.style.display = '';
      sqliteSection.style.display = 'none';
      builtinMysql.style.display = '';
      builtinSqlite.style.display = 'none';
    } else {
      mysqlSection.style.display = 'none';
      sqliteSection.style.display = '';
      builtinMysql.style.display = 'none';
      builtinSqlite.style.display = '';
    }
    renderCustomTools();
  }
  typeSelect.addEventListener('change', e => {
    switchType(e.target.value);
  });
  switchType(window.yamlConfigState.type);

  // MySQL 源配置表单
  const mysqlForm = document.getElementById('mysql-source-form');
  for (const key of ['host', 'port', 'database', 'user', 'password', 'queryTimeout']) {
    mysqlForm.elements[key].addEventListener('input', e => {
      window.yamlConfigState.source[key] = e.target.value;
    });
  }
  // SQLite 源配置表单
  const sqliteForm = document.getElementById('sqlite-source-form');
  sqliteForm.elements['database'].addEventListener('input', e => {
    window.yamlConfigState.sqliteSource.database = e.target.value;
  });

  // 内置工具
  document.getElementById('tool-list-tables').addEventListener('change', e => {
    window.yamlConfigState.builtin.list_tables = e.target.checked;
  });

  // 自定义工具
  const customToolsList = document.getElementById('custom-tools-list');
  window.renderCustomTools = renderCustomTools;
  function renderCustomTools() {
    customToolsList.innerHTML = '';
    window.yamlConfigState.customTools.forEach((tool, idx) => {
      const block = document.createElement('div');
      block.className = 'custom-tool-block';
      block.innerHTML = `
        <label>工具名 <input type="text" value="${tool.name}" data-idx="${idx}" data-field="name" required></label>
        <label>描述 <input type="text" value="${tool.description}" data-idx="${idx}" data-field="description"></label>
        <label>SQL <input type="text" value="${tool.statement}" data-idx="${idx}" data-field="statement" required></label>
        <label>参数（可选，逗号分隔）<input type="text" value="${(tool.parameters||[]).map(p=>p.name).join(',')}" data-idx="${idx}" data-field="parameters"></label>
        <button type="button" data-idx="${idx}" class="remove-tool">删除</button>
      `;
      customToolsList.appendChild(block);
    });
    // 事件绑定
    customToolsList.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', e => {
        const idx = +e.target.dataset.idx;
        const field = e.target.dataset.field;
        if (field === 'parameters') {
          window.yamlConfigState.customTools[idx].parameters = e.target.value.split(',').map(s => s.trim()).filter(Boolean).map(n => ({
            name: n, type: 'string', description: '', default: ''
          }));
        } else {
          window.yamlConfigState.customTools[idx][field] = e.target.value;
        }
      });
    });
    customToolsList.querySelectorAll('.remove-tool').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = +e.target.dataset.idx;
        window.yamlConfigState.customTools.splice(idx, 1);
        renderCustomTools();
      });
    });
  }
  document.getElementById('add-custom-tool').addEventListener('click', () => {
    window.yamlConfigState.customTools.push({
      name: '',
      description: '',
      statement: '',
      parameters: []
    });
    renderCustomTools();
  });
  renderCustomTools();
});