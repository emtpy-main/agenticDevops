async function runAgent(payload, { planner, executor }) {
  console.log("🚀 Agent started:", payload.goal);

  const plan = await planner(payload.goal);
  console.log("📋 Plan:", plan);

  const context = {
    repoUrl: payload.githubRepo,
    dockerUsername: payload.dockerUsername,
    dockerPassword: payload.dockerPassword,
    gitToken: payload.gitToken,
    renderWebhook: payload.renderWebhook,
    imageName: payload.imageName
  };

  for (const step of plan) {
    try {
      const result = await executor(step, context);

      // 🔥 Merge results safely
      if (result && typeof result === "object") {
        Object.assign(context, result);
      }

      // 🔥 EXTRA: log context evolution (VERY USEFUL)
      console.log("🧠 Context after step:", step.step);
      console.log(context);

    } catch (err) {
      console.error("❌ Step failed:", step.step);
      console.error(err.message);
      throw err;
    }
  }

  console.log("🚀 Run command:");
    console.log(`docker run -p 3000:${context.containerPort} <image>`);
  return { status: "success" };
}

module.exports = runAgent;