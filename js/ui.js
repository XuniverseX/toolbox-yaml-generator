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
    // 绑定数据源字段变更（支持 input 与 textarea，含 checkbox）
    sourcesList.querySelectorAll('.source-fields input, .source-fields textarea').forEach(input => {
      const handler = e => {
        const idx = +e.target.dataset.idx;
        const field = e.target.dataset.field;
        const isCheckbox = e.target.type === 'checkbox';
        window.yamlConfigState.sources[idx].config[field] = isCheckbox ? !!e.target.checked : e.target.value;
      };
      input.addEventListener('input', handler);
      input.addEventListener('change', handler);
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
        <label>uri <input type="text" data-idx="${idx}" data-field="uri" placeholder="如 mongodb://user:pass@host:27017/db?retryWrites=true" value="${src.config.uri||''}"></label>
      `;
    }
    if (src.type === 'redis') {
      return `
        <label>名称 <input type="text" class="source-name-input" data-idx="${idx}" data-oldname="${src.name}" value="${src.name}"></label>
        <label>address(每行一条 host:port)
          <textarea data-idx="${idx}" data-field="address" rows="3" placeholder="127.0.0.1:6379&#10;10.0.0.1:6379">${Array.isArray(src.config.address) ? src.config.address.join('\n') : (src.config.address||'')}</textarea>
        </label>
        <label>username <input type="text" data-idx="${idx}" data-field="username" value="${src.config.username||''}"></label>
        <label>password <input type="password" data-idx="${idx}" data-field="password" value="${src.config.password||''}"></label>
        <label>database <input type="number" data-idx="${idx}" data-field="database" value="${src.config.database||''}"></label>
        <label><input type="checkbox" data-idx="${idx}" data-field="clusterEnabled" ${src.config.clusterEnabled ? 'checked':''}> clusterEnabled</label>
        <label><input type="checkbox" data-idx="${idx}" data-field="useGCPIAM" ${src.config.useGCPIAM ? 'checked':''}> useGCPIAM</label>
      `;
    }
    if (src.type === 'http') {
      return `
        <label>名称 <input type="text" class="source-name-input" data-idx="${idx}" data-oldname="${src.name}" value="${src.name}"></label>
        <label>baseUrl <input type="text" data-idx="${idx}" data-field="baseUrl" placeholder="如 https://api.example.com" value="${src.config.baseUrl||''}"></label>
        <label>timeout <input type="text" data-idx="${idx}" data-field="timeout" placeholder="默认 30s" value="${src.config.timeout||'30s'}"></label>
        <label>headers(每行 key=value 或 key: value)
          <textarea data-idx="${idx}" data-field="headers" rows="3" placeholder="Accept: application/json&#10;Authorization: Bearer ...">${src.config.headers||''}</textarea>
        </label>
        <label>queryParams(每行 key=value 或 key: value)
          <textarea data-idx="${idx}" data-field="queryParams" rows="3" placeholder="lang=zh-CN">${src.config.queryParams||''}</textarea>
        </label>
        <label><input type="checkbox" data-idx="${idx}" data-field="disableSslVerification" ${src.config.disableSslVerification ? 'checked':''}> disableSslVerification</label>
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
              <option value="redis">Redis</option>
              <option value="http">HTTP</option>
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
      if (type === 'mongodb') config = {uri:''};
      if (type === 'redis') config = {address:'', username:'', password:'', database:'', clusterEnabled:false, useGCPIAM:false};
      if (type === 'http') config = {baseUrl:'', timeout:'30s', headers:'', queryParams:'', disableSslVerification:false};
      window.yamlConfigState.sources.push({ name, type, config });
      // 自动添加内置工具
      if (type === 'mysql') {
        window.yamlConfigState.builtinTools.push({ name: 'execute_sql_'+name, type, source: name, enabled: true });
        window.yamlConfigState.builtinTools.push({ name: 'list_tables_'+name, type, source: name, enabled: true });
      }
      if (type === 'sqlite') {
        window.yamlConfigState.builtinTools.push({ name: 'sqlite_execute_'+name, type, source: name, enabled: true });
      }
      if (type === 'redis') {
        window.yamlConfigState.builtinTools.push({ name: 'redis_ping_'+name, type, source: name, enabled: true });
        window.yamlConfigState.builtinTools.push({ name: 'redis_get_'+name, type, source: name, enabled: true });
        window.yamlConfigState.builtinTools.push({ name: 'redis_set_'+name, type, source: name, enabled: true });
      }
      if (type === 'mongodb') {
        // MongoDB 不再自动生成内置工具，请使用“Mongo 工具向导”创建具体工具
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
      if (tool.type === 'redis' && tool.name.startsWith('redis_ping_')) desc = 'Redis 内置：PING';
      if (tool.type === 'redis' && tool.name.startsWith('redis_get_')) desc = 'Redis 内置：GET key';
      if (tool.type === 'redis' && tool.name.startsWith('redis_set_')) desc = 'Redis 内置：SET key value';
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
    console.log('Rendering custom tools:', window.yamlConfigState.customTools);
    customToolsList.innerHTML = '';
    window.yamlConfigState.customTools.forEach((tool, idx) => {
      const sourceOptions = window.yamlConfigState.sources.map(s =>
        `<option value="${s.name}" ${tool.source===s.name?'selected':''}>${s.name} [${s.type}]</option>`
      ).join('');

      const params = Array.isArray(tool.parameters) ? tool.parameters : [];
      const paramsRows = params.map((p, pidx) => `
        <div class="param-row" data-idx="${idx}" data-pidx="${pidx}" style="display:flex;gap:.5rem;align-items:flex-end;flex-wrap:wrap;margin:.35rem 0;">
          <label>name
            <input type="text" class="param-input" data-idx="${idx}" data-pidx="${pidx}" data-pfield="name" value="${p.name || ''}">
          </label>
          <label>description
            <input type="text" class="param-input" data-idx="${idx}" data-pidx="${pidx}" data-pfield="description" value="${p.description || ''}">
          </label>
          <label>default
            <input type="text" class="param-input" data-idx="${idx}" data-pidx="${pidx}" data-pfield="default" value="${p.default || ''}">
          </label>
          <button type="button" class="param-del button-ghost" data-idx="${idx}" data-pidx="${pidx}">
            删除
          </button>
        </div>
      `).join('');

      // Mongo 工具标识与各组参数行构造
      const isMongo = String(tool.kind || '').startsWith('mongodb-');

      function buildParamRows(group, list) {
        const arr = Array.isArray(list) ? list : [];
        return arr.map((p, pidx) => `
          <div class="param-row" data-idx="${idx}" data-pidx="${pidx}" data-group="${group}" style="display:flex;gap:.5rem;align-items:flex-end;flex-wrap:wrap;margin:.35rem 0;">
            <label>name
              <input type="text" class="mongo-param-input" data-idx="${idx}" data-pidx="${pidx}" data-group="${group}" data-pfield="name" value="${p.name || ''}">
            </label>
            <label>description
              <input type="text" class="mongo-param-input" data-idx="${idx}" data-pidx="${pidx}" data-group="${group}" data-pfield="description" value="${p.description || ''}">
            </label>
            <label>default
              <input type="text" class="mongo-param-input" data-idx="${idx}" data-pidx="${pidx}" data-group="${group}" data-pfield="default" value="${p.default || ''}">
            </label>
            <button type="button" class="mongo-param-del button-ghost" data-idx="${idx}" data-pidx="${pidx}" data-group="${group}">
              删除
            </button>
          </div>
        `).join('');
      }

      const filterParamRows = buildParamRows('filterParams', tool.filterParams);
      const projectParamRows = buildParamRows('projectParams', tool.projectParams);
      const sortParamRows = buildParamRows('sortParams', tool.sortParams);
      const pipelineParamRows = buildParamRows('pipelineParams', tool.pipelineParams);
      const updateParamRows = buildParamRows('updateParams', tool.updateParams);

      let mongoFields = '';

      if (isMongo) {
        const commonTop = `
          <div class="mongo-common" data-idx="${idx}" style="display:flex;gap:.5rem;flex-wrap:wrap;margin:.5rem 0;">
            <label>database <input type="text" data-idx="${idx}" data-field="database" value="${tool.database||''}"></label>
            <label>collection <input type="text" data-idx="${idx}" data-field="collection" value="${tool.collection||''}"></label>
          </div>
        `;
        if (tool.kind === 'mongodb-find' || tool.kind === 'mongodb-find-one') {
          mongoFields = `
            ${commonTop}
            <div class="mongo-section">
              <label>filterPayload
                <textarea data-idx="${idx}" data-field="filterPayload" rows="3" style="width:100%">${tool.filterPayload||''}</textarea>
              </label>
              <div class="params-section" data-idx="${idx}" style="margin:.5rem 0;">
                <label style="display:block;margin-bottom:.35rem;">filterParams</label>
                <div class="params-rows">${filterParamRows}</div>
                <button type="button" class="mongo-param-add" data-idx="${idx}" data-group="filterParams">新增参数</button>
              </div>
              <label>projectPayload
                <textarea data-idx="${idx}" data-field="projectPayload" rows="3" style="width:100%">${tool.projectPayload||''}</textarea>
              </label>
              <div class="params-section" data-idx="${idx}" style="margin:.5rem 0;">
                <label style="display:block;margin-bottom:.35rem;">projectParams</label>
                <div class="params-rows">${projectParamRows}</div>
                <button type="button" class="mongo-param-add" data-idx="${idx}" data-group="projectParams">新增参数</button>
              </div>
              <label>sortPayload
                <textarea data-idx="${idx}" data-field="sortPayload" rows="2" style="width:100%">${tool.sortPayload||''}</textarea>
              </label>
              <div class="params-section" data-idx="${idx}" style="margin:.5rem 0;">
                <label style="display:block;margin-bottom:.35rem;">sortParams</label>
                <div class="params-rows">${sortParamRows}</div>
                <button type="button" class="mongo-param-add" data-idx="${idx}" data-group="sortParams">新增参数</button>
              </div>
              ${tool.kind === 'mongodb-find' ? `
                <label>limit <input type="number" data-idx="${idx}" data-field="limit" value="${tool.limit||''}"></label>
              ` : ``}
            </div>
          `;
        } else if (tool.kind === 'mongodb-aggregate') {
          mongoFields = `
            ${commonTop}
            <div class="mongo-section">
              <label>pipelinePayload
                <textarea data-idx="${idx}" data-field="pipelinePayload" rows="4" style="width:100%">${tool.pipelinePayload||''}</textarea>
              </label>
              <div class="params-section" data-idx="${idx}" style="margin:.5rem 0;">
                <label style="display:block;margin-bottom:.35rem;">pipelineParams</label>
                <div class="params-rows">${pipelineParamRows}</div>
                <button type="button" class="mongo-param-add" data-idx="${idx}" data-group="pipelineParams">新增参数</button>
              </div>
              <label><input type="checkbox" data-idx="${idx}" data-field="canonical" ${tool.canonical ? 'checked':''}> canonical</label>
              <label><input type="checkbox" data-idx="${idx}" data-field="readOnly" ${tool.readOnly ? 'checked':''}> readOnly</label>
            </div>
          `;
        } else if (tool.kind === 'mongodb-insert-one' || tool.kind === 'mongodb-insert-many') {
          mongoFields = `
            ${commonTop}
            <div class="mongo-section">
              <p class="badge-muted">提示：文档数据由运行时输入参数 data 传入，不在 YAML 中固定。</p>
              <label><input type="checkbox" data-idx="${idx}" data-field="canonical" ${tool.canonical ? 'checked':''}> canonical</label>
            </div>
          `;
        } else if (tool.kind === 'mongodb-update-one' || tool.kind === 'mongodb-update-many') {
          mongoFields = `
            ${commonTop}
            <div class="mongo-section">
              <label>filterPayload
                <textarea data-idx="${idx}" data-field="filterPayload" rows="3" style="width:100%">${tool.filterPayload||''}</textarea>
              </label>
              <div class="params-section" data-idx="${idx}" style="margin:.5rem 0;">
                <label style="display:block;margin-bottom:.35rem;">filterParams</label>
                <div class="params-rows">${filterParamRows}</div>
                <button type="button" class="mongo-param-add" data-idx="${idx}" data-group="filterParams">新增参数</button>
              </div>
              <label>updatePayload
                <textarea data-idx="${idx}" data-field="updatePayload" rows="3" style="width:100%">${tool.updatePayload||''}</textarea>
              </label>
              <div class="params-section" data-idx="${idx}" style="margin:.5rem 0;">
                <label style="display:block;margin-bottom:.35rem;">updateParams</label>
                <div class="params-rows">${updateParamRows}</div>
                <button type="button" class="mongo-param-add" data-idx="${idx}" data-group="updateParams">新增参数</button>
              </div>
              <label><input type="checkbox" data-idx="${idx}" data-field="canonical" ${tool.canonical ? 'checked':''}> canonical</label>
              <label><input type="checkbox" data-idx="${idx}" data-field="upsert" ${tool.upsert ? 'checked':''}> upsert</label>
            </div>
          `;
        } else if (tool.kind === 'mongodb-delete-one' || tool.kind === 'mongodb-delete-many') {
          mongoFields = `
            ${commonTop}
            <div class="mongo-section">
              <label>filterPayload
                <textarea data-idx="${idx}" data-field="filterPayload" rows="3" style="width:100%">${tool.filterPayload||''}</textarea>
              </label>
              <div class="params-section" data-idx="${idx}" style="margin:.5rem 0;">
                <label style="display:block;margin-bottom:.35rem;">filterParams</label>
                <div class="params-rows">${filterParamRows}</div>
                <button type="button" class="mongo-param-add" data-idx="${idx}" data-group="filterParams">新增参数</button>
              </div>
            </div>
          `;
        }
      }

      customToolsList.innerHTML += `
        <div class="custom-tool-block">
          <label>工具名 <input type="text" value="${tool.name}" data-idx="${idx}" data-field="name" required></label>
          <label>类型
            <select data-idx="${idx}" data-field="kind" onchange="handleKindChange(event)">
              <option value="mysql-sql" ${tool.kind==='mysql-sql'?'selected':''}>mysql-sql</option>
              <option value="sqlite-sql" ${tool.kind==='sqlite-sql'?'selected':''}>sqlite-sql</option>
              <option value="redis" ${tool.kind==='redis'?'selected':''}>redis</option>
              <option value="http" ${tool.kind==='http'?'selected':''}>http</option>
              <option value="mongodb-find" ${tool.kind==='mongodb-find'?'selected':''}>mongodb-find</option>
              <option value="mongodb-find-one" ${tool.kind==='mongodb-find-one'?'selected':''}>mongodb-find-one</option>
              <option value="mongodb-aggregate" ${tool.kind==='mongodb-aggregate'?'selected':''}>mongodb-aggregate</option>
              <option value="mongodb-insert-one" ${tool.kind==='mongodb-insert-one'?'selected':''}>mongodb-insert-one</option>
              <option value="mongodb-insert-many" ${tool.kind==='mongodb-insert-many'?'selected':''}>mongodb-insert-many</option>
              <option value="mongodb-update-one" ${tool.kind==='mongodb-update-one'?'selected':''}>mongodb-update-one</option>
              <option value="mongodb-update-many" ${tool.kind==='mongodb-update-many'?'selected':''}>mongodb-update-many</option>
              <option value="mongodb-delete-one" ${tool.kind==='mongodb-delete-one'?'selected':''}>mongodb-delete-one</option>
              <option value="mongodb-delete-many" ${tool.kind==='mongodb-delete-many'?'selected':''}>mongodb-delete-many</option>
            </select>
          </label>
          <label>绑定数据源
            <select data-idx="${idx}" data-field="source">${sourceOptions}</select>
          </label>
          <label>描述 <input type="text" value="${tool.description||''}" data-idx="${idx}" data-field="description"></label>
          <label ${(String(tool.kind||'').startsWith('mongodb-') || tool.kind==='redis' || tool.kind==='http') ? 'style="display:none"' : ''}>SQL/操作 <input type="text" value="${tool.statement||''}" data-idx="${idx}" data-field="statement" ${(String(tool.kind||'').startsWith('mongodb-') || tool.kind==='redis' || tool.kind==='http') ? '' : 'required'}></label>

          <div class="params-section" data-idx="${idx}" style="margin:.5rem 0; ${(String(tool.kind||'').startsWith('mongodb-') || tool.kind==='http') ? 'display:none;' : ''}">
            <label style="display:block;margin-bottom:.35rem;">参数列表（类型固定为 string）</label>
            <div class="params-rows">
              ${paramsRows || ''}
            </div>
            <button type="button" class="param-add" data-idx="${idx}">
              新增参数
            </button>
          </div>

          <div class="mongo-fields" ${String(tool.kind||'').startsWith('mongodb-') ? '' : 'style="display:none"'}>
            ${mongoFields}
          </div>
          <div class="redis-fields" ${tool.kind==='redis' ? '' : 'style="display:none"'}>
            <div class="redis-section">
              <label>commands（每行一条命令，空格分隔参数；可使用占位符 $name）
                <textarea data-idx="${idx}" data-field="commandsText" rows="4" style="width:100%" placeholder="SET $key $value&#10;GET $key">${tool.commandsText||''}</textarea>
              </label>
              <p class="badge-muted">提示：请在上方“参数列表”中声明运行时参数，类型默认 string；数组参数将在 Redis 执行时自动展开。</p>
            </div>
          </div>
          <div class="http-fields" ${tool.kind==='http' ? '' : 'style="display:none"'}>
            <div class="http-section">
              <label>method
                <select data-idx="${idx}" data-field="method">
                  <option value="GET" ${tool.method==='GET'?'selected':''}>GET</option>
                  <option value="POST" ${tool.method==='POST'?'selected':''}>POST</option>
                  <option value="PUT" ${tool.method==='PUT'?'selected':''}>PUT</option>
                  <option value="PATCH" ${tool.method==='PATCH'?'selected':''}>PATCH</option>
                  <option value="DELETE" ${tool.method==='DELETE'?'selected':''}>DELETE</option>
                </select>
              </label>
              <label>path
                <input type="text" data-idx="${idx}" data-field="path" placeholder="/users/{{userId}}" value="${tool.path||''}">
              </label>
              <label>headers（每行 key: value 或 key=value）
                <textarea data-idx="${idx}" data-field="headersText" rows="3" style="width:100%" placeholder="Authorization: Bearer ...&#10;Accept: application/json">${tool.headersText||''}</textarea>
              </label>
              <label>requestBody（模板，支持 JSON 与 {{name}} 占位符）
                <textarea data-idx="${idx}" data-field="requestBody" rows="4" style="width:100%">${tool.requestBody||''}</textarea>
              </label>
              <div class="params-section" data-idx="${idx}" style="margin:.5rem 0;">
                <label style="display:block;margin-bottom:.35rem;">pathParams</label>
                <div class="params-rows">
                  ${buildParamRows('pathParams', tool.pathParams)}
                </div>
                <button type="button" class="mongo-param-add" data-idx="${idx}" data-group="pathParams">新增参数</button>
              </div>
              <div class="params-section" data-idx="${idx}" style="margin:.5rem 0;">
                <label style="display:block;margin-bottom:.35rem;">queryParams</label>
                <div class="params-rows">
                  ${buildParamRows('queryParams', tool.queryParams)}
                </div>
                <button type="button" class="mongo-param-add" data-idx="${idx}" data-group="queryParams">新增参数</button>
              </div>
              <div class="params-section" data-idx="${idx}" style="margin:.5rem 0;">
                <label style="display:block;margin-bottom:.35rem;">bodyParams</label>
                <div class="params-rows">
                  ${buildParamRows('bodyParams', tool.bodyParams)}
                </div>
                <button type="button" class="mongo-param-add" data-idx="${idx}" data-group="bodyParams">新增参数</button>
              </div>
              <div class="params-section" data-idx="${idx}" style="margin:.5rem 0;">
                <label style="display:block;margin-bottom:.35rem;">headerParams（值类型仅支持 string）</label>
                <div class="params-rows">
                  ${buildParamRows('headerParams', tool.headerParams)}
                </div>
                <button type="button" class="mongo-param-add" data-idx="${idx}" data-group="headerParams">新增参数</button>
              </div>
            </div>
          </div>

          <button type="button" data-idx="${idx}" class="remove-tool">删除</button>
        </div>
      `;
    });

    // 基础字段事件绑定（跳过参数行，参数行没有 data-field）
    customToolsList.querySelectorAll('[data-field]').forEach(input => {
      const handler = e => {
        const idx = +e.target.dataset.idx;
        const field = e.target.dataset.field;
        const isCheckbox = e.target.type === 'checkbox';
        window.yamlConfigState.customTools[idx][field] = isCheckbox ? e.target.checked : e.target.value;
      };
      input.addEventListener('input', handler);
      input.addEventListener('change', handler);
    });

    // 参数输入变更
    customToolsList.querySelectorAll('.param-input').forEach(input => {
      input.addEventListener('input', e => {
        const idx = +e.target.dataset.idx;
        const pidx = +e.target.dataset.pidx;
        const pfield = e.target.dataset.pfield;
        const tool = window.yamlConfigState.customTools[idx];
        if (!Array.isArray(tool.parameters)) tool.parameters = [];
        const current = tool.parameters[pidx] || { name: '', type: 'string', description: '', default: '' };
        current[pfield] = e.target.value;
        current.type = 'string';
        tool.parameters[pidx] = current;
      });
    });

    // 新增参数
    customToolsList.querySelectorAll('.param-add').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = +e.target.dataset.idx;
        const tool = window.yamlConfigState.customTools[idx];
        if (!Array.isArray(tool.parameters)) tool.parameters = [];
        tool.parameters.push({ name: '', type: 'string', description: '', default: '' });
        renderCustomTools();
      });
    });

    // Mongo 组参数：新增
    customToolsList.querySelectorAll('.mongo-param-add').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = +e.target.dataset.idx;
        const group = e.target.dataset.group;
        const tool = window.yamlConfigState.customTools[idx];
        if (!Array.isArray(tool[group])) tool[group] = [];
        tool[group].push({ name: '', type: 'string', description: '', default: '' });
        renderCustomTools();
      });
    });

    // 删除参数
    customToolsList.querySelectorAll('.param-del').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = +e.target.dataset.idx;
        const pidx = +e.target.dataset.pidx;
        const tool = window.yamlConfigState.customTools[idx];
        if (Array.isArray(tool.parameters)) {
          tool.parameters.splice(pidx, 1);
          renderCustomTools();
        }
      });
    });

    // Mongo 组参数：删除
    customToolsList.querySelectorAll('.mongo-param-del').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = +e.target.dataset.idx;
        const pidx = +e.target.dataset.pidx;
        const group = e.target.dataset.group;
        const tool = window.yamlConfigState.customTools[idx];
        if (Array.isArray(tool[group])) {
          tool[group].splice(pidx, 1);
          renderCustomTools();
        }
      });
    });

    // Mongo 组参数：输入变更
    customToolsList.querySelectorAll('.mongo-param-input').forEach(input => {
      input.addEventListener('input', e => {
        const idx = +e.target.dataset.idx;
        const pidx = +e.target.dataset.pidx;
        const pfield = e.target.dataset.pfield;
        const group = e.target.dataset.group;
        const tool = window.yamlConfigState.customTools[idx];
        if (!Array.isArray(tool[group])) tool[group] = [];
        const current = tool[group][pidx] || { name: '', type: 'string', description: '', default: '' };
        current[pfield] = e.target.value;
        current.type = 'string';
        tool[group][pidx] = current;
      });
    });

    // 删除自定义工具
    customToolsList.querySelectorAll('.remove-tool').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = +e.target.dataset.idx;
        window.yamlConfigState.customTools.splice(idx, 1);
        renderCustomTools();
      });
    });
    
    function handleKindChange(event) {
      const idx = +event.target.dataset.idx;
      const newKind = event.target.value;
      window.yamlConfigState.customTools[idx].kind = newKind;
      renderCustomTools();
    }
    window.handleKindChange = handleKindChange;
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