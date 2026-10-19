/**
 * Uploads intro.mp4 and intro_2.mp4 to Supabase Storage (videos bucket).
 * Run once: SERVICE_ROLE_KEY=<key> node scripts/upload-videos.mjs
 *
 * Get key: Supabase dashboard → Settings → API → service_role
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) {
  console.error("Missing SERVICE_ROLE_KEY env var.");
  console.error("Usage: SERVICE_ROLE_KEY=<key> node scripts/upload-videos.mjs");
  process.exit(1);
}

const SUPABASE_URL = "https://ijdqiguubxctdwdjeuge.supabase.co";
const BUCKET = "videos";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw new Error(`Create bucket failed: ${error.message}`);
    console.log(`Created bucket: ${BUCKET}`);
  } else {
    console.log(`Bucket "${BUCKET}" already exists.`);
  }
}

async function upload(localPath, remoteName, contentType) {
  console.log(`Uploading ${remoteName} (${Math.round(readFileSync(localPath).length / 1024 / 1024)}MB)…`);
  const file = readFileSync(localPath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(remoteName, file, { contentType, upsert: true });
  if (error) throw new Error(`Upload ${remoteName} failed: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(remoteName);
  console.log(`  ✓ ${data.publicUrl}`);
  return data.publicUrl;
}

(async () => {
  const [introPath, loopPath] = process.argv.slice(2);
  if (!introPath || !loopPath) {
    console.error("Usage: node scripts/upload-videos.mjs <intro.mp4> <loop.mp4>");
    process.exit(1);
  }

  await ensureBucket();
  const intro     = await upload(introPath, "intro.mp4",   "video/mp4");
  const introLoop = await upload(loopPath,  "intro_2.mp4", "video/mp4");
  console.log("\n── Update Landing.tsx src= with these URLs ──");
  console.log("intro:      ", intro);
  console.log("intro_2:    ", introLoop);
})();
