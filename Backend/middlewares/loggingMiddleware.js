// Request Logger Middleware to log API calls

module.exports = (req, res, next) => {
    const start = Date.now();
    const { method, originalUrl, ip } = req;
    
    // Once headers are sent, log the result
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        
        let statusEmoji = 'ℹ️';
        if (statusCode >= 500) statusEmoji = '💥';
        else if (statusCode >= 400) statusEmoji = '⚠️';
        else if (statusCode >= 300) statusEmoji = '🔄';
        else if (statusCode >= 200) statusEmoji = '✅';

        console.log(`[${new Date().toISOString()}] ${statusEmoji} ${method} ${originalUrl} - Status: ${statusCode} - IP: ${ip} - Duration: ${duration}ms`);
    });

    next();
};
