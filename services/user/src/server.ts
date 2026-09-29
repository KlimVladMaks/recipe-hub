import 'dotenv/config';

import { createApp } from './app.js';
import { config } from './config/index.js';
import { connectRabbitMQ } from './services/eventBus.js';
import { ensureAdminUser } from './services/adminBootstrap.js';

const app = createApp();

// Подключаемся к RabbitMQ (неблокирующе)
connectRabbitMQ();

async function start() {
    // Гарантируем наличие bootstrap-админа (если заданы ADMIN_USERNAME/ADMIN_PASSWORD)
    await ensureAdminUser();

    app.listen(config.port, () => {
        console.log(`user-service запущен на порту ${config.port}`);
    });
}

void start();
