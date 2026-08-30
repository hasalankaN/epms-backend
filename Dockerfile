# Build Stage
FROM node:23-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Enable Corepack and install correct Yarn version
RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# Copy package.json and yarn.lock to the working directory
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the rest of the application to the working directory
COPY . .

# Build the application (with explicit node_modules access)
RUN yarn install && yarn build

# Expose the port on which the app will run
EXPOSE 3000

# Start the server using the production build
CMD ["node", "--max-old-space-size=512", "dist/src/main"]