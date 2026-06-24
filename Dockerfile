# ---- Stage 1: Build Frontend ----
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Backend + Serve Frontend ----
FROM node:22-alpine AS production

# Set NODE_ENV early so npm ci respects --omit=dev automatically
ENV NODE_ENV=production

WORKDIR /app

# Install backend dependencies (production only)
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./

# Copy built frontend into backend's public directory
COPY --from=frontend-build /app/frontend/dist ./public

# Create uploads directory
RUN mkdir -p uploads

# Add non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/doctors || exit 1

# Initialize database and start server
CMD ["sh", "-c", "node config/dbInit.js && node server.js"]
