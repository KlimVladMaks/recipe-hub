FROM node:22-alpine
WORKDIR /app
COPY package.json tsconfig.json prisma.config.ts ./
RUN npm install
COPY prisma ./prisma
COPY src ./src
ENV DATABASE_URL="postgresql://user:password@directory-db:5432/directory_db?schema=public"
RUN npx prisma generate
EXPOSE ${PORT:-3003}
CMD ["npx", "tsx", "src/server.ts"]