# LCA-AI Phase 2: 13 Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix critical bugs, add OAuth providers, i18n, profile editing, share functionality, page split, and auth guards across 13 features.

**Architecture:** Monolithic inline HTML files (`index.html`, `cabinet.html`, `login.html`). All CSS+JS inline. Supabase for auth + PostgreSQL. Cloudflare Pages hosting.

**Tech Stack:** Vanilla JS, Supabase JS SDK v2, CSS variables, HTML templates.

## Global Constraints

- **NEVER** use PowerShell `Set-Content` for file writes (corrupts UTF-8). Use MiMoCode `write` tool.
- **NEVER** name variable `supabase` — use `sbClient` or `db`.
- **Git exe:** `C:\Program Files\Git\cmd\git.exe`
- **Git push:** `git pull --rebase && git push origin main`
- **Supabase URL:** `https://pbisngkepszwzzjivxus.supabase.co`
- **All code inline** — no external app.js or main.js
- **Ponytail mode:** minimal diff, YAGNI, stdlib first

## Task Groups

### Group A: Bug Fixes (Tasks 1-2)
### Group B: UI/i18n (Tasks 3-4)
### Group C: Auth (Tasks 5-9)
### Group D: Features (Tasks 10-11)
### Group E: Architecture (Tasks 12-13)

---

## Task 1: Fix History Deletion Sync

**Problem:** `clearHistory()` in index.html deletes from Supabase + localStorage, but cabinet.html's `deleteHistory(id)` only deletes from Supabase. Cabinet doesn't refresh main page data.

**Files:**
- Modify: `index.html:6605-6616` — clearHistory function
- Modify: `cabinet.html:275-286` — deleteHistory function

**Root Cause:** No cross-tab communication. Cabinet deletes from Supabase but main page doesn't know.

**Solution:** After Supabase delete in cabinet, also clear localStorage cache so main page re-fetches on next load.

- [ ] **Step 1:** In `cabinet.html:deleteHistory(id)`, after Supabase delete, also remove from localStorage:
```javascript
// After line 283 (Supabase delete)
const cached = JSON.parse(localStorage.getItem('lca-history') || '[]');
const filtered = cached.filter(e => String(e.id) !== String(id));
localStorage.setItem('lca-history', JSON.stringify(filtered));
```

- [ ] **Step 2:** In `cabinet.html:loadHistory()`, after rendering, dispatch event:
```javascript
window.dispatchEvent(new Event('storage'));
```

- [ ] **Step 3:** In `index.html`, add `storage` event listener to re-sync history:
```javascript
window.addEventListener('storage', () => {
  const h = JSON.parse(localStorage.getItem('lca-history') || '[]');
  renderHistory(h);
});
```

- [ ] **Step 4:** Test: delete history from cabinet → open main page → verify entry gone.

---

## Task 2: Fix Delete Calculation from Project

**Problem:** `deleteCalcFromProject()` in index.html deletes from localStorage but click handler may not fire. Cabinet version works.

**Files:**
- Modify: `index.html:8780-8785` — click handler binding
- Modify: `cabinet.html:378-390` — already works, just verify

**Root Cause:** The click handler at line 8780 uses `dataset.id` but the delete button's `data-id` attribute may not match the Supabase UUID format.

**Solution:** Ensure click handler passes correct UUID to `deleteCalcFromProject`.

- [ ] **Step 1:** Read `index.html:8760-8790` to verify click handler binding.
- [ ] **Step 2:** Ensure `data-calc-id` attribute on delete button matches Supabase UUID.
- [ ] **Step 3:** Add `renderProjects()` call after delete to refresh UI:
```javascript
// After deleteCalcFromProject call
renderProjects();
```

- [ ] **Step 4:** Test: create project → add calc → delete calc → verify removed from UI + Supabase.

---

## Task 3: Fix Dark Mode on Login Page

**Problem:** Login page buttons not styled correctly in dark mode.

**Files:**
- Modify: `login.html` — CSS and button styles

**Solution:** Add dark mode CSS overrides for login buttons.

- [ ] **Step 1:** Read `login.html` CSS section to find button styles.
- [ ] **Step 2:** Add dark mode overrides:
```css
html.dark .login-btn {
  background: var(--bg-soft);
  color: var(--ink);
  border: 1px solid var(--rule);
}
html.dark .login-btn:hover {
  background: var(--jade-bg);
  border-color: var(--jade);
}
html.dark .oauth-btn {
  background: var(--bg-soft);
  color: var(--ink);
  border: 1px solid var(--rule);
}
```

- [ ] **Step 3:** Test: toggle dark mode on login page → verify all buttons visible.

---

## Task 4: Translate Login and Cabinet Pages

**Problem:** Login page has partial i18n. Cabinet page has no i18n system.

**Files:**
- Modify: `login.html` — add full i18n for all UI strings
- Modify: `cabinet.html` — add i18n system matching index.html pattern

**Solution:** Add `applyLoginLang()` and `applyCabinetLang()` functions with RU/EN/ZH translations.

- [ ] **Step 1:** Read `login.html` to catalog all untranslated strings.
- [ ] **Step 2:** Add translation object to login.html:
```javascript
const LOGIN_I18N = {
  ru: { loginTitle: 'Вход', email: 'Email', password: 'Пароль', ... },
  en: { loginTitle: 'Login', email: 'Email', password: 'Password', ... },
  zh: { loginTitle: '登录', email: '电子邮件', password: '密码', ... }
};
```

- [ ] **Step 3:** Update `applyLoginLang()` to use `LOGIN_I18N[currentLang]`.
- [ ] **Step 4:** Read `cabinet.html` to catalog all untranslated strings.
- [ ] **Step 5:** Add `CABINET_I18N` object and `applyCabinetLang()` function.
- [ ] **Step 6:** Test: switch languages on both pages → verify all text changes.

---

## Task 5: Password Change Page

**Problem:** No way to change password after login.

**Files:**
- Modify: `cabinet.html` — add password change section in settings tab

**Solution:** Add password change form using Supabase `updateUser({ password })`.

- [ ] **Step 1:** Add password change HTML in cabinet.html settings tab:
```html
<div class="settings-section">
  <h3 data-i18n="changePassword">Изменить пароль</h3>
  <input type="password" id="newPassword" placeholder="Новый пароль">
  <input type="password" id="confirmNewPassword" placeholder="Подтвердите пароль">
  <button id="changePasswordBtn">Изменить</button>
</div>
```

- [ ] **Step 2:** Add event handler:
```javascript
document.getElementById('changePasswordBtn').addEventListener('click', async () => {
  const pw = document.getElementById('newPassword').value;
  const pw2 = document.getElementById('confirmNewPassword').value;
  if (pw !== pw2) { showToast('Пароли не совпадают'); return; }
  if (pw.length < 6) { showToast('Минимум 6 символов'); return; }
  const { error } = await db.auth.updateUser({ password: pw });
  if (error) showToast(error.message);
  else showToast('Пароль изменён');
});
```

- [ ] **Step 3:** Test: change password → logout → login with new password.

---

## Task 6: Email OTP on Login

**Problem:** Login uses only password, no email verification code option.

**Files:**
- Modify: `login.html` — add OTP login option

**Solution:** Add "Login with code" option using `signInWithOtp()` + `verifyOtp()`.

- [ ] **Step 1:** Add OTP form HTML:
```html
<div id="otpForm" style="display:none">
  <input type="email" id="otpEmail" placeholder="Email">
  <button id="sendOtpBtn">Отправить код</button>
  <div id="otpCodeSection" style="display:none">
    <input type="text" id="otpCode" placeholder="Код из письма" maxlength="6">
    <button id="verifyOtpBtn">Войти</button>
  </div>
</div>
```

- [ ] **Step 2:** Add "Login with code" toggle link.
- [ ] **Step 3:** Add OTP handlers:
```javascript
document.getElementById('sendOtpBtn').addEventListener('click', async () => {
  const email = document.getElementById('otpEmail').value;
  const { error } = await sbClient.auth.signInWithOtp({ email });
  if (error) showToast(error.message);
  else { showToast('Код отправлен'); document.getElementById('otpCodeSection').style.display = 'block'; }
});

document.getElementById('verifyOtpBtn').addEventListener('click', async () => {
  const email = document.getElementById('otpEmail').value;
  const token = document.getElementById('otpCode').value;
  const { error } = await sbClient.auth.verifyOtp({ email, token, type: 'email' });
  if (error) showToast(error.message);
  else window.location.href = '/';
});
```

- [ ] **Step 4:** Test: send OTP → receive email → enter code → login successful.

---

## Task 7: GitHub OAuth

**Problem:** Only Google OAuth exists.

**Files:**
- Modify: `login.html` — add GitHub OAuth button

**Solution:** Add GitHub provider button. Requires Supabase Dashboard config.

- [ ] **Step 1:** Add GitHub button HTML:
```html
<button id="githubBtn" class="oauth-btn">
  <svg>...</svg> GitHub
</button>
```

- [ ] **Step 2:** Add handler:
```javascript
document.getElementById('githubBtn').addEventListener('click', () => {
  sbClient.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: REDIRECT } });
});
```

- [ ] **Step 3:** Document: Enable GitHub provider in Supabase Dashboard → Authentication → Providers.

---

## Task 8: Twitter OAuth

**Problem:** No Twitter/X OAuth.

**Files:**
- Modify: `login.html` — add Twitter OAuth button

**Solution:** Same pattern as GitHub. Supabase supports `provider: 'twitter'`.

- [ ] **Step 1:** Add Twitter button + handler.
- [ ] **Step 2:** Document: Enable Twitter provider in Supabase Dashboard.

---

## Task 9: WeChat OAuth

**Problem:** No WeChat OAuth.

**Files:**
- Modify: `login.html` — add WeChat OAuth button

**Solution:** Supabase doesn't natively support WeChat. Options:
1. Use Supabase's generic OIDC provider
2. Use WeChat Open Platform OAuth + custom Supabase Edge Function

**Decision:** Skip for now — WeChat OAuth requires a Chinese business license and WeChat Open Platform developer account. Document as future feature.

- [ ] **Step 1:** Add placeholder comment in login.html:
```html
<!-- TODO: WeChat OAuth requires WeChat Open Platform developer account -->
```

---

## Task 10: Share Project/Calculation

**Problem:** No way to share a project or calculation with others.

**Files:**
- Modify: `cabinet.html` — add share button per project/calc
- Modify: `index.html` — add share modal with link generation

**Solution:** Generate shareable URL `/?history=<UUID>` or `/?project=<UUID>`. URL handler already exists in index.html (line 9245-9298).

- [ ] **Step 1:** Add share button in cabinet.html project cards:
```html
<button class="share-btn" data-id="${project.id}" title="Поделиться">🔗</button>
```

- [ ] **Step 2:** Add share handler:
```javascript
document.querySelectorAll('.share-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const id = btn.dataset.id;
    const url = `${window.location.origin}/?history=${id}`;
    navigator.clipboard.writeText(url);
    showToast('Ссылка скопирована!');
  });
});
```

- [ ] **Step 3:** Add share button to index.html report view.
- [ ] **Step 4:** Test: click share → copy link → open in incognito → verify data loads.

---

## Task 11: Profile Editing

**Problem:** No way to edit profile (name, avatar).

**Files:**
- Modify: `cabinet.html` — add profile edit form in settings tab

**Solution:** Use Supabase `updateUser({ data: { full_name, avatar_url } })`.

- [ ] **Step 1:** Add profile edit HTML in settings tab:
```html
<div class="settings-section">
  <h3>Профиль</h3>
  <input type="text" id="profileName" placeholder="Имя">
  <input type="text" id="profileAvatar" placeholder="URL аватара">
  <button id="saveProfileBtn">Сохранить</button>
</div>
```

- [ ] **Step 2:** Add handler:
```javascript
document.getElementById('saveProfileBtn').addEventListener('click', async () => {
  const name = document.getElementById('profileName').value;
  const avatar = document.getElementById('profileAvatar').value;
  const { error } = await db.auth.updateUser({ data: { full_name: name, avatar_url: avatar } });
  if (error) showToast(error.message);
  else { showToast('Профиль обновлён'); renderProfile(); }
});
```

- [ ] **Step 3:** Pre-fill with current user data on load.
- [ ] **Step 4:** Test: edit name → save → verify displayed in cabinet + main page header.

---

## Task 12: Split Main Page and Calculation Page

**Problem:** index.html is 9500+ lines monolith. User wants home page and report page in separate files.

**Files:**
- Create: `home.html` — search/composer only
- Modify: `index.html` — keep as report/results page
- Modify: `_routes.json` — update Cloudflare routing

**Solution:** Extract home page HTML+CSS+JS into `home.html`. Keep report rendering in `index.html`.

**This is a large refactor. Recommend doing AFTER all bug fixes and features are stable.**

- [ ] **Step 1:** Identify home page sections in index.html (lines 1-5973 HTML, CSS, JS init).
- [ ] **Step 2:** Create `home.html` with:
  - All CSS from index.html
  - Supabase init code
  - Auth check code
  - i18n system
  - Search input + composer
  - Agent panel
  - Navigation to `/?history=<id>` or `/?project=<id>` for report view
- [ ] **Step 3:** Trim `index.html` to only report/results sections.
- [ ] **Step 4:** Update `_routes.json`:
```json
[{ "pattern": "/", "serve": "/home.html" }, { "pattern": "/*", "serve": "/index.html" }]
```

- [ ] **Step 5:** Test: home page loads → enter product → navigate to report page → back button works.

---

## Task 13: Auth Guard for Projects

**Problem:** Unauthorized users can create/edit projects (data only in localStorage, lost on clear).

**Files:**
- Modify: `index.html` — add auth check before project operations

**Solution:** Show "Login required" modal when unauthenticated user tries to create/access projects.

- [ ] **Step 1:** Add auth guard function:
```javascript
function requireAuth(action) {
  if (currentUser) return true;
  showToast(currentLang === 'ru' ? 'Для этого действия нужно войти в аккаунт' : 'Please login to continue');
  setTimeout(() => window.location.href = '/login.html', 1500);
  return false;
}
```

- [ ] **Step 2:** Wrap project creation:
```javascript
document.getElementById('createProjectBtn')?.addEventListener('click', () => {
  if (!requireAuth('create project')) return;
  showNewProjectModal();
});
```

- [ ] **Step 3:** Wrap "Save to project" button:
```javascript
$('#saveToProjectBtn')?.addEventListener('click', () => {
  if (!requireAuth('save to project')) return;
  // ... existing logic
});
```

- [ ] **Step 4:** Hide project section for unauthenticated users:
```javascript
if (!currentUser) {
  document.querySelector('.projects-section')?.style.setProperty('display', 'none');
}
```

- [ ] **Step 5:** Test: logout → try create project → see login prompt → login → try again → works.

---

## Agent Assignment

| Task | Priority | Subagent Type | Estimated Lines |
|------|----------|---------------|-----------------|
| 1. History deletion sync | HIGH | general | ~15 |
| 2. Delete calc from project | HIGH | general | ~10 |
| 3. Dark mode login | HIGH | general | ~20 |
| 4. Translate login+cabinet | MEDIUM | general | ~100 |
| 5. Password change | MEDIUM | general | ~30 |
| 6. Email OTP | MEDIUM | general | ~40 |
| 7. GitHub OAuth | LOW | general | ~10 |
| 8. Twitter OAuth | LOW | general | ~10 |
| 9. WeChat OAuth | SKIP | — | — |
| 10. Share function | MEDIUM | general | ~30 |
| 11. Profile editing | MEDIUM | general | ~30 |
| 12. Page split | LOW | general | ~500 |
| 13. Auth guard | HIGH | general | ~20 |

**Execution order:** Tasks 1-3 first (bugs/UI), then 13 (auth guard), then 5-8 (auth features), then 4+10+11 (features), then 12 (refactor last).
