const fs = require("node:fs");
const path = require("node:path");
const { withDangerousMod } = require("@expo/config-plugins");

module.exports = function withAdhanSounds(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const sourceDir = path.join(projectRoot, "assets", "adhan");
      const targetDir = path.join(projectRoot, "android", "app", "src", "main", "res", "raw");
      fs.mkdirSync(targetDir, { recursive: true });

      const sounds = [
        ["adhan-1.mp3", "adhan_1.mp3"],
        ["adhan-2.mp3", "adhan_2.mp3"],
      ];
      for (const [sourceName, targetName] of sounds) {
        const source = path.join(sourceDir, sourceName);
        if (!fs.existsSync(source)) {
          throw new Error("Missing bundled adhan audio file: " + source);
        }
        fs.copyFileSync(source, path.join(targetDir, targetName));
      }
      return modConfig;
    },
  ]);
};
