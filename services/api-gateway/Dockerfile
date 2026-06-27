FROM node:22-alpine
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY src ./src
COPY openapi.yaml ./
EXPOSE ${PORT:-3000}
CMD ["npx", "tsx", "src/server.ts"]