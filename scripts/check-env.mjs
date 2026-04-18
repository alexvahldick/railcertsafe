import fs from "node:fs";
import path from "node:path";

function loadDotEnvFile(filename) {
  const filePath = path.resolve(process.cwd(), filename);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, "utf8");

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const name = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!(name in process.env)) {
      process.env[name] = value;
    }
  }
}

loadDotEnvFile(".env.local");

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const optional = ["ADMIN_EMAILS"];

let hasError = false;

for (const name of required) {
  const value = process.env[name]?.trim();

  if (!value) {
    hasError = true;
    console.error(`missing: ${name}`);
    continue;
  }

  console.log(`ok: ${name}`);
}

const configuredOptional = optional.filter((name) => process.env[name]?.trim());

if (configuredOptional.length === 0) {
  console.warn("warn: ADMIN_EMAILS is not set");
} else {
  console.log(`ok: admin email source = ${configuredOptional.join(", ")}`);
}

if (hasError) {
  process.exit(1);
}

console.log("environment check passed");
