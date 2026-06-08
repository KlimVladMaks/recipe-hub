import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, () => {
    console.log(`recipe-service запущен на порту ${config.port}`);
});
