# --- Stage 1: Build Stage ---
# This stage installs dependencies and gathers all necessary source code.
FROM node:20-alpine AS builder

WORKDIR /app

# Copy all necessary package definitions for a clean monorepo install
COPY package.json package-lock.json ./
COPY packages/server/package.json ./packages/server/
COPY packages/ui/package.json ./packages/ui/

# Install production dependencies for the entire workspace
RUN npm install --omit=dev

# Copy only the server's source code
COPY ./packages/server/src ./packages/server/src

# --- Stage 2: Production Stage ---
# This stage builds the lean, secure final image for the server.
FROM node:20-alpine

WORKDIR /app

# Create a non-root user, group, and a dedicated data directory.
# Give our user ownership of the entire app directory.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    mkdir -p /app/data && chown -R appuser:appgroup /app

# Switch to the non-root user for security
USER appuser

# Copy the built artifacts from the 'builder' stage into a clean structure.
# This flattens the structure, making paths simple and reliable.
COPY --from=builder /app/packages/server/package.json .
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/server/src ./src

# Expose the ports for clients, replication, and the UI WebSocket
EXPOSE 63790
EXPOSE 63791
EXPOSE 8080

# The path is now simple and correct relative to the WORKDIR.
CMD ["node", "src/index.js"]