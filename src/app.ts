import express from 'express'

export const createApp = () => {
    const app = express()

    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'OK', 
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        })
    })

    return app
}
