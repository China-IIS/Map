<script>
function getLang() {
  const params = new URLSearchParams(window.location.search);
  return params.get('lang') || 'zh-CN'; // 預設語言
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

loadTranslations(getLang());
</script>