const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const fixDockerfile = require("./fixDockerfile");

async function buildDockerImage(context) {
    const { repoPath, dockerPassword, jobId, logger } = context;

    if (!repoPath) {
        throw new Error("repoPath missing in context");
    }

    const dockerUsername = context.dockerUsername || process.env.DOCKERHUB_USERNAME;
    const imageName = context.imageName || process.env.DOCKER_IMAGE_NAME || "devops-agent-image";
    const imageTag = `${dockerUsername}/${imageName}:latest`;
    const dockerfilePath = path.join(repoPath, "Dockerfile");

    // 🔒 Generate Kaniko Auth Config
    let kanikoConfigPath = null;
    if (dockerPassword) {
        const authString = Buffer.from(`${dockerUsername}:${dockerPassword}`).toString("base64");
        const configJson = {
            auths: {
                "https://index.docker.io/v1/": { auth: authString }
            }
        };
        kanikoConfigPath = path.join(process.cwd(), `tmp-auth-${jobId || "default"}.json`);
        fs.writeFileSync(kanikoConfigPath, JSON.stringify(configJson));
    }

    let retries = 2;

    while (retries >= 0) {
        try {
            console.log("🏗️ Building Docker image with Kaniko...");

            const args = [
                "run", "--rm",
                "-v", `${repoPath}:/workspace`
            ];

            if (kanikoConfigPath) {
                args.push("-v", `${kanikoConfigPath}:/kaniko/.docker/config.json:ro`);
            }

            args.push(
                "gcr.io/kaniko-project/executor:latest",
                "--dockerfile", "Dockerfile",
                "--destination", imageTag,
                "--context", "dir:///workspace"
            );

            await new Promise((resolve, reject) => {
                const child = spawn("docker", args, { stdio: "pipe" });

                let errorOutput = "";

                child.stdout.on("data", (data) => {
                    const line = data.toString().trim();
                    if (line) {
                        process.stdout.write(data);
                        if (logger) logger.log(line, "info");
                    }
                });

                child.stderr.on("data", (data) => {
                    const line = data.toString().trim();
                    if (line) {
                        process.stderr.write(data);
                        if (logger) logger.log(line, "error");
                        errorOutput += data.toString();
                    }
                });

                child.on("close", (code) => {
                    if (code === 0) resolve();
                    else reject(new Error(errorOutput || `Kaniko failed with code ${code}`));
                });
            });

            console.log("✅ Docker image built and pushed:", imageTag);
            
            // 🔗 Update deep link in Firestore
            const dockerHubUrl = `https://hub.docker.com/r/${dockerUsername}/${imageName}`;
            if (logger) {
                await logger.updateStatus("in-progress", { dockerHubUrl });
            }

            if (kanikoConfigPath && fs.existsSync(kanikoConfigPath)) {
                fs.unlinkSync(kanikoConfigPath);
            }
            return { imageTag, dockerHubUrl };

        } catch (err) {
            console.error("❌ Docker build failed");

            const errorOutput = err.message;
            console.log("🔍 Build Error:\n", errorOutput);

            if (retries === 0) {
                if (kanikoConfigPath && fs.existsSync(kanikoConfigPath)) {
                    fs.unlinkSync(kanikoConfigPath);
                }
                throw err;
            }

            let dockerfile = fs.readFileSync(dockerfilePath, "utf-8");
            const lockFilePath = path.join(repoPath, "package-lock.json");

            if (!fs.existsSync(lockFilePath)) {
                console.log("🧠 No package-lock.json → switching to npm install");
                dockerfile = dockerfile.replace(/npm ci/g, "npm install");
            } else if (errorOutput.includes("npm ci") && errorOutput.includes("package-lock")) {
                console.log("🧠 npm ci failed → adding fallback");
                dockerfile = dockerfile.replace(/npm ci/g, "npm ci || npm install --omit=dev");
            } else if (errorOutput.includes("not found") || errorOutput.includes("apk")) {
                console.log("🧠 Alpine issue → switching to node:18");
                dockerfile = dockerfile.replace("node:18-alpine", "node:18");
                fs.writeFileSync(dockerfilePath, dockerfile);
            } else {
                console.log("🤖 Using LLM to fix Dockerfile...");
                dockerfile = await fixDockerfile(
                    dockerfile,
                    [`Docker build failed:\n${errorOutput}`],
                    { groqApiKey: process.env.GROQ_API_KEY }
                );
            }

            fs.writeFileSync(dockerfilePath, dockerfile);
            retries--;
            console.log("🔁 Retry build attempt:", 2 - retries);
        }
    }
}

module.exports = buildDockerImage;