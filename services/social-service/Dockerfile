FROM node:22-alpine
WORKDIR /app
COPY package.json tsconfig.json prisma.config.ts ./
RUN npm install
COPY prisma ./prisma
COPY src ./src
ENV DATABASE_URL="postgresql://user:password@social-db:5432/social_db?schema=public"
RUN npx prisma generate
EXPOSE ${PORT:-3004}
CMD ["npx", "tsx", "src/server.ts"]