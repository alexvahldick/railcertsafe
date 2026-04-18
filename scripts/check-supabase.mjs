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

function readEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function fetchJson(url, headers) {
  const response = await fetch(url, { headers });
  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { response, body };
}

async function main() {
  const baseUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  console.log(`project: ${new URL(baseUrl).host}`);

  const bucketCheck = await fetchJson(`${baseUrl}/storage/v1/bucket/documents`, headers);

  if (!bucketCheck.response.ok) {
    console.error(`bucket check failed: ${bucketCheck.response.status}`);
    if (bucketCheck.body?.message) {
      console.error(bucketCheck.body.message);
    }
    process.exit(1);
  }

  console.log("ok: storage bucket documents exists");

  const tableCheck = await fetchJson(
    `${baseUrl}/rest/v1/documents?select=id,status,storage_path,uploaded_by&limit=1`,
    headers,
  );

  if (!tableCheck.response.ok) {
    console.error(`documents table check failed: ${tableCheck.response.status}`);
    if (tableCheck.body?.message) {
      console.error(tableCheck.body.message);
    }
    process.exit(1);
  }

  console.log("ok: public.documents is reachable with expected columns");
  console.log("remote Supabase check passed");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
