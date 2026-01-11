# Auto Timestamp Plugin for Obsidian

ObsidianのMarkdownノートに作成日時（created）と更新日時（modified）を自動的にYAMLフロントマターとして追加・更新するプラグインです。

## 機能

- **新規ファイル作成時**: `created` と `modified` フィールドを自動追加
- **ファイル編集・保存時**: `modified` フィールドを自動更新
- **カスタマイズ可能**: 日付フォーマット、キー名、除外パターンを設定可能

## インストール

### 手動インストール

1. このリポジトリをクローン
2. `npm install` で依存関係をインストール
3. `npm run build` でビルド
4. `main.js`, `manifest.json` を Obsidian vault の `.obsidian/plugins/auto-timestamp/` にコピー
5. Obsidian を再起動し、設定 > コミュニティプラグイン で有効化

## 使用例

新規ファイルを作成すると、以下のようなフロントマターが自動追加されます：

```markdown
---
created: 20241229143052
modified: 20241229143052
---

# ノートの内容
```

ファイルを編集・保存すると `modified` が更新されます：

```markdown
---
created: 20241229143052
modified: 20241229150030
---
```

## 設定

プラグイン設定から以下をカスタマイズできます：

| 設定項目 | 説明 | デフォルト |
|---------|------|-----------|
| Date format | 日付フォーマット | `yyyyMMddHHmmss` |
| Created key | 作成日時のキー名 | `created` |
| Modified key | 更新日時のキー名 | `modified` |
| Ignore patterns | 除外ファイルパターン（正規表現） | なし |

### 日付フォーマット

以下のプレースホルダーが使用可能です：

- `yyyy` - 年（4桁）
- `MM` - 月（2桁）
- `dd` - 日（2桁）
- `HH` - 時（24時間形式、2桁）
- `mm` - 分（2桁）
- `ss` - 秒（2桁）

例：
- `yyyyMMddHHmmss` → `20241229143052`
- `yyyy-MM-dd HH:mm:ss` → `2024-12-29 14:30:52`
- `yyyy/MM/dd` → `2024/12/29`

### 除外パターン

特定のファイルやフォルダを除外したい場合、正規表現パターンを指定できます：

```
templates/.*
daily/.*
\.excalidraw\.md$
```

## 開発

```bash
# 依存関係のインストール
npm install

# 開発モード（ファイル変更を監視）
npm run dev

# プロダクションビルド
npm run build
```

