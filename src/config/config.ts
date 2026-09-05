import 'dotenv/config';

export const config = {
    port: Number(process.env.PORT?? 5000),
    redisPort: Number(process.env.REDIS_PORT),
    redisHost: process.env.REDIS_HOST,
    redisurl: process.env.REDIS_URL,
}
