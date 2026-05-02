const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const fixDockerfile = require("./fixDockerfile");

async function buildDockerImage(context) {
    const { repoPath } = context;

    if (!repoPath) {
        throw new Error("repoPath missing in context");
    }

    const dockerUsername = context.dockerUsername || process.env.DOCKERHUB_USERNAME;
    const imageName = context.imageName || process.env.DOCKER_IMAGE_NAME || "devops-agent-image";
    const imageTag = `${dockerUsername}/${imageName}:latest`;
    const dockerfilePath = path.join(repoPath, "Dockerfile");

    let retries = 2;

    while (retries >= 0) {
        try {
            console.log("🏗️ Building Docker image...");

            execSync(`docker build -t ${imageTag} .`, {
                cwd: repoPath,
                stdio: "pipe" // capture logs
            });

            console.log("✅ Docker image built:", imageTag);
            return { imageTag };

        } catch (err) {
            console.error("❌ Docker build failed");

            const errorOutput =
                err.stderr?.toString() ||
                err.stdout?.toString() ||
                err.message;

            console.log("🔍 Build Error:\n", errorOutput);

            if (retries === 0) {
                throw err;
            }

            let dockerfile = fs.readFileSync(dockerfilePath, "utf-8");

            const lockFilePath = path.join(repoPath, "package-lock.json");

            // ===============================
            // 🧠 RULE 1: No lockfile → use npm install
            // ===============================
            if (!fs.existsSync(lockFilePath)) {
                console.log("🧠 No package-lock.json → switching to npm install");

                dockerfile = dockerfile.replace(/npm ci/g, "npm install");

            }

            // ===============================
            // 🧠 RULE 2: npm ci failure → fallback
            // ===============================
            else if (
                errorOutput.includes("npm ci") &&
                errorOutput.includes("package-lock")
            ) {
                console.log("🧠 npm ci failed → adding fallback");

                dockerfile = dockerfile.replace(
                    /npm ci/g,
                    "npm ci || npm install --omit=dev"
                );
            }
            else if (errorOutput.includes("not found") || errorOutput.includes("apk")) {
                console.log("🧠 Alpine issue → switching to node:18");

                dockerfile = dockerfile.replace("node:18-alpine", "node:18");

                fs.writeFileSync(dockerfilePath, dockerfile);
            }
            // ===============================
            // 🤖 LLM fallback (last resort)
            // ===============================
            else {
                console.log("🤖 Using LLM to fix Dockerfile...");

                dockerfile = await fixDockerfile(
                    dockerfile,
                    [`Docker build failed:\n${errorOutput}`],
                    { groqApiKey: process.env.GROQ_API_KEY }
                );
            }

            // Save updated Dockerfile
            fs.writeFileSync(dockerfilePath, dockerfile);

            retries--;

            console.log("🔁 Retry build attempt:", 2 - retries);
        }
    }
}

module.exports = buildDockerImage;