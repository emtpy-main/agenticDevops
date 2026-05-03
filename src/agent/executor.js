const cloneRepo = require("../tools/cloneRepo");
const analyzeRepo = require("../tools/analyzeRepo");
const generateDockerfile = require("../tools/generateDockerfile");
const buildDockerImage = require("../tools/buildDockerImage");
const pushDockerImage = require("../tools/pushDockerImage");
const prepareDeploymentConfig = require("../tools/prepareDeploymentConfig");
const safeGitPush = require("../tools/safeGitPush");
const createDockerIgnore = require("../tools/createDockerIgnore");
const validateRepo = require("../tools/validateRepo");

const allowedSteps = {
    clone_repo: async (context) => {
        // console.log("📦 [TOOL] cloneRepo");
        return await cloneRepo(context);
    },

    validate_repo: async (context) => {
        return await validateRepo(context);
    },
    
    analyze_repo: async (context) => {
        // console.log("🔍 [TOOL] analyzeRepo");
        return await analyzeRepo(context);
    },

    create_dockerignore: async (context) => {
        return await createDockerIgnore(context);
    },

    generate_dockerfile: async (context) => {
        //console.log("🐳 [TOOL] generateDockerfile");
        return await generateDockerfile(context, {
            groqApiKey: process.env.GROQ_API_KEY
        });
    },

    build_docker: async (context) => {
        //console.log("🏗️ [TOOL] buildDockerImage");
        return await buildDockerImage(context);
    },

    push_docker: async (context) => {
        //console.log("📤 [TOOL] pushDockerImage");
        return await pushDockerImage(context);
    },

    prepare_deploy: async (context) => {
        //console.log("⚙️ [TOOL] prepareDeploymentConfig");
        return await prepareDeploymentConfig(context);
    },

    git_push: async (context) => {
        //console.log("🔐 [TOOL] safeGitPush");
        return await safeGitPush(context);
    },

    trigger_deploy: async (context) => {
        console.log("🚀 [TOOL] triggerDeploy");
    },

    validate_deploy: async (context) => {
        console.log("✅ [TOOL] validateDeployment");
    }
};

async function executeStep(step, context) {
    const fn = allowedSteps[step.step];

    if (!fn) {
        throw new Error(`❌ Unauthorized step: ${step.step}`);
    }

    if (context.logger) {
        context.logger.log(`Executing: ${step.step}...`);
    }

    return await fn(context);
}

module.exports = executeStep;