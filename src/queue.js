const amqplib = require("amqplib");
const { v4: uuidv4 } = require("uuid");
const runAgent = require("./agent/controller");
const createPlanner = require("./agent/planner");
const executeStep = require("./agent/executor");
const { loadEnv } = require("./config/env");
const createLogger = require("./utils/logger");

let channel, connection;

async function connectQueue() {
    try {
        const env = loadEnv();
        const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://localhost";
        // Increase heartbeat to 60s to prevent timeouts during long builds
        connection = await amqplib.connect(`${rabbitmqUrl}?heartbeat=60`);
        
        connection.on("error", (err) => {
            if (err.message !== "Connection closing") {
                console.error("[RabbitMQ] Connection error:", err.message);
            }
        });

        connection.on("close", () => {
            console.warn("[RabbitMQ] Connection closed. Attempting to reconnect in 5s...");
            setTimeout(connectQueue, 5000);
        });

        channel = await connection.createChannel();
        
        channel.on("error", (err) => {
            console.error("[RabbitMQ] Channel error:", err.message);
        });

        await channel.assertQueue("agent_jobs");
        
        // Strictly limit to 4 concurrent Kaniko builds
        channel.prefetch(4);
        
        channel.consume("agent_jobs", async (data) => {
            if (data !== null) {
                const payload = JSON.parse(Buffer.from(data.content));
                const logger = createLogger(payload.jobId);
                console.log(`\n[Queue] 🚀 Starting job: ${payload.jobId}`);
                
                try {
                    await logger.updateStatus("in-progress");

                    const env = loadEnv();
                    const planner = await createPlanner({
                        groqApiKey: env.GROQ_API_KEY,
                        devMode: env.DEV_MODE
                    });
                    
                    await runAgent(payload, { planner, executor: executeStep, logger });
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
