async function runAgent(payload, { planner, executor, logger }) {
  console.log("🚀 Agent started:", payload.goal);

  const plan = await planner(payload.goal);
  console.log("📋 Plan:", plan);

  const context = {
    repoUrl: payload.githubRepo,
    dockerUsername: payload.dockerUsername,
    dockerPassword: payload.dockerPassword,
    gitToken: payload.gitToken,
    renderWebhook: payload.renderWebhook,
    imageName: payload.imageName,
    jobId: payload.jobId,
    logger
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
      
      await logger.updateStatus("failed", { 
        error: err.message, 
        failedStep: step.step,
        failedAt: new Date().toISOString()
      });

      // 🧹 Auto-cleanup logs after 1 hour on failure
      setTimeout(() => {
        logger.deleteLogs().catch(console.error);
      }, 60 * 60 * 1000);

      throw err;
    }
  }

  console.log("🚀 Run command:");
    console.log(`docker run -p 3000:${context.containerPort} <image>`);
  
  await logger.updateStatus("success", { 
    containerPort: context.containerPort,
    completedAt: new Date().toISOString() 
  });

  // 🧹 Auto-cleanup logs after 3 minutes on success
  setTimeout(() => {
    logger.deleteLogs().catch(console.error);
  }, 3 * 60 * 1000);

  return { status: "success" };
}

module.exports = runAgent;