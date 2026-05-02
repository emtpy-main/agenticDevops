const fs = require("fs");
const path = require("path");

async function prepareDeploymentConfig(context) {
  const { repoPath, projectType, imageTag } = context;

  const renderYamlPath = path.join(repoPath, "render.yaml");

  console.log("⚙️ Creating render.yaml...");

  const serviceName =
    context.repoName || "devops-agent-service";

  const port = projectType === "react" ? 80 : 3000;

  const yaml = `
services:
  - type: web
    name: ${serviceName}
    env: docker
    plan: free
    image:
      url: docker.io/${imageTag}
    autoDeploy: true
    healthCheckPath: /
    envVars: []
    ports:
      - port: ${port}
`;

  fs.writeFileSync(renderYamlPath, yaml.trim());

  console.log("✅ render.yaml created");

  return { renderYamlPath };
}

module.exports = prepareDeploymentConfig;