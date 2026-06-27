import amqplib from 'amqplib';
import { config } from '../config/index.js';


let channel: amqplib.Channel | null = null;


export async function connectRabbitMQ(): Promise<void> {
    try {
        const connection = await amqplib.connect(config.rabbitmqUrl);
        channel = await connection.createChannel();
        await channel.assertExchange('user.events', 'topic', { durable: true });
        console.log('Connected to RabbitMQ');
    } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error);
    }
}


export async function publishUserCreated(user: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    about: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
}): Promise<void> {
    if (!channel) {
        console.warn('RabbitMQ channel not available, skipping event');
        return;
    }
    try {
        channel.publish(
            'user.events',
            'user.created',
            Buffer.from(JSON.stringify(user)),
            { persistent: true }
        );
        console.log('Published user.created event for user:', user.id);
    } catch (error) {
        console.error('Failed to publish user.created event:', error);
    }
}


export async function closeRabbitMQ(): Promise<void> {
    if (channel) {
        await channel.close();
    }
}