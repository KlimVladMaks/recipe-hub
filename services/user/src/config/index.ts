const requiredEnv = [
    'PORT',
    'JWT_SECRET',
];

const missing = requiredEnv.filter((name) => !process.env[name]);

if (missing.length > 0) {
    throw new Error(`Отсутствуют необходимые env-переменные: ${missing.join(', ')}`);
}

export const config = {
    port: Number(process.env.PORT),
    jwt: {
        secret: process.env.JWT_SECRET as string,
        expiresIn: "1d"
    },
    rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
}
