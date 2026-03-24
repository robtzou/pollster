FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package*.json ./
RUN npm ci --production

# Copy application code
COPY index.js .
COPY student-view.html .

EXPOSE 8080

CMD ["node", "index.js"]
