const { spawn } = require("child_process");
const path = require("path");

async function buildDockerImage(context) {
    const { repoPath, dockerPassword, logger } = context;
    if (!repoPath) throw new Error("repoPath missing");

    const dockerUsername = (context.dockerUsername || process.env.DOCKERHUB_USERNAME || "").trim().replace(/^"|"$/g, '');
    const cleanPassword = (dockerPassword || "").trim().replace(/^"|"$/g, '');
    const imageName = context.imageName || process.env.DOCKER_IMAGE_NAME || "devops-agent-image";
    const imageTag = `${dockerUsername}/${imageName}:latest`;

    const runCmd = (cmd, args, cwd) => {
        return new Promise((resolve, reject) => {
            const child = spawn(cmd, args, { cwd });
            let output = "";
            child.stdout.on("data", (d) => {
                const line = d.toString().trim();
                if (line) {
                    process.stdout.write(d);
                    if (logger) logger.log(line, "info");
                }
            });
            child.stderr.on("data", (d) => {
                const line = d.toString().trim();
                if (line) {
                    process.stderr.write(d);
                    if (logger) logger.log(line, "error");
                    output += d.toString();
                }
            });
            child.on("close", (code) => code === 0 ? resolve() : reject(new Error(output)));
        });
    };

    try {
        console.log(`🐳 Logging into Docker Hub as ${dockerUsername}...`);
        await runCmd("sh", ["-c", `echo "${cleanPassword}" | docker login --username "${dockerUsername}" --password-stdin`]);

        console.log(`🏗️ Building image: ${imageTag} (Native Mode)...`);
        await runCmd("docker", ["build", "-t", imageTag, "."], repoPath);

        console.log(`📤 Pushing image...`);
        await runCmd("docker", ["push", imageTag]);

        console.log("✅ Build and Push Succeeded!");
        return { imageTag, dockerHubUrl: `https://hub.docker.com/r/${dockerUsername}/${imageName}` };

    } catch (err) {
        console.error("❌ Docker operation failed:", err.message);
        throw err;
    }
}

module.exports = buildDockerImage;