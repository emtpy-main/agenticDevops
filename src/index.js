require("dotenv").config();

const express = require("express");
const { loadEnv } = require("./config/env");
const cors = require("cors");
const { connectQueue, addJob } = require("./queue");
const createLogger = require("./utils/logger");
const http = require('http')
const { Server } = require('socket.io')


const env = loadEnv();

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite default port
    methods: ["GET", "POST"]
  }
});

app.use(cors());

// 🔧 Initialize Queue
(async () => {
  await connectQueue();
})();

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

app.post("/run", async (req, res) => {
  try {
    const { goal, dockerUsername, dockerPassword, githubRepo, gitToken, renderWebhook, imageName } = req.body;

    if (!goal || !githubRepo) {
      return res.status(400).json({ error: "Goal and githubRepo required" });
    }

    const jobId = await addJob({
      goal,
      dockerUsername,
      dockerPassword,
      githubRepo,
      gitToken,
      renderWebhook,
      imageName
    });

    // 🚀 Initialize Job in Firestore
    const logger = createLogger(jobId);
    await logger.updateStatus("queued", {
      goal,
      githubRepo,
      dockerUsername,
      imageName,
      createdAt: new Date().toISOString()
    });

    res.json({
      status: "queued",
      message: "message waiting currently server have load",
      jobId
    });



  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Agent failed" });
  }
});

app.get('/', (req, res) => {
  res.json({ status: "Agentic DevOps is Running", version: "1.0.0" });
});

server.listen(env.PORT || 5000, () => {
  console.log(`Server running on port ${env.PORT}`);
});