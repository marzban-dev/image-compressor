import chalk from "chalk";
import inquirer from "inquirer";
import fs, { promises as fsPromises } from "fs";
import path from "path";
import logSymbols from "log-symbols";
import { compress } from "compress-images/promise.js";
import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

export const showWelcome = () => {
    clear();
    console.log("* * * * * * * * * * * * * * * * * * * * * *");
    console.log("*        " + chalk.green.bold("Welcome To Image Compressor") + "      *");
    console.log("* * * * * * * * * * * * * * * * * * * * * *\n");
};

export const getInitialValuesFromUser = async () => {
    const answers = await inquirer.prompt([
        {
            type: "input",
            message: `Please define your ${chalk.yellowBright.bold("INPUT")} images directory ${chalk.gray("( e.g src/images )")} :`,
            name: "input_path",
            validate: function (input) {
                if (!fs.existsSync(input)) {
                    return chalk.yellowBright(logSymbols.error + " Directory does not exist");
                }
                return true;
            },
        },
        {
            type: "input",
            message: `Please define your ${chalk.yellowBright.bold("OUTPUT")} images directory :`,
            name: "output_path",
            default: "dist/images",
        },
        {
            type: "input",
            message: `Do you want to ignore files that starts with ${chalk.cyan("compressed")} ${chalk.gray("( y - n )")} ?`,
            name: "ignore",
            default: "n",
        },
    ]);

    return answers;
};

export const getDirectoryImagesList = async (pathName) => {
    const files = await fsPromises.readdir(pathName);

    const imagesCount = files.filter((file) => {
        const fileExt = path.extname(file);
        if (fileExt === ".jpg" || fileExt === ".jpeg" || fileExt === ".png") return true;
        return false;
    });

    return imagesCount;
};

export const logProcess = (logDetails) => {
    console.log(
        chalk.white("\n ") +
            chalk.cyanBright("Image x ") +
            chalk.white("- initSize [") +
            chalk.redBright(Math.round((logDetails.size_in / 1024 / 1024) * 100) / 100 + " mb") +
            chalk.white("] - ") +
            chalk.white("lastSize [") +
            chalk.greenBright(Math.round((logDetails.size_output / 1024 / 1024) * 100) / 100 + " mb") +
            chalk.white("] | ") +
            chalk.greenBright(logDetails.percent + "% ") +
            chalk.white("Compressed")
    );
};

export const convertBytesToMegabytes = (value) => {
    return Math.round((value / 1024 / 1024) * 100) / 100 + " mb";
};

export const createChunkInTemp = async (inputDir, files, ignore) => {
    const chunkPath = `.temp/chunk-${Math.floor(Math.random() * 1000000)}`;
    await fsPromises.mkdir(__dirname + "/" + chunkPath, { recursive: true });

    files.forEach(async (file) => {
        if(ignore) {
            if(!file.startsWith("compressed")) {
                await fsPromises.copyFile(inputDir + "/" + file, chunkPath + "/" + "compressed-" + file);
            }
        } else {
            await fsPromises.copyFile(inputDir + "/" + file, chunkPath + "/" + (!file.startsWith("compressed") ? "compressed-" : "") + file);
        }
    });

    return chunkPath;
};

export const clear = () => {
    process.stdout.write("\u001b[3J\u001b[2J\u001b[1J");
    console.clear();
};

export const deleteTempFolder = async () => {
    await fsPromises.rmdir(".temp", { recursive: true });
};

export const createChunksFromList = (list) => {
    const chunks = [];

    for (let i = 0; i < list.length; i += 25) {
        chunks.push(list.slice(i, i + 25));
    }

    return chunks;
};

export const logProcessResult = (totalInputSize, totalOutputSize, freedSpace) => {
    console.log(
        chalk.green.bold("\n Process Finished\n") +
            " " +
            logSymbols.success +
            chalk.white(` Input Size : ${chalk.yellowBright(totalInputSize)}\n`) +
            " " +
            logSymbols.success +
            chalk.white(` Output Size : ${chalk.greenBright(totalOutputSize)}\n`) +
            " " +
            logSymbols.success +
            chalk.white(` Freed Space : ${chalk.cyanBright(freedSpace)}\n`)
    );
};

export const compressor = async (INPUT_PATH, OUTPUT_PATH = "dist/images/", callback) => {
    return await compress({
        source: INPUT_PATH + "/*.{jpg,png,jpeg}",
        destination: OUTPUT_PATH + "/",
        onProgress: callback,
        enginesSetup: {
            jpg: { engine: "mozjpeg", command: ["-quality", "40"] },
            png: { engine: "pngquant", command: ["--quality=20-50", "-o"] },
            svg: { engine: "svgo", command: "--multipass" },
            gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] },
        },
    });
};
