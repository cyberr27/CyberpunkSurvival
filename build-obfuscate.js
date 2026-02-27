const JavaScriptObfuscator = require("javascript-obfuscator");
const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");

const SRC_DIR = path.join(__dirname, "public");
const OUT_DIR = path.join(__dirname, "public_obf");

// Самые агрессивные, но относительно стабильные настройки (2024–2025)
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  disableConsoleOutput: true,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,
  rotateStringArray: true,
  selfDefending: true,
  stringArray: true,
  stringArrayThreshold: 0.8,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.75,
  stringArrayEncoding: ["rc4"],
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
  target: "browser",
  sourceMap: false,
  sourceMapMode: "inline",
};

async function obfuscateFile(inputPath, outputPath) {
  const code = fs.readFileSync(inputPath, "utf8");

  try {
    const obfuscationResult = JavaScriptObfuscator.obfuscate(
      code,
      obfuscationOptions,
    );
    const obfuscatedCode = obfuscationResult.getObfuscatedCode();

    // Создаём все вложенные папки, если нужно
    await fse.ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, obfuscatedCode, "utf8");

    console.log(
      `Обфусцирован: ${path.relative(__dirname, inputPath)} → ${path.relative(__dirname, outputPath)}`,
    );
  } catch (e) {
    console.error(`Ошибка обфускации ${inputPath}:`);
    console.error(e);
    // Копируем оригинал, чтобы не потерять файл
    await fse.copy(inputPath, outputPath);
  }
}

async function main() {
  console.log("Очистка папки public_obf...");
  await fse.emptyDir(OUT_DIR);

  console.log("Копирование не-js файлов...");
  await fse.copy(SRC_DIR, OUT_DIR, {
    filter: (src) => {
      // Пропускаем все .js файлы — их будем обфусцировать отдельно
      return !src.endsWith(".js");
    },
  });

  // Находим все .js файлы
  const jsFiles = [];
  function findJs(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        findJs(fullPath);
      } else if (entry.isFile() && fullPath.endsWith(".js")) {
        jsFiles.push(fullPath);
      }
    }
  }

  findJs(SRC_DIR);

  console.log(`Найдено ${jsFiles.length} .js файлов для обфускации...`);

  for (const file of jsFiles) {
    const relative = path.relative(SRC_DIR, file);
    const outFile = path.join(OUT_DIR, relative);
    await obfuscateFile(file, outFile);
  }

  console.log("\nОбфускация завершена!");
  console.log("Папка для деплоя → public_obf/");
}

main().catch((err) => {
  console.error("Критическая ошибка:", err);
  process.exit(1);
});
