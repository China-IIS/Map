  //Update 6/29/2025
  //首先我把你的翻译逻辑封装了 不然后续修改你能麻烦死
  //然后我给你该了lang逻辑 因为你首次访问URL中没有lang参数，你的代码逻辑代码会先从localStorage获取&设置为 zh-CN，然后立刻执行window.location.replace()页面跳转。但这样语言文件不会直接加载而是会重新载入lang参数的页面。所以这样你就会加载两次你GitHub加载速度本来就慢加载两边没开梯子的他不炸了吗？
  //然后就是你当通过data-i18n属性获取的键在JSON翻译文件中找不到对应的值时(if (data[key]) el.textContent = data[key];)，这个元素的 textContent就不会改变。所以我给你改了
  // DOM动态之类的也改了 懒得说了
  //By Sakurazuki
document.addEventListener('DOMContentLoaded', function () {
  const selector = document.getElementById('langSelector');

  const params = new URLSearchParams(window.location.search);
  let currentLang = params.get('lang');

  if (!currentLang) {
    const savedLang = localStorage.getItem('preferredLang') || 'zh-CN';
    const url = new URL(window.location.href);
    url.searchParams.set('lang', savedLang);
    window.location.replace(url.href);
    return;
  }

  if (selector) {
    if (currentLang && selector.querySelector(`option[value="${currentLang}"]`)) {
      selector.value = currentLang;
    } else {
      selector.value = "zh-CN";
    }

    selector.addEventListener('change', function () {
      const selected = selector.value;
      localStorage.setItem('preferredLang', selected);

      const url = new URL(window.location.href);
      url.searchParams.set('lang', selected);
      window.location.href = url.href;
    });
  }

  const applyTranslations = (langData) => {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (langData[key]) {
        el.textContent = langData[key];
      } else {
      }
    });
  };

  fetch(`lang/${currentLang}.json`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`Failed to load translation file: ${res.statusText}`);
      }
      return res.json();
    })
    .then(data => {
      applyTranslations(data);
    })
    .catch(err => console.warn("翻譯文件載入失敗", err));
});