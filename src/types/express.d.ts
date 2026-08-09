declare global {
    namespace Express {
      interface Request {
        customerId?: string; // optional — only set after auth
      }
    }
  }
 export {}; 