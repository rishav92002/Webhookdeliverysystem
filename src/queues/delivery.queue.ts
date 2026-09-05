import {Queue} from "bullmq";
import { redis } from "../config/redis.js";

const deliveryQueue = new Queue('delivery-queue',{connection: redis});


interface jobProp {

}
export const addJob = async(job:jobProp) =>{
    
}