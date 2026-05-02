const { execSync } = require("child_process");
const axios = require("axios");

async function pushDockerImage(context) {
    const { renderWebhook } = context;

    console.log("✅ Image was already pushed successfully by Kaniko!");

    const webhook = renderWebhook || process.env.RENDER_DEPLOY_HOOK;
    if (webhook) {
        try {
            console.log("🚀 Triggering Render deploy...");

            await axios.post(webhook);

            console.log("✅ Render redeploy triggered");
        } catch (err) {
            console.error("❌ Failed to trigger Render deploy");
            console.error(err.message);
        }
    }
    return {};
}

module.exports = pushDockerImage;