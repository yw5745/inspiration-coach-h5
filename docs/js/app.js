// ============================================================
// 全局应用状态 & 工具函数
// ============================================================

const App = {
  // 跨页面传参（替代小程序的 getApp().globalData）
  params: {},

  setParam(key, value) {
    this.params[key] = value;
  },

  getParam(key) {
    const val = this.params[key];
    this.params[key] = null; // 取后即焚
    return val;
  },

  // Toast 提示（替代 wx.showToast）
  showToast(message, icon = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + icon;
    toast.textContent = message;
    document.body.appendChild(toast);

    // 触发动画
    requestAnimationFrame(() => {
      toast.classList.add('toast-show');
    });

    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  },

  // Modal 弹窗（替代 wx.showModal）
  showModal(title, content, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card">
        <div class="modal-title">${title}</div>
        <div class="modal-content">${content}</div>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel">取消</button>
          <button class="modal-btn modal-btn-confirm">确定</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    overlay.querySelector('.modal-btn-cancel').onclick = close;
    overlay.querySelector('.modal-btn-confirm').onclick = () => {
      close();
      if (onConfirm) onConfirm();
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };
  },

  // 页面跳转（替代 wx.navigateTo / wx.switchTab）
  navigateTo(url) {
    window.location.href = url;
  }
};
