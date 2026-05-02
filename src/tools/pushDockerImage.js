const { execSync } = require("child_process");
const axios = require("axios");

async function pushDockerImage(context) {
    const { imageTag, dockerUsername, dockerPassword, renderWebhook } = context;

    const username = dockerUsername || process.env.DOCKERHUB_USERNAME;
    const password = dockerPassword || process.env.DOCKERHUB_PASSWORD;

    console.log("🔐 Logging into Docker Hub...");

    if (password) {
        try {
            execSync(
                `docker login -u "${username}" --password-stdin`,
                { 
                    input: password,
                    stdio: ["pipe", "inherit", "inherit"] 
                }
            );
        } catch (e) {
            console.log("⚠️ Docker login failed with provided credentials, attempting to use host auth...");
        }
    } else {
        console.log("⚠️ No Docker password provided, relying on existing host auth.");
    }

    console.log("📤 Pushing image...");

    execSync(`docker push ${imageTag}`, {
        stdio: "inherit"
    });

    console.log("✅ Image pushed");

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