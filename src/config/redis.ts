import { config } from './config.js'

import {Redis} from 'ioredis'

export const redis = new Redis(config.redisurl?? 'redis://localhost:6379');