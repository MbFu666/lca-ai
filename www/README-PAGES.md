# Cloudflare Pages root = `www/`

Все публикуемые файлы сайта лежат в этой папке. `supabase/`, `deploy/`, `server/`,
`desktop/` и прочие служебные каталоги находятся ВЫШЕ и не попадают в публичный корень.

## Действие в Cloudflare dashboard (один раз)
1. Workers & Pages → ваш проект → Settings → Builds & deployments.
2. **Build output directory** = `www`  (вместо корня репозитория).
3. Save → Trigger redeploy.

После этого публично доступны только `www/*`; `/_headers` и `/robots.txt`
применяются от корня `www/` (SRI/CSP/robots продолжают работать).

## Проверка после redeploy
- `https://lca-ai.ru/` → главная.
- `https://lca-ai.ru/supabase/functions/migration.sql` → 404 (ранее файл читался).
- `https://lca-ai.ru/deploy/docker-compose.yml` → 404.
