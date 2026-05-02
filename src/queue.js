const amqplib = require("amqplib");
const { v4: uuidv4 } = require("uuid");
const runAgent = require("./agent/controller");
const createPlanner = require("./agent/planner");
const executeStep = require("./agent/executor");
const { loadEnv } = require("./config/env");

let channel, connection;

async function connectQueue() {
    try {
        connection = await amqplib.connect("amqp://localhost");
        channel = await connection.createChannel();
        await channel.assertQueue("agent_jobs");
        
        // Strictly limit to 4 concurrent Kaniko builds
        channel.prefetch(4);
        
        channel.consume("agent_jobs", async (data) => {
            if (data !== null) {
                const payload = JSON.parse(Buffer.from(data.content));
                console.log(`\n[Queue] 🚀 Starting job: ${payload.jobId}`);
                
                try {
                    const env = loadEnv();
                    const planner = await createPlanner({
                        groqApiKey: env.GROQ_API_KEY,
                        devMode: env.DEV_MODE
                    });
                    
                    await runAgent(payload, { planner, executor: executeStep });
                    console.log(`[Queue] ✅ Completed job: ${payload.jobId}`);
                    channel.ack(data);
                } catch (err) {
                    console.error(`[Queue] ❌ Failed job: ${payload.jobId}`);
                    console.error(err.message);
                    channel.ack(data);
                }
            }
        });
        
        console.log("🐰 RabbitMQ Connected & Listening on 'agent_jobs' (Prefetch: 4)");
    } catch (error) {
        console.error("RabbitMQ connection failed. Ensure RabbitMQ is running:", error.message);
    }
}

async function addJob(payload) {
    const jobId = uuidv4();
    payload.jobId = jobId;
    
    if (!channel) {
        throw new Error("RabbitMQ channel not available");
    }
    
    channel.sendToQueue("agent_jobs", Buffer.from(JSON.stringify(payload)));
    return jobId;
}

module.exports = { connectQueue, addJob };
