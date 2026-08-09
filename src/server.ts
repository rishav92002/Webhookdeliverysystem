import app from "./app.js";
import { config } from "./config/config.js";
import {prisma} from "./lib/prisma.js";


async function start() {
    const result = await prisma.$queryRaw`SELECT 1`;
  
    console.log('Database connection:', result);
  
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });
  }
  
  start();