FROM node:22-alpine AS deps

WORKDIR /app/backend

COPY backend/package.json backend/yarn.lock backend/.yarnrc.yml ./
COPY backend/.yarn ./.yarn

RUN yarn install --frozen-lockfile

FROM deps AS build

WORKDIR /app/backend

COPY backend/ ./

RUN yarn build

FROM node:22-alpine AS runner

WORKDIR /app/backend

COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/package.json ./

EXPOSE 3000
CMD ["node", "dist/main.js"]
