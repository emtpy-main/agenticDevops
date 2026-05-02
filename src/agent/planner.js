const axios = require("axios");
const { z } = require("zod");

// 🔒 Allowed steps schema
const PlanSchema = z.array(
    z.object({
        step: z.enum([
            "clone_repo",
            "analyze_repo",
            "create_dockerignore",
            "generate_dockerfile",
            "build_docker",
            "push_docker",
            "prepare_deploy",
            "git_push",
            "trigger_deploy",
            "validate_deploy"
        ])
    })
);

function createPlanner({ groqApiKey , devMode }) {
    return async function plan(goal) {
        console.log("🧠 Generating plan via Groq...");

        if (devMode === "true") {
            console.log("⚡ DEV MODE: Skipping Groq");

            const mockPlan = [
                { step: "clone_repo" },
                { step: "analyze_repo" },
                { step: "create_dockerignore" },
                { step: "generate_dockerfile" }
            ];

            return PlanSchema.parse(mockPlan);
        }

        const prompt = `
You are a DevOps planner.

Return ONLY a valid JSON array. No explanation, no markdown.

Each element MUST be:
{ "step": "<allowed_step>" }

Allowed steps ONLY:
clone_repo
analyze_repo
generate_dockerfile
build_docker
push_docker
prepare_deploy
git_push
trigger_deploy
validate_deploy

If you output anything else, the system will reject it.

Goal: ${goal}
`;

        try {
            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: "llama-3.1-8b-instant",
                    messages: [
                        {
                            role: "system",
                            content:
                                "You ONLY output valid JSON arrays. No text. No markdown. No explanation."
                        },
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

            let raw = response.data?.choices?.[0]?.message?.content;

            if (!raw) {
                throw new Error("Empty response from LLM");
            }

            console.log("📥 Raw LLM Output:", raw);

            // 🧹 Clean common LLM mistakes
            raw = raw.trim();
            raw = raw.replace(/```json|```/g, "");

            // 🛑 Strict JSON parse
            let parsed;
            try {
                parsed = JSON.parse(raw);
            } catch (e) {
                throw new Error("Invalid JSON from LLM");
            }

            // 🔒 Validate steps strictly
            const validated = PlanSchema.parse(parsed);

            return validated;
        } catch (err) {
            console.error(
                "❌ Planner failed:",
                err.response?.data || err.message
            );
            throw err;
        }
    };
}

module.exports = createPlanner;