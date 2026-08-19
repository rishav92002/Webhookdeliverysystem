import express from "express";
import eventRoutes from "./routes/event.route.js"
import customerRoutes from "./routes/customer.route.js"
import endpointRoutes from "./routes/endpoint.route.js"
import { authenticateCustomer } from "./middleware/auth.middleware.js"



const app = express();
app.use(express.json());
app.use('/api/customer',customerRoutes)
app.use('/api/event', authenticateCustomer, eventRoutes)
app.use('/api/endpoint', authenticateCustomer, endpointRoutes)

app.get("/", (req, res) => {
    res.send("Hello World");
});





export default app;