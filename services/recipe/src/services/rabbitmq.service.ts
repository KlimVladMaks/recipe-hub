import amqplib from 'amqplib';
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';


let channel: amqplib.Channel | null = null;


export async function connectRabbitMQ(): Promise<void> {
    try {
        const connection = await amqplib.connect(config.rabbitmqUrl);
        channel = await connection.createChannel();
        await channel.assertExchange('user.events', 'topic', { durable: true });
        
        const queue = await channel.assertQueue('recipe-service.user.sync', { durable: true });
        await channel.bindQueue(queue.queue, 'user.events', 'user.created');
        
        channel.consume(queue.queue, async (msg) => {
            if (!msg) return;
            
            try {
                const userData = JSON.parse(msg.content.toString());
                console.log('Received user.created event:', userData.id);
                
                // Сохраняем пользователя в локальную БД recipe-service
                await prisma.user.upsert({
                    where: { id: userData.id },
                    update: {
                        username: userData.username,
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        about: userData.about,
                        role: userData.role,
                    },
                    create: {
                        id: userData.id,
                        username: userData.username,
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        about: userData.about,
                        role: userData.role,
                    },
                });
                
                console.log('User synced to recipe-service:', userData.id);
                channel.ack(msg);
            } catch (error) {
                console.error('Error processing user.created event:', error);
                channel.nack(msg, false, true);
            }
        });
        
        console.log('RabbitMQ consumer started for recipe-service');
    } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error);
    }
}


export async function closeRabbitMQ(): Promise<void> {
    if (channel) {
        await channel.close();
    }
}