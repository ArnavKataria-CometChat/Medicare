# ---- Stage 1: Build Frontend ----
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Backend + Serve Frontend ----
FROM node:20-alpine AS production

WORKDIR /app

# Install backend dependencies
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --only=production

# Copy backend source
COPY backend/ ./

# Copy built frontend into backend's public directory
COPY --from=frontend-build /app/frontend/dist ./public

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/doctors || exit 1

# Start the server
CMD ["node", "server.js"]
