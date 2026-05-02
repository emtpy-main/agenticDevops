const fs = require("fs");
const path = require("path");
const axios = require("axios");

const validateDockerfile = require("../utils/validateDockerfile");
const fixDockerfile = require("./fixDockerfile");

async function generateDockerfile(context, { groqApiKey }) {
    const { repoPath, projectType, buildCommand, startCommand, outputDir } = context;

    if (!repoPath) {
        throw new Error("repoPath missing");
    }

    const dockerfilePath = path.join(repoPath, "Dockerfile");

    console.log("🐳 Generating Dockerfile...");

    // =========================================================
    // ⚛️ REACT PROJECT → BYPASS LLM (IMPORTANT)
    // =========================================================
    if (projectType === "react") {
        console.log("⚛️ Detected React project → using Nginx build");
        const nodeBase = `node:${context.nodeVersion || "18"}-alpine`;
        const dockerfile = `
FROM ${nodeBase} AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/${outputDir || "build"} /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
`;

        fs.writeFileSync(dockerfilePath, dockerfile.trim());

        console.log("✅ React Dockerfile created");

        return { dockerfilePath, containerPort: 80 };
    }

    // =========================================================
    // 🧠 BACKEND → USE LLM
    // =========================================================

    const prompt = `
Generate a production-ready Dockerfile.

Project Type: ${projectType}
Build Command: ${buildCommand || "none"}
Start Command: ${startCommand}

RULES:
- Output ONLY Dockerfile
- No explanations
- Use Node 18+
- Prefer node:18-alpine
- Use npm ci OR fallback npm install
`;

    const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            model: "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: "Only output Dockerfile." },
                { role: "user", content: prompt }
            ],
            temperature: 0
        },
        {
            headers: {
                Authorization: `Bearer ${groqApiKey}`,
                "Content-Type": "application/json"
            }
        }
    );

    let dockerfile = response.data.choices[0].message.content;

    // 🔒 CLEAN
    dockerfile = dockerfile
        .replace(/```dockerfile/gi, "")
        .replace(/```/g, "")
        .trim();

    // 🔥 FILTER
    dockerfile = dockerfile
        .split("\n")
        .filter(line => {
            const t = line.trim();
            return (
                t.startsWith("FROM") ||
                t.startsWith("WORKDIR") ||
                t.startsWith("COPY") ||
                t.startsWith("RUN") ||
                t.startsWith("EXPOSE") ||
                t.startsWith("ENV")
            );
        })
        .join("\n");

    // ===============================
    // 🧠 REMOVE BUILD STEP IF NOT NEEDED
    // ===============================
    if (!buildCommand) {
        console.log("🧠 No build command → removing build steps");

        dockerfile = dockerfile
            .split("\n")
            .filter(line => {
                const t = line.trim();

                return !(
                    t.includes("npm run build") ||
                    t.includes("build --prod") ||
                    t.includes("RUN build")
                );
            })
            .join("\n");
    }
    // 🔁 VALIDATION LOOP
    let retries = 2;

    while (retries >= 0) {
        const errors = validateDockerfile(dockerfile);

        if (errors.length === 0) break;

        dockerfile = await fixDockerfile(dockerfile, errors, { groqApiKey });

        retries--;
    }

    // =========================================================
    // 🧠 CMD FIX (ONLY FOR BACKEND)
    // =========================================================

    dockerfile = dockerfile
        .split("\n")
        .filter(line => !line.trim().startsWith("CMD"))
        .join("\n");

    let finalCmd;

    if (startCommand) {
        finalCmd = `CMD ["sh", "-c", "${startCommand}"]`;
    } else {
        finalCmd = `CMD ["node", "index.js"]`;
    }

    dockerfile += `\n${finalCmd}\n`;

    // 💾 SAVE
    fs.writeFileSync(dockerfilePath, dockerfile);

    console.log("✅ Backend Dockerfile saved");

    return { dockerfilePath, containerPort: 3000 };
}

module.exports = generateDockerfile;