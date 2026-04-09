FROM node:22-alpine AS deps

WORKDIR /app/frontend

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

RUN yarn install --frozen-lockfile

FROM deps AS build

WORKDIR /app/frontend

COPY . .

RUN npx svelte-kit sync
RUN yarn build

FROM node:22-alpine AS runner

WORKDIR /app/frontend

COPY --from=build /app/frontend/build ./build
COPY --from=build /app/frontend/node_modules ./node_modules
COPY --from=build /app/frontend/package.json ./

EXPOSE 3000
CMD ["node", "build"]
