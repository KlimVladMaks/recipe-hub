import amqplib from 'amqplib';

const EXCHANGE = 'recipe.events';
const EXCHANGE_TYPE = 'topic';

let channel: amqplib.Channel | null = null;

export async function getChannel(): Promise<amqplib.Channel> {
  if (channel) return channel;
  const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  const conn = await amqplib.connect(url);
  channel = await conn.createChannel();
  await channel.assertExchange(EXCHANGE, EXCHANGE_TYPE, { durable: true });
  return channel;
}

export async function publishEvent(routingKey: string, data: object) {
  try {
    const ch = await getChannel();
    ch.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(data)), { persistent: true });
    console.log(`[RabbitMQ] Событие отправлено: ${routingKey}`, data);
  } catch (error) {
    console.error('[RabbitMQ] Ошибка публикации события:', error);
  }
}