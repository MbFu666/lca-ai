// _worker.js — Maintenance mode
const MAINTENANCE_MODE = true; // false = выключить техобслуживание
const YOUR_IP = "1.58.73.217";

const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LCA·AI — Технические работы</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
            display: flex; justify-content: center; align-items: center;
            min-height: 100vh; background: #F8FAFA; color: #0E2E27;
            text-align: center; padding: 24px;
        }
        .container { max-width: 520px; }
        .icon {
            width: 80px; height: 80px; margin: 0 auto 28px; border-radius: 50%;
            background: linear-gradient(135deg, #14C997 0%, #0FB386 100%);
            display: flex; align-items: center; justify-content: center;
            font-size: 36px; box-shadow: 0 12px 32px -4px rgba(20,201,151,0.35);
        }
        h1 { font-size: 28px; font-weight: 800; margin-bottom: 12px; }
        p { font-size: 16px; line-height: 1.7; color: #4D5E61; margin-bottom: 24px; }
        .brand { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: #93A0A6; }
        .brand .dot { width: 8px; height: 8px; border-radius: 50%; background: #14C997; display: inline-block; }
        .loader-dots { display: flex; gap: 6px; justify-content: center; margin-top: 32px; }
        .loader-dots span {
            width: 8px; height: 8px; border-radius: 50%; background: #14C997; opacity: 0.3;
            animation: dotPulse 1.4s ease-in-out infinite;
        }
        .loader-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loader-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes dotPulse {
            0%, 80%, 100% { opacity: 0.3; transform: scale(1); }
            40% { opacity: 1; transform: scale(1.3); }
        }
        @media (max-width: 480px) { h1 { font-size: 22px; } p { font-size: 14px; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">\u{1F527}</div>
        <h1>\u0412\u0435\u0434\u0443\u0442\u0441\u044F \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0440\u0430\u0431\u043E\u0442\u044B</h1>
        <p>\u0421\u0438\u0441\u0442\u0435\u043C\u0430 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0434\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0434\u0435\u043D\u0438\u044F \u043E\u0431\u0441\u043B\u0443\u0436\u0438\u0432\u0430\u043D\u0438\u044F.<br>\u041C\u044B \u0441\u043A\u043E\u0440\u043E \u0432\u0435\u0440\u043D\u0451\u043C\u0441\u044F!</p>
        <div class="loader-dots"><span></span><span></span><span></span></div>
        <div style="margin-top:48px"><span class="brand"><span class="dot"></span>LCA\u00B7AI</span></div>
    </div>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    const clientIP = request.headers.get("CF-Connecting-IP") ||
                     request.headers.get("X-Forwarded-For") || "unknown";

    if (MAINTENANCE_MODE && clientIP !== YOUR_IP) {
      return new Response(MAINTENANCE_HTML, {
        status: 503,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Retry-After": "3600",
          "Cache-Control": "no-store"
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
