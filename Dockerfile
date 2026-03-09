FROM node:18-alpine

WORKDIR /app

# Копіюємо package files
COPY package*.json ./

# Встановлюємо залежності
RUN npm install --production

# Копіюємо файли додатку
COPY server.js .
COPY index.html .
COPY app.js .
COPY tests.json .
COPY img ./img

# Створюємо том для збереження результатів
VOLUME ["/app/data"]

# Відкриваємо порт 80
EXPOSE 80

CMD ["node", "server.js"]
