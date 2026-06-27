import { createApp } from './app.js';
import { initConsumer } from './config/rabbitmq.js';

const app = createApp();
const PORT = parseInt(process.env.PORT || '3004');

// Запускаем RabbitMQ consumer
initConsumer().catch(console.error);

app.listen(PORT, () => {
  console.log(`Social Service запущен на порту ${PORT}`);
});