const fs = require("fs");
const path = require("path");

async function runAgent(payload, { planner, executor, logger }) {
  console.log("🚀 Agent started:", payload.goal);

  const plan = await planner(payload.goal);
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

  try {
    for (const step of plan) {
      try {
        const result = await executor(step, context);
        if (result && typeof result === "object") {
          Object.assign(context, result);
        }
      } catch (err) {
        console.error("❌ Step failed:", step.step);
        await logger.updateStatus("failed", { 
          error: err.message, 
          failedStep: step.step,
          failedAt: new Date().toISOString()
        });

        // Delete logs after 1 hour on failure
        setTimeout(() => { logger.deleteLogs().catch(console.error); }, 60 * 60 * 1000);
        throw err;
      }
    }

    await logger.updateStatus("success", { 
      containerPort: context.containerPort,
      completedAt: new Date().toISOString() 
    });

    // Delete logs after 3 minutes on success
    setTimeout(() => { logger.deleteLogs().catch(console.error); }, 3 * 60 * 1000);
    return { status: "success" };

  } finally {
    // 🧹 DISK CLEANUP: Delete the repository folder to save space
    if (context.repoPath && fs.existsSync(context.repoPath)) {
      console.log(`🧹 Cleaning up disk space for job: ${payload.jobId}`);
      try {
        fs.rmSync(context.repoPath, { recursive: true, force: true });
        console.log("✅ Repository folder deleted.");
      } catch (cleanupErr) {
        console.error("⚠️ Failed to delete repo folder:", cleanupErr.message);
      }
    }
  }
}

module.exports = runAgent;