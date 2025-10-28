const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "build", "contracts", "TranscriptAttendance.json");
const destDir = path.join(__dirname, "app", "src", "abi");
const dest = path.join(destDir, "TranscriptAttendance.json");

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log("ABI exported to", dest);