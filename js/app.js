// 主入口：事件绑定与主流程
document.addEventListener('DOMContentLoaded', function () {
  const msgArea = document.getElementById('msg-area');
  const yamlOutput = document.getElementById('yaml-output');
  const btnGen = document.getElementById('generate-yaml');
  const btnCopy = document.getElementById('copy-yaml');
  const btnDownload = document.getElementById('download-yaml');
  const btnImport = document.getElementById('import-yaml');
  const fileInput = document.getElementById('yaml-file-input');

  // 生成 YAML
  btnGen.addEventListener('click', function () {
    try {
      const config = buildYamlConfig();
      const yaml = window.jsyaml.dump(config, { lineWidth: 120 });
      window.yamlConfigState.yamlText = yaml;
      yamlOutput.textContent = yaml;
      btnCopy.disabled = false;
      btnDownload.disabled = false;
      msgArea.textContent = 'YAML 生成成功';
      if (window.UIUtils && typeof UIUtils.showToast === 'function') {
        UIUtils.showToast('YAML 生成成功', { type: 'success', title: '成功' });
      }
    } catch (e) {
      var _emsg = '生成 YAML 失败: ' + e.message;
      msgArea.textContent = _emsg;
      if (window.UIUtils && typeof UIUtils.showToast === 'function') {
        UIUtils.showToast(_emsg, { type: 'error', title: '失败' });
      }
    }
  });

  // 复制 YAML
  btnCopy.addEventListener('click', function () {
    if (!window.yamlConfigState.yamlText) return;
    navigator.clipboard.writeText(window.yamlConfigState.yamlText)
      .then(() => {
        msgArea.textContent = '已复制到剪贴板';
        if (window.UIUtils && typeof UIUtils.showToast === 'function') {
          UIUtils.showToast('已复制到剪贴板', { type: 'success', title: '已复制' });
        }
      })
      .catch(() => {
        msgArea.textContent = '复制失败';
        if (window.UIUtils && typeof UIUtils.showToast === 'function') {
          UIUtils.showToast('复制失败', { type: 'error', title: '失败' });
        }
      });
  });

  // 下载 YAML
  btnDownload.addEventListener('click', function () {
    if (!window.yamlConfigState.yamlText) return;
    const blob = new Blob([window.yamlConfigState.yamlText], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mysql-config.yaml';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    msgArea.textContent = '已下载 YAML 文件';
    if (window.UIUtils && typeof UIUtils.showToast === 'function') {
      UIUtils.showToast('已下载 YAML 文件', { type: 'success', title: '已下载' });
    }
  });

  // 导入 YAML
  btnImport.addEventListener('click', function () {
    fileInput.value = '';
    fileInput.click();
  });
  fileInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
      try {
        const obj = window.jsyaml.load(evt.target.result);
        importYamlToState(obj);
        msgArea.textContent = 'YAML 导入成功，表单已回填';
        if (window.UIUtils && typeof UIUtils.showToast === 'function') {
          UIUtils.showToast('YAML 导入成功，表单已回填', { type: 'success', title: '导入成功' });
        }
      } catch (e) {
        var _perr = 'YAML 解析失败: ' + e.message;
        msgArea.textContent = _perr;
        if (window.UIUtils && typeof UIUtils.showToast === 'function') {
          UIUtils.showToast(_perr, { type: 'error', title: '导入失败' });
        }
      }
    };
    reader.readAsText(file);
  });
});