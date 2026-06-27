import amqplib from 'amqplib';

const EXCHANGE = 'recipe.events';
const QUEUE = 'social-service.queue';

let channel: amqplib.Channel | null = null;

export async function initConsumer() {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    const conn = await amqplib.connect(url);
    channel = await conn.createChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    const q = await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(q.queue, EXCHANGE, 'recipe.created');
    await channel.consume(q.queue, (msg) => {
      if (msg) {
        try {
          const data = JSON.parse(msg.content.toString());
          console.log('[RabbitMQ] Получено событие:', data);
          // Здесь можно обработать событие, например, обновить кэш ленты
          channel!.ack(msg);
        } catch (error) {
          console.error('[RabbitMQ] Ошибка обработки сообщения:', error);
          channel!.nack(msg, false, false);
        }
      }
    });
    console.log('[RabbitMQ] Consumer запущен');
  } catch (error) {
    console.error('[RabbitMQ] Ошибка инициализации consumer:', error);
  }
}