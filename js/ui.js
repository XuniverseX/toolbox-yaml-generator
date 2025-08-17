// 多数据源 UI 管理与工具编辑（添加数据源弹窗：单选下拉+名称输入）
document.addEventListener('DOMContentLoaded', function () {
  // 数据源管理
  const sourcesList = document.getElementById('sources-list');
  const addSourceBtn = document.getElementById('add-source-btn');
  function renderSources() {
    sourcesList.innerHTML = '';
    window.yamlConfigState.sources.forEach((src, idx) => {
      const block = document.createElement('div');
      block.className = 'source-block';
      block.innerHTML = `
        <b>${src.name}</b> [${src.type}]
        <button type="button" data-idx="${idx}" class="remove-source">删除</button>
        <div class="source-fields">${renderSourceFields(src, idx)}</div>
      `;
      sourcesList.appendChild(block);
    });
    sourcesList.querySelectorAll('.remove-source').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = +e.target.dataset.idx;
        window.yamlConfigState.sources.splice(idx, 1);
        window.yamlConfigState.builtinTools = window.yamlConfigState.builtinTools.filter(t => t.source !== (window.yamlConfigState.sources[idx]?.name));
        renderSources();
        renderBuiltinTools();
        renderCustomTools();
      });
    });
    sourcesList.querySelectorAll('.source-fields input').forEach(input => {
      input.addEventListener('input', e => {
        const idx = +e.target.dataset.idx;
        const field = e.target.dataset.field;
        window.yamlConfigState.sources[idx].config[field] = e.target.value;
      });
    });
    sourcesList.querySelectorAll('.source-name-input').forEach(input => {
      input.addEventListener('input', e => {
        const idx = +e.target.dataset.idx;
        window.yamlConfigState.sources[idx].name = e.target.value;
        window.yamlConfigState.builtinTools.forEach(t => {
          if (t.source === input.dataset.oldname) t.source = e.target.value;
        });
        renderBuiltinTools();
        renderCustomTools();
      });
    });
  }
  function renderSourceFields(src, idx) {
    if (src.type === 'mysql') {
      return `
        <label>名称 <input type="text" class="source-name-input" data-idx="${idx}" data-oldname="${src.name}" value="${src.name}"></label>
        <label>host <input type="text" data-idx="${idx}" data-field="host" value="${src.config.host||''}"></label>
        <label>port <input type="number" data-idx="${idx}" data-field="port" value="${src.config.port||''}"></label>
        <label>database <input type="text" data-idx="${idx}" data-field="database" value="${src.config.database||''}"></label>
        <label>user <input type="text" data-idx="${idx}" data-field="user" value="${src.config.user||''}"></label>
        <label>password <input type="password" data-idx="${idx}" data-field="password" value="${src.config.password||''}"></label>
        <label>queryTimeout <input type="text" data-idx="${idx}" data-field="queryTimeout" value="${src.config.queryTimeout||''}"></label>
      `;
    }
    if (src.type === 'sqlite') {
      return `
        <label>名称 <input type="text" class="source-name-input" data-idx="${idx}" data-oldname="${src.name}" value="${src.name}"></label>
        <label>database <input type="text" data-idx="${idx}" data-field="database" value="${src.config.database||''}"></label>
      `;
    }
    if (src.type === 'mongodb') {
      return `
        <label>名称 <input type="text" class="source-name-input" data-idx="${idx}" data-oldname="${src.name}" value="${src.name}"></label>
        <label>host <input type="text" data-idx="${idx}" data-field="host" value="${src.config.host||''}"></label>
        <label>port <input type="number" data-idx="${idx}" data-field="port" value="${src.config.port||''}"></label>
        <label>database <input type="text" data-idx="${idx}" data-field="database" value="${src.config.database||''}"></label>
        <label>user <input type="text" data-idx="${idx}" data-field="user" value="${src.config.user||''}"></label>
        <label>password <input type="password" data-idx="${idx}" data-field="password" value="${src.config.password||''}"></label>
        <label>options <input type="text" data-idx="${idx}" data-field="options" value="${src.config.options||''}"></label>
      `;
    }
    return '';
  }
  addSourceBtn.addEventListener('click', () => {
    // 弹窗：单选下拉选择类型+名称输入
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.left = '0'; modal.style.top = '0'; modal.style.right = '0'; modal.style.bottom = '0';
    modal.style.background = 'rgba(0,0,0,0.25)';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
      <div style="background:#fff;padding:2em 2em 1em 2em;max-width:340px;margin:8% auto;border-radius:8px;box-shadow:0 2px 12px #0002;">
        <h3>添加数据源</h3>
        <form id="add-source-form">
          <div>
            <label>类型
              <select name="type" required>
                <option value="">请选择</option>
                <option value="mysql">MySQL</option>
                <option value="sqlite">SQLite</option>
                <option value="mongodb">MongoDB</option>
              </select>
            </label>
          </div>
          <div style="margin-top:1em;">
            <label>数据源名称 <input type="text" name="name" required placeholder="如 mydb1"></label>
          </div>
          <div style="margin-top:1.5em;text-align:right;">
            <button type="submit">添加</button>
            <button type="button" id="cancel-add-source">取消</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#cancel-add-source').onclick = () => document.body.removeChild(modal);
    modal.querySelector('#add-source-form').onsubmit = function(e) {
      e.preventDefault();
      const type = modal.querySelector('select[name="type"]').value;
      const name = modal.querySelector('input[name="name"]').value.trim();
      if (!name || window.yamlConfigState.sources.some(s => s.name === name)) {
        alert('名称不能为空且不能重复');
        return;
      }
      if (!type) {
        alert('请选择类型');
        return;
      }
      let config = {};
      if (type === 'mysql') config = {host:'',port:'',database:'',user:'',password:'',queryTimeout:''};
      if (type === 'sqlite') config = {database:''};
      if (type === 'mongodb') config = {host:'',port:'',database:'',user:'',password:'',options:''};
      window.yamlConfigState.sources.push({ name, type, config });
      // 自动添加内置工具
      if (type === 'mysql') {
        window.yamlConfigState.builtinTools.push({ name: 'execute_sql_'+name, type, source: name, enabled: true });
        window.yamlConfigState.builtinTools.push({ name: 'list_tables_'+name, type, source: name, enabled: true });
      }
      if (type === 'sqlite') {
        window.yamlConfigState.builtinTools.push({ name: 'sqlite_execute_'+name, type, source: name, enabled: true });
      }
      if (type === 'mongodb') {
        window.yamlConfigState.builtinTools.push({ name: 'mongo_execute_'+name, type, source: name, enabled: true });
      }
      document.body.removeChild(modal);
      renderSources();
      renderBuiltinTools();
      renderCustomTools();
    };
  });
  renderSources();

  // 内置工具区
  const builtinToolsList = document.getElementById('builtin-tools-list');
  function renderBuiltinTools() {
    builtinToolsList.innerHTML = '';
    window.yamlConfigState.builtinTools.forEach((tool, idx) => {
      const src = window.yamlConfigState.sources.find(s => s.name === tool.source);
      if (!src) return;
      let desc = '';
      if (tool.type === 'mysql' && tool.name.startsWith('execute_sql')) desc = 'MySQL 通用 SQL 执行';
      if (tool.type === 'mysql' && tool.name.startsWith('list_tables')) desc = 'MySQL 表结构/元数据查询';
      if (tool.type === 'sqlite') desc = 'SQLite 通用 SQL 执行';
      if (tool.type === 'mongodb') desc = 'MongoDB 通用操作';
      builtinToolsList.innerHTML += `
        <div>
          <label>
            <input type="checkbox" data-idx="${idx}" ${tool.enabled ? 'checked' : ''}>
            <b>${tool.name}</b> [${tool.type}] (source: ${tool.source}) - ${desc}
          </label>
        </div>
      `;
    });
    builtinToolsList.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', e => {
        const idx = +e.target.dataset.idx;
        window.yamlConfigState.builtinTools[idx].enabled = e.target.checked;
      });
    });
  }
  renderBuiltinTools();

  // 自定义工具区
  const customToolsList = document.getElementById('custom-tools-list');
  function renderCustomTools() {
    customToolsList.innerHTML = '';
    window.yamlConfigState.customTools.forEach((tool, idx) => {
      const sourceOptions = window.yamlConfigState.sources.map(s =>
        `<option value="${s.name}" ${tool.source===s.name?'selected':''}>${s.name} [${s.type}]</option>`
      ).join('');
      customToolsList.innerHTML += `
        <div class="custom-tool-block">
          <label>工具名 <input type="text" value="${tool.name}" data-idx="${idx}" data-field="name" required></label>
          <label>类型
            <select data-idx="${idx}" data-field="kind">
              <option value="mysql-sql" ${tool.kind==='mysql-sql'?'selected':''}>mysql-sql</option>
              <option value="sqlite-sql" ${tool.kind==='sqlite-sql'?'selected':''}>sqlite-sql</option>
              <option value="mongodb-execute" ${tool.kind==='mongodb-execute'?'selected':''}>mongodb-execute</option>
            </select>
          </label>
          <label>绑定数据源
            <select data-idx="${idx}" data-field="source">${sourceOptions}</select>
          </label>
          <label>描述 <input type="text" value="${tool.description||''}" data-idx="${idx}" data-field="description"></label>
          <label>SQL/操作 <input type="text" value="${tool.statement||''}" data-idx="${idx}" data-field="statement" required></label>
          <label>参数（可选，逗号分隔）<input type="text" value="${(tool.parameters||[]).map(p=>p.name).join(',')}" data-idx="${idx}" data-field="parameters"></label>
          <button type="button" data-idx="${idx}" class="remove-tool">删除</button>
        </div>
      `;
    });
    // 事件绑定
    customToolsList.querySelectorAll('input,select').forEach(input => {
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
    const firstSource = window.yamlConfigState.sources[0]?.name || '';
    window.yamlConfigState.customTools.push({
      name: '',
      kind: 'mysql-sql',
      source: firstSource,
      description: '',
      statement: '',
      parameters: []
    });
    renderCustomTools();
  });
  renderCustomTools();
});