# Omise MCP Server - デプロイメントガイド

このドキュメントでは、Omise MCP Serverの本番環境デプロイメントの設定と手順について説明します。

## 🚀 デプロイメント概要

### アーキテクチャ
- **コンテナ化**: Docker + Docker Compose
- **リバースプロキシ**: Nginx
- **キャッシュ**: Redis
- **モニタリング**: Prometheus + Grafana
- **ログ集約**: Loki
- **CI/CD**: GitHub Actions

### セキュリティ機能
- 非rootユーザーでの実行
- セキュリティヘッダーの設定
- レート制限
- 機密情報のマスキング
- セキュリティスキャン

## 📋 前提条件

### 必要なソフトウェア
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 20+ (開発環境)
- Git

### 必要な環境変数
```bash
# Omise API設定
OMISE_PUBLIC_KEY=pkey_live_xxxxxxxxxxxxxxxx
OMISE_SECRET_KEY=skey_live_xxxxxxxxxxxxxxxx
OMISE_ENVIRONMENT=production

# セキュリティ設定
REDIS_PASSWORD=your_secure_password
GRAFANA_PASSWORD=your_grafana_password
```

## 🏗️ デプロイメント手順

### 1. リポジトリのクローン
```bash
git clone git@github.com:omise/omise-mcp.git
cd omise-mcp
```

### 2. 環境設定
```bash
# 本番環境用の設定ファイルをコピー
cp config/production.env .env

# 環境変数を設定
export OMISE_PUBLIC_KEY=pkey_live_xxxxxxxxxxxxxxxx
export OMISE_SECRET_KEY=skey_live_xxxxxxxxxxxxxxxx
export REDIS_PASSWORD=your_secure_password
export GRAFANA_PASSWORD=your_grafana_password
```

### 3. デプロイメント実行
```bash
# 自動デプロイメントスクリプトの実行
./deploy.sh latest production

# または手動でDocker Composeを実行
docker-compose --env-file config/production.env up -d
```

### 4. ヘルスチェック
```bash
# サービスが正常に起動しているか確認
curl http://localhost:3000/health
curl http://localhost:3000/ready
curl http://localhost:3000/live
```

## 🔧 環境別設定

### 開発環境
```bash
# 開発環境での起動
docker-compose --env-file config/development.env up -d
```

### ステージング環境
```bash
# ステージング環境での起動
docker-compose --env-file config/staging.env up -d
```

### 本番環境
```bash
# 本番環境での起動
docker-compose --env-file config/production.env up -d
```

## 📊 モニタリング

### Prometheus
- URL: http://localhost:9090
- メトリクス収集とアラート管理

### Grafana
- URL: http://localhost:3001
- ダッシュボードとビジュアライゼーション
- デフォルトログイン: admin / admin

### ログ確認
```bash
# アプリケーションログ
docker-compose logs -f omise-mcp-server

# Nginxログ
docker-compose logs -f nginx

# 全サービスのログ
docker-compose logs -f
```

## 🔒 セキュリティ設定

### SSL/TLS設定
```bash
# SSL証明書の配置
mkdir -p nginx/ssl
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem
```

### ファイアウォール設定
```bash
# 必要なポートのみ開放
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
```

### セキュリティスキャン
```bash
# コンテナのセキュリティスキャン
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image omise-mcp-server:latest
```

## 🚨 トラブルシューティング

### よくある問題

#### 1. サービスが起動しない
```bash
# ログを確認
docker-compose logs omise-mcp-server

# 環境変数を確認
docker-compose config
```

#### 2. ヘルスチェックが失敗する
```bash
# ヘルスチェックエンドポイントを直接確認
curl -v http://localhost:3000/health

# サービス間の接続を確認
docker-compose exec omise-mcp-server ping redis
```

#### 3. メモリ不足
```bash
# メモリ使用量を確認
docker stats

# 不要なコンテナを削除
docker system prune -a
```

### ログ分析
```bash
# エラーログの確認
docker-compose logs omise-mcp-server | grep ERROR

# アクセスログの分析
docker-compose logs nginx | grep "GET /"
```

## 🔄 アップデート手順

### 1. 新しいバージョンのデプロイ
```bash
# 新しいイメージをビルド
docker-compose build

# ローリングアップデート
docker-compose up -d --no-deps omise-mcp-server
```

### 2. ロールバック
```bash
# 前のバージョンに戻す
docker-compose down
docker-compose up -d
```

## 📈 パフォーマンス最適化

### リソース制限
```yaml
# docker-compose.yml に追加
services:
  omise-mcp-server:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '1.0'
          memory: 512M
```

### キャッシュ設定
```bash
# Redisの設定最適化
docker-compose exec redis redis-cli CONFIG SET maxmemory 256mb
docker-compose exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

## 🔍 監視とアラート

### メトリクス監視
- CPU使用率
- メモリ使用率
- ディスク使用率
- ネットワークI/O
- アプリケーション固有のメトリクス

### アラート設定
- 高CPU使用率 (>80%)
- 高メモリ使用率 (>90%)
- エラー率の増加
- レスポンス時間の増加

## 📚 追加リソース

### ドキュメント
- [Docker公式ドキュメント](https://docs.docker.com/)
- [Docker Compose公式ドキュメント](https://docs.docker.com/compose/)
- [Prometheus公式ドキュメント](https://prometheus.io/docs/)
- [Grafana公式ドキュメント](https://grafana.com/docs/)

### サポート
- GitHub Issues: バグレポートと機能要求
- ドキュメント: 詳細な設定手順
- コミュニティ: 質問とディスカッション

## 🏷️ バージョン管理

### タグ付け
```bash
# リリース用のタグを作成
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### セマンティックバージョニング
- **メジャー**: 破壊的変更
- **マイナー**: 新機能追加
- **パッチ**: バグ修正

---

このデプロイメントガイドに従うことで、Omise MCP Serverを安全で効率的な本番環境にデプロイできます。
