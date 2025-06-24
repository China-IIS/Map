<script>
  const selector = document.getElementById('langSelector');

  function getLang() {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get('lang');

    if (lang) {
      localStorage.setItem('preferredLang', lang);
      if (selector) selector.value = lang;
      return lang;
    }

    const savedLang = localStorage.getItem('preferredLang') || 'zh-CN';
    
    // 如果 URL 沒有 lang，重新導向加上語言參數
    if (!params.get('lang')) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('lang', savedLang);
      window.location.href = newUrl.href;
    }

    return savedLang;
  }

  async function loadTranslations(lang) {
    try {
      const res = await fetch(`/lang/${lang}.json`);
      const translations = await res.json();
      applyTranslations(translations);
    } catch (err) {
      console.error("翻譯載入失敗：", err);
    }
  }

  function applyTranslations(data) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (data[key]) el.textContent = data[key];
    });
  }

  if (selector) {
    selector.addEventListener('change', function () {
      const selectedLang = this.value;
      localStorage.setItem('preferredLang', selectedLang);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('lang', selectedLang);
      window.location.href = newUrl.href; // 重新載入頁面
    });
  }

  loadTranslations(getLang());
</script>