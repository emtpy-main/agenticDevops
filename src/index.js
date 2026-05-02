require("dotenv").config();

const express = require("express");
const { loadEnv } = require("./config/env");

const { connectQueue, addJob } = require("./queue");

const env = loadEnv();

const app = express();
app.use(express.json());

// 🔧 Initialize Queue
(async () => {
  await connectQueue();
})();

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

app.listen(env.PORT || 3000, () => {
  console.log("🚀 Server running");
});