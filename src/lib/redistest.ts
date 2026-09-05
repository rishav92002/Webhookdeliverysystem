import {redis} from '../config/redis.js'

export const redisTest = async () => {
    await redis.set('test', 'Hello World');
    const value = await redis.get('test');
    console.log(value);
}

redisTest();