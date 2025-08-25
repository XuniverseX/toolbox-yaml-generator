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
        <div class="flex row" style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">
          <b>${src.name}</b>
          <span class="badge">${src.type}</span>
          <button type="button" data-idx="${idx}" class="remove-source button-ghost">
            <svg class="icon" aria-hidden="true"><use href="#ico-delete"/></svg> 删除
          </button>
        </div>
        <div class="source-fields" style="margin-top:.6rem;">${renderSourceFields(src, idx)}</div>
      `;
      sourcesList.appendChild(block);
    });
    sourcesList.querySelectorAll('.remove-source').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = +e.target.dataset.idx;
        const removedName = window.yamlConfigState.sources[idx]?.name;
        window.yamlConfigState.sources.splice(idx, 1);
        window.yamlConfigState.builtinTools = window.yamlConfigState.builtinTools.filter(t => t.source !== removedName);
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
    // 使用原生 dialog 作为模态对话框
    const dlg = document.createElement('dialog');
    dlg.innerHTML = `
      <form id="add-source-form" method="dialog" style="min-width:300px">
        <h3 class="m-0 mb-3">添加数据源</h3>
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
        <div class="mt-2">
          <label>数据源名称 <input type="text" name="name" required placeholder="如 mydb1"></label>
        </div>
        <div class="mt-3" style="text-align:right;">
          <button type="submit">添加</button>
          <button type="button" id="cancel-add-source" class="button-ghost">取消</button>
        </div>
      </form>
    `;
    document.body.appendChild(dlg);
    dlg.showModal();

    const form = dlg.querySelector('#add-source-form');
    const cancelBtn = dlg.querySelector('#cancel-add-source');

    cancelBtn.addEventListener('click', () => {
      dlg.close();
      document.body.removeChild(dlg);
    });

    dlg.addEventListener('cancel', (e) => {
      e.preventDefault();
      dlg.close();
      document.body.removeChild(dlg);
    });

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const type = dlg.querySelector('select[name="type"]').value;
      const name = dlg.querySelector('input[name="name"]').value.trim();
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
      dlg.close();
      document.body.removeChild(dlg);
      renderSources();
      renderBuiltinTools();
      renderCustomTools();
    });
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
          <label class="switch">
            <input type="checkbox" data-idx="${idx}" ${tool.enabled ? 'checked' : ''}>
            <span class="track"><span class="thumb"></span></span>
            <span class="switch-label">
              <b>${tool.name}</b>
              <span class="badge-muted" style="margin-left:.35rem;">${desc}</span>
              <span class="badge" style="margin-left:.35rem;">${tool.type}</span>
              <span class="badge-info" style="margin-left:.35rem;">source: ${tool.source}</span>
            </span>
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

  // 暴露渲染函数到 window，供导入模块调用
  window.renderSources = renderSources;
  window.renderBuiltinTools = renderBuiltinTools;
  window.renderCustomTools = renderCustomTools;
});