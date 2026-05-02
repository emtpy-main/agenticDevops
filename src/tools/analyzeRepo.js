const fs = require("fs");
const path = require("path");

async function analyzeRepo({ repoPath }) {
    if (!repoPath) {
        throw new Error("repoPath missing in context");
    }

    const packageJsonPath = path.join(repoPath, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
        throw new Error("package.json not found");
    }

    const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, "utf-8")
    );

    const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
    };

    const scripts = packageJson.scripts || {};

    let type = "unknown";

    // 🔍 Detect React
    const isReact =
        deps.react ||
        deps["react-dom"] ||
        deps["react-scripts"] ||
        deps.vite;

    // 🔍 Detect Backend
    const isBackend =
        deps.express ||
        deps.fastify ||
        deps.koa ||
        scripts.start ||
        packageJson.main ||
        fs.existsSync(path.join(repoPath, "server.js")) ||
        fs.existsSync(path.join(repoPath, "app.js"));

    if (isReact && isBackend) type = "fullstack";
    else if (isReact) type = "react";
    else if (isBackend) type = "backend";

    // 🎯 Extract commands
    const buildCommand = scripts.build || null;
    const startCommand = scripts.start || null;
    let nodeVersion = "18"; // default

    if (packageJson.engines && packageJson.engines.node) {
        const engine = packageJson.engines.node;

        if (engine.includes("20")) nodeVersion = "20";
        else if (engine.includes("22")) nodeVersion = "22";
    }
    // 📦 React output dir
    let outputDir = null;
    if (type === "react") {
        if (deps.vite) outputDir = "dist";
        else outputDir = "build";
    }

    if (deps.vite) {
  nodeVersion = "20"; // force upgrade
}
    console.log("📊 Repo Analysis:");
    console.log({
        type,
        buildCommand,
        startCommand,
        outputDir
    });

    return {
        projectType: type,
        buildCommand,
        startCommand,
        outputDir,
        nodeVersion
    };
}

module.exports = analyzeRepo;