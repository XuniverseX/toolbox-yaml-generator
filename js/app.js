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
    } catch (e) {
      msgArea.textContent = '生成 YAML 失败: ' + e.message;
    }
  });

  // 复制 YAML
  btnCopy.addEventListener('click', function () {
    if (!window.yamlConfigState.yamlText) return;
    navigator.clipboard.writeText(window.yamlConfigState.yamlText)
      .then(() => { msgArea.textContent = '已复制到剪贴板'; })
      .catch(() => { msgArea.textContent = '复制失败'; });
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
      } catch (e) {
        msgArea.textContent = 'YAML 解析失败: ' + e.message;
      }
    };
    reader.readAsText(file);
  });
});