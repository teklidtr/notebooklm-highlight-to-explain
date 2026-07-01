import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";

console.log("Packaging extension for the Chrome Web Store...");

// Ensure build directory exists
if (!fs.existsSync("build")) {
  fs.mkdirSync("build");
}

const zipFile = "build/notebooklm-highlight-to-explain.zip";

// Remove old zip if it exists
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

if (os.platform() === "win32") {
  // Windows PowerShell fallback
  try {
    // Create a temporary staging directory to zip cleanly
    const stageDir = "build/stage";
    if (fs.existsSync(stageDir)) {
      fs.rmSync(stageDir, { recursive: true, force: true });
    }
    fs.mkdirSync(stageDir);
    fs.mkdirSync(`${stageDir}/src`);
    fs.mkdirSync(`${stageDir}/icons`);

    fs.copyFileSync("manifest.json", `${stageDir}/manifest.json`);
    fs.copyFileSync("support.html", `${stageDir}/support.html`);

    // Copy src/
    const srcFiles = fs.readdirSync("src");
    for (const file of srcFiles) {
      fs.copyFileSync(`src/${file}`, `${stageDir}/src/${file}`);
    }

    // Copy icons/ (only PNGs)
    const iconFiles = fs.readdirSync("icons");
    for (const file of iconFiles) {
      if (file.endsWith(".png")) {
        fs.copyFileSync(`icons/${file}`, `${stageDir}/icons/${file}`);
      }
    }

    execSync(`powershell Compress-Archive -Path "${stageDir}/*" -DestinationPath "${zipFile}" -Force`);
    fs.rmSync(stageDir, { recursive: true, force: true });

    console.log(`\nSuccessfully packaged extension into: ${zipFile}`);
  } catch (error) {
    console.error("Packaging failed on Windows:", error.message);
  }
} else {
  // macOS and Linux
  try {
    execSync(`zip -q -r ${zipFile} manifest.json support.html src/ icons/*.png`, { stdio: "inherit" });
    console.log(`\nSuccessfully packaged extension into: ${zipFile}`);
  } catch (error) {
    console.error("Packaging failed:", error.message);
  }
}
