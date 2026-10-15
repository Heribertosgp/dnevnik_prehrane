FROM node:22-bookworm-slim
WORKDIR /app
ENV ONNXRUNTIME_NODE_INSTALL_CUDA=skip
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY LICENSE THIRD_PARTY_NOTICES.md DEPENDENCIES.json ./
COPY licenses ./licenses
COPY public ./public
COPY server ./server
COPY scripts/prepare-model.mjs ./scripts/prepare-model.mjs
RUN mkdir -p /data /models && chown node:node /data /models
USER node
ENV NODE_ENV=production DATA_DIR=/data MODEL_CACHE=/models OWNER_FILE=/run/secrets/owner LISTEN_HOST=0.0.0.0 PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.mjs"]
