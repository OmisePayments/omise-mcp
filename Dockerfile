# Omise MCP Server Dockerfile
# Multi-stage build for production optimization

# ============================================================================
# Build Stage
# ============================================================================
FROM node:20-alpine AS builder

# セキュリティ: 非rootユーザーでビルド
RUN addgroup -g 1001 -S nodejs && \
    adduser -S omise -u 1001

# 作業ディレクトリの設定
WORKDIR /app

# パッケージファイルのコピー
COPY package*.json ./
COPY tsconfig.json ./

# 依存関係のインストール（本番用のみ）
RUN npm ci --only=production && npm cache clean --force

# ソースコードのコピー
COPY src/ ./src/

# TypeScriptのビルド
RUN npm run build

# ============================================================================
# Production Stage
# ============================================================================
FROM node:20-alpine AS production

# セキュリティ設定
RUN apk add --no-cache \
    dumb-init \
    curl \
    && addgroup -g 1001 -S nodejs \
    && adduser -S omise -u 1001

# 作業ディレクトリの設定
WORKDIR /app

# 本番用ファイルのコピー
COPY --from=builder --chown=omise:nodejs /app/dist ./dist
COPY --from=builder --chown=omise:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=omise:nodejs /app/package*.json ./

# ログディレクトリの作成
RUN mkdir -p /app/logs && chown -R omise:nodejs /app/logs

# 非rootユーザーに切り替え
USER omise

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# ポートの公開
EXPOSE 3000

# 環境変数の設定
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info
ENV LOG_FORMAT=json

# セキュリティ: 不要な機能の無効化
ENV NODE_OPTIONS="--max-old-space-size=512"

# 起動スクリプト
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
