import 'dotenv/config';

import { createApp } from './app.js';
import { config } from './config/index.js';
import { connectRabbitMQ } from './services/eventBus.js';

const app = createApp();

// Подключаемся к RabbitMQ (неблокирующе)
connectRabbitMQ();

app.listen(config.port, () => {
    console.log(`recipe-service запущен на порту ${config.port}`);
});
