import { createProxyMiddleware } from 'http-proxy-middleware';


export const createProxy = (target: string) => {
    return createProxyMiddleware({
        target,
        changeOrigin: true,
    });
};
