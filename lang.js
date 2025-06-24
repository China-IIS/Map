document.addEventListener('DOMContentLoaded', function () {
  const selector = document.getElementById('langSelector');

  // 取得當前語言參數
  const params = new URLSearchParams(window.location.search);
  let currentLang = params.get('lang');

  if (!currentLang) {
    // 沒有語言參數，就從 localStorage 嘗試取得
    const savedLang = localStorage.getItem('preferredLang') || 'zh-CN';

    // 如果 URL 中沒有 lang，就跳轉加上它
    const url = new URL(window.location.href);
    url.searchParams.set('lang', savedLang);
    window.location.replace(url.href);
    return; // 等跳轉完成後再執行語言替換
  }

  // 設定選單顯示目前語言
  if (selector) {
    if (currentLang && selector.querySelector(`option[value="${currentLang}"]`)) {
      selector.value = currentLang;
    } else {
      selector.value = "zh-CN"; // 預設語言
    }

    // 當用戶切換語言時
    selector.addEventListener('change', function () {
      const selected = selector.value;
      localStorage.setItem('preferredLang', selected);

      // 更新網址並跳轉
      const url = new URL(window.location.href);
      url.searchParams.set('lang', selected);
      window.location.href = url.href;
    });
  }

  // 載入翻譯檔案
  fetch(`/lang/${currentLang}.json`)
    .then(res => res.json())
    .then(data => {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (data[key]) el.textContent = data[key];
      });
    })
    .catch(err => console.warn("翻譯文件載入失敗", err));
});