import { createApp } from './app.js';

const app = createApp();
const PORT = parseInt(process.env.PORT || '3000');

app.listen(PORT, () => {
  console.log(`API Gateway запущен на порту ${PORT}`);
});