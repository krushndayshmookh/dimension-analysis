# Build the browser app.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js jsconfig.json components.json ./
COPY src ./src
RUN npm run build

# Run the storage server, which also serves the built app.
FROM node:22-alpine
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001 \
    DATA_DIR=/data
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY scripts/users.js ./scripts/users.js
COPY --from=build /app/dist ./dist
# The data folder is a volume owned by the unprivileged "node" user.
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3001
CMD ["node", "server/server.js"]
