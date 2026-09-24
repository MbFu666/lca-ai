// Shared lca-proxy caller (review #1/#15): one implementation, correct auth gate + error mapping.
// Requires assets/supabase-init.js (window.sb) and assets/esc.js.
// Usage: await window.lcaApiCall(body, { label, lang }) -> parsed JSON; throws Error on failure.
(function () {
  var API_URL = 'https://pbisngkepszwzzjivxus.supabase.co/functions/v1/lca-proxy';

  function msg(lang, key) {
    var m = {
      auth_required: {
        ru: 'Для AI-функций войдите в аккаунт (кнопка «Войти»).',
        en: 'Please sign in to use AI features.',
        zh: 'AI 功能需要登录账号。',
      },
      session_expired: {
        ru: 'Сессия истекла или отсутствует доступ: войдите снова.',
        en: 'Session expired or access missing: please sign in again.',
        zh: '会话已过期或无访问权限：请重新登录。',
      },
      balance: {
        ru: 'Возможно, закончился баланс на DeepSeek.',
        en: 'DeepSeek balance may be exhausted.',
        zh: 'DeepSeek 余额可能已用尽。',
      },
      timeout: {
        ru: 'Попробуйте более короткое описание.',
        en: 'Try a shorter description.',
        zh: '请尝试更短的描述。',
      },
      model: { ru: 'Модель не найдена.', en: 'Model not found.', zh: '未找到模型。' },
    };
    return (m[key] && m[key][lang]) || m[key].en;
  }

  async function lcaApiCall(body, opts) {
    opts = opts || {};
    var lang = opts.lang || 'ru';
    var session = null;
    if (window.sb) {
      var s = await window.sb.auth.getSession();
      session = s && s.data ? s.data.session : null;
    }
    if (!session) {
      var e = new Error(msg(lang, 'auth_required'));
      e.code = 'AUTH_REQUIRED';
      throw e;
    }
    var res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
      body: JSON.stringify(body),
    });
    var raw = await res.text();
    var data;
    try { data = JSON.parse(raw); } catch (err) { data = { error: raw.slice(0, 500) }; }
    if (!res.ok) {
      var upstream = data.upstream_body || data.error || raw.slice(0, 200);
      var hint = '';
      if (res.status === 401) hint = ' — ' + msg(lang, 'session_expired');
      else if (/insufficient|balance|payment/i.test(upstream)) hint = ' — ' + msg(lang, 'balance');
      else if (res.status === 504 || /timeout/i.test(upstream)) hint = ' — ' + msg(lang, 'timeout');
      else if (res.status === 404 || /model.*not.*found/i.test(upstream)) hint = ' — ' + msg(lang, 'model');
      throw new Error('API ' + res.status + hint + ' <small style="font-family:monospace;opacity:.7">' + window.escHtml(upstream).slice(0, 300) + '</small>');
    }
    return data;
  }

  window.lcaApiCall = lcaApiCall;
})();
