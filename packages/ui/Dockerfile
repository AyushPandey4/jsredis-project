# --- Stage 1: Build Stage ---
# Use Node.js to build the React app into static files.
FROM node:20-alpine AS builder

# Set the working directory for the entire monorepo.
WORKDIR /app

# Copy all package.json and lockfiles to leverage Docker's build cache.
COPY package.json package-lock.json ./
COPY packages/ui/package.json ./packages/ui/
COPY packages/server/package.json ./packages/server/

# Install all dependencies for the entire monorepo.
RUN npm install

# Copy the UI source code.
COPY packages/ui ./packages/ui

# Run the build script for the UI workspace.
# This creates the static files in /app/packages/ui/dist
RUN npm run build --workspace=@jsredis/ui


# --- Stage 2: Production Stage ---
# Use a lightweight Nginx image to serve the static files.
FROM nginx:stable-alpine

# Copy the built static files from the 'builder' stage to Nginx's web root directory.
COPY --from=builder /app/packages/ui/dist /usr/share/nginx/html

# Copy our custom Nginx configuration.
# NOTE: This assumes nginx.conf is in packages/ui. If not, create it there.
COPY packages/ui/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80, which is the default port Nginx listens on.
EXPOSE 80

# The Nginx base image already has the correct CMD to start the server.