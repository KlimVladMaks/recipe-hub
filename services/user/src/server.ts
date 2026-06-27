import { createApp } from './app';
import { config } from './config';
import { connectRabbitMQ } from './services/rabbitmq.service.js';

const app = createApp();

// Подключаемся к RabbitMQ перед запуском сервера
connectRabbitMQ().then(() => {
    app.listen(config.port, () => {
        console.log(`user-service запущен на порту ${config.port}`);
    });
}).catch((error) => {
    console.error('Failed to start user-service:', error);
    // Всё равно запускаем сервер, даже если RabbitMQ недоступен
    app.listen(config.port, () => {
        console.log(`user-service запущен на порту ${config.port} (без RabbitMQ)`);
    });
});
