import { createApp } from './app.js';

const app = createApp();
const PORT = parseInt(process.env.PORT || '3003');

app.listen(PORT, () => {
  console.log(`Directory Service запущен на порту ${PORT}`);
});