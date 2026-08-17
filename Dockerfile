# Stage 1: Build the React SPA
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for optimal caching layer
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build production assets
COPY . .

ARG VITE_BACKEND_URL=http://187.127.163.17:3018
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
