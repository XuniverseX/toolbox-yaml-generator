/**
 * ui-utils.js
 * Lightweight UI helpers: Toast notifications (success/info/error).
 * No external deps. Exposes window.UIUtils.showToast(message, options)
 *
 * Usage:
 *   UIUtils.showToast('YAML 生成成功', { type: 'success', title: '成功', timeout: 2400 });
 */

(function () {
  const ROOT_ID = 'toast-root';

  function ensureToastRoot() {
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      root.className = 'toast-container';
      document.body.appendChild(root);
    }
    return root;
  }

  function removeToast(el) {
    if (!el) return;
    try {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-4px)';
      setTimeout(() => el.parentElement && el.parentElement.removeChild(el), 160);
    } catch (_) {
      // noop
    }
  }

  /**
   * Show a toast notification.
   * @param {string} message - The message body.
   * @param {Object} [options]
   * @param {'success'|'info'|'error'} [options.type='info'] - Visual style.
   * @param {string} [options.title] - Optional title.
   * @param {number} [options.timeout=2600] - Auto-close ms. Set 0 or <0 to disable auto-close.
   */
  function showToast(message, options) {
    const opts = Object.assign({ type: 'info', title: '', timeout: 2600 }, options || {});
    const root = ensureToastRoot();

    const toast = document.createElement('div');
    toast.className = 'toast ' + (opts.type === 'success' ? 'success' : opts.type === 'error' ? 'error' : 'info');

    const content = document.createElement('div');
    content.className = 'content';

    if (opts.title) {
      const t = document.createElement('p');
      t.className = 'title';
      t.textContent = opts.title;
      content.appendChild(t);
    }

    const m = document.createElement('p');
    m.className = 'msg';
    m.textContent = message || '';
    content.appendChild(m);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'button button-ghost';
    closeBtn.setAttribute('aria-label', '关闭通知');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => removeToast(toast));

    toast.appendChild(content);
    toast.appendChild(closeBtn);
    root.appendChild(toast);

    // Accessibility: announce via ARIA
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', opts.type === 'error' ? 'assertive' : 'polite');

    // Auto close
    if (opts.timeout && opts.timeout > 0) {
      setTimeout(() => removeToast(toast), opts.timeout);
    }

    return {
      close: () => removeToast(toast),
      el: toast
    };
  }

  /**
   * Remove all toasts immediately.
   */
  function dismissAll() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    Array.from(root.children).forEach(child => {
      try { root.removeChild(child); } catch (_) {}
    });
  }

  // Expose API
  window.UIUtils = {
    showToast,
    dismissAll
  };
})();