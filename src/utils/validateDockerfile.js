function validateDockerfile(dockerfile) {
  const errors = [];

  // 🔒 Must have FROM (proper syntax)
  if (!/^FROM\s+/m.test(dockerfile)) {
    errors.push("Missing FROM instruction");
  }

  // ❌ Dev commands
  if (
    dockerfile.includes("nx serve") ||
    dockerfile.includes("npm run dev")
  ) {
    errors.push("Using development server instead of production");
  }

  // ❌ Old Node
  if (dockerfile.includes("node:16")) {
    errors.push("Using outdated Node version");
  }

  // ❌ npm install instead of ci
  if (dockerfile.includes("npm install")) {
    errors.push("Use npm ci instead of npm install");
  }

  // ❌ Explanation / garbage text
  if (/This Dockerfile|Explanation|example/i.test(dockerfile)) {
    errors.push("Contains explanation text");
  }

  // ❌ Invalid instructions (strict filter)
  const invalidLines = dockerfile.split("\n").filter(line => {
    const t = line.trim();
    if (!t) return false;

    return !(
      t.startsWith("FROM") ||
      t.startsWith("WORKDIR") ||
      t.startsWith("COPY") ||
      t.startsWith("RUN") ||
      t.startsWith("CMD") ||
      t.startsWith("EXPOSE") ||
      t.startsWith("ENV") ||
      t.startsWith("#")
    );
  });

  if (invalidLines.length > 0) {
    errors.push("Contains invalid instructions");
  }

  return errors;
}

module.exports = validateDockerfile;