import crypto from "node:crypto"


export const generateApikey = () =>{
    const apiKey = crypto.randomBytes(32).toString('hex');
    const hashedKey = generateHash(apiKey);
    return {apiKey,hashedKey}
}

export const generateHash = (apiKey:string) =>{
    return crypto.createHash('sha256').update(apiKey).digest('hex');
}