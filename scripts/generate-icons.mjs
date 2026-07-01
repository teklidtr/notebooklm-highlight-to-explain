import { execSync } from "node:child_process";
import os from "node:os";

console.log("Generating extension icons from icons/logo_source.jpg...");

if (os.platform() === "darwin") {
  try {
    const sizes = [16, 32, 48, 128];
    for (const size of sizes) {
      execSync(`sips -s format png -z ${size} ${size} icons/logo_source.jpg --out icons/icon${size}.png`, { stdio: "ignore" });
      console.log(`Generated: icons/icon${size}.png (${size}x${size})`);
    }
    console.log("All icons generated successfully!");
  } catch (error) {
    console.error("Failed to generate icons using sips:", error.message);
  }
} else {
  console.log("\nNot on macOS. Please manually resize icons/logo_source.jpg to:");
  console.log("- icons/icon16.png (16x16)");
  console.log("- icons/icon32.png (32x32)");
  console.log("- icons/icon48.png (48x48)");
  console.log("- icons/icon128.png (128x128)");
}
