# みんなでクイズ

会場参加型のリアルタイムクイズWebアプリです。出題者はルームを作成して問題進行を操作し、参加者は6桁コードまたはQRコードから参加します。

## 起動

```bash
npm install
npm run dev
```

Supabase未設定でも、同じブラウザ内の複数タブで動作確認できるローカルデモ同期が有効です。

## Supabase設定

1. Supabaseプロジェクトを作成します。
2. `supabase/schema.sql` を SQL Editor で実行します。
3. `.env.example` を `.env.local` にコピーし、URLとAnon Keyを設定します。
4. 既存データベースにアプリ設定機能を追加する場合は、`supabase/app_settings_migration.sql` を SQL Editor で実行します。
5. SupabaseのRealtimeで `rooms`, `participants`, `questions`, `answers`, `app_settings` を有効化します。

```bash
cp .env.example .env.local
```

## 主な画面

- `/` トップ、開催、参加
- `/settings` アプリ設定
- `/host/create` ルーム作成
- `/host/:roomId` 出題者管理
- `/host/:roomId/questions` 問題作成・編集
- `/play/:roomCode` 参加者画面

## デプロイ

Vercelで通常のViteアプリとしてデプロイできます。環境変数に `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を設定してください。

## GitHub Pages公開

このリポジトリにはGitHub Pages用のワークフロー `.github/workflows/deploy-pages.yml` が含まれています。

GitHubリポジトリ作成後、以下を設定してください。

1. GitHubの `Settings` → `Pages` を開きます。
2. `Build and deployment` の `Source` を `GitHub Actions` にします。
3. `Settings` → `Secrets and variables` → `Actions` を開きます。
4. `Variables` に `VITE_SUPABASE_URL` を追加します。
5. `Secrets` に以下を追加します。
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ACCESS_PASSPHRASE`
   - `VITE_SETTINGS_ADMIN_PIN`
6. `main` ブランチにpushすると自動公開されます。

公開URLは通常、以下の形式です。

```text
https://GitHubユーザー名.github.io/minna-de-quiz/
```

GitHub Pagesではルーティングを安定させるため、URLは `#/play/参加コード` の形式になります。
