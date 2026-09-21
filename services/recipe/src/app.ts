import express from 'express';
import morgan from 'morgan';

import './validation.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';


export const createApp = () => {
    const app = express();

    app.use(morgan('dev'));
    app.use(express.json());
    app.use('/api', routes);
    app.use(errorHandler);
    return app;
}
