require("dotenv").config();

const express = require("express");
const { loadEnv } = require("./config/env");

const createPlanner = require("./agent/planner");
const executeStep = require("./agent/executor");
const runAgent = require("./agent/controller");

const env = loadEnv();

const app = express();
app.use(express.json());

// 🔧 Initialize
let planner;

(async () => {
  planner = await createPlanner({
    groqApiKey: env.GROQ_API_KEY,
    devMode: env.DEV_MODE
  });
})();

app.post("/run", async (req, res) => {
  try {
    const { goal, dockerUsername, dockerPassword, githubRepo, gitToken, renderWebhook, imageName } = req.body;

    if (!goal || !githubRepo) {
      return res.status(400).json({ error: "Goal and githubRepo required" });
    }

    const result = await runAgent({
      goal,
      dockerUsername,
      dockerPassword,
      githubRepo,
      gitToken,
      renderWebhook,
      imageName
    }, {
      planner,
      executor: executeStep
    });

    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Agent failed" });
  }
});

app.listen(env.PORT || 3000, () => {
  console.log("🚀 Server running");
});