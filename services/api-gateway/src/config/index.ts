const requiredEnv = [
    'PORT',
    'USER_SERVICE_URL',
    'RECIPE_SERVICE_URL',
    'JWT_SECRET',
];

const missing = requiredEnv.filter((name) => !process.env[name]);

if (missing.length > 0) {
    throw new Error(`Отсутствуют необходимые env-переменные: ${missing.join(', ')}`);
}

export const config = {
    port: Number(process.env.PORT),
    services: {
        user: process.env.USER_SERVICE_URL as string,
        recipe: process.env.RECIPE_SERVICE_URL as string
    },
    jwtSecret: process.env.JWT_SECRET as string,
};
