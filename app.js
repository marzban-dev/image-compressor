import chalk from "chalk";
import logSymbols from "log-symbols";
import inquirer from "inquirer";
import fs, { promises as fsPromises } from "fs";
import { compressor, clear, convertBytesToMegabytes, createChunkInTemp, createChunksFromList, deleteTempFolder, getDirectoryImagesList, getInitialValuesFromUser, logProcess, logProcessResult, showWelcome } from "./functions.js";

const App = async () => {
    let last_input_path;
    let last_output_path;
    let input_directory_images;
    let ignore_compressed_images = false;

    showWelcome();

    while (true) {
        let { input_path, output_path, ignore } = await getInitialValuesFromUser();

        if (fs.existsSync(output_path)) {
            await fsPromises.rmdir(output_path, { recursive: true });
        }

        clear();

        const imagesList = await getDirectoryImagesList(input_path);

        console.log(logSymbols.success + chalk.greenBright(" Directory successfully registered !\n"));
        console.log(logSymbols.info + chalk.cyan(` This directory contains ${chalk.yellowBright.bold(imagesList.length)} images.\n`));
        console.log(logSymbols.info + chalk.cyan(` Current input is ${chalk.yellow(input_path)} & output is ${chalk.yellow(output_path)}\n`));
        const { nextAction } = await inquirer.prompt([
            {
                type: "list",
                message: "To continue please choice one of these actions",
                name: "nextAction",
                choices: [
                    {
                        name: logSymbols.success + " Change input/output",
                        value: "change",
                    },
                    {
                        name: logSymbols.success + " Start compression process",
                        value: "start",
                    },
                ],
            },
        ]);

        clear();

        if (nextAction === "change") continue;
        else {
            last_input_path = input_path;
            last_output_path = output_path;
            input_directory_images = imagesList;
            if (ignore === "n") ignore_compressed_images = false;
            if (ignore === "y") ignore_compressed_images = true;
            break;
        }
    }

    console.log(chalk.greenBright(" --| Starting process |-- \n"));

    const tickPerImage = 25 / input_directory_images.length;
    let progress = 0;
    let processLogs = [];
    const chunks = createChunksFromList(input_directory_images);

    await chunks.reduce(async (memo, chunk) => {
        await memo;

        const chunkPath = await createChunkInTemp(last_input_path, chunk, ignore_compressed_images);

        await compressor(chunkPath, last_output_path, (error, statistic, completed) => {
            clear();
            processLogs.push(statistic);
            progress += tickPerImage;
            let emptySpaces = "=========================";
            let progressString = "";
            for (let j = 0; j < Math.round(progress); j++) {
                progressString += "=";
                emptySpaces = emptySpaces.slice(1);
            }

            const freedSpace = convertBytesToMegabytes(processLogs.reduce((totalSize, log) => totalSize + (log.size_in - log.size_output), 0));

            console.log(
                chalk.white("\n --|") +
                    chalk.greenBright(progressString) +
                    chalk.gray(emptySpaces) +
                    chalk.white("|-- ") +
                    chalk.cyanBright(processLogs.length) +
                    chalk.gray(" of ") +
                    chalk.cyanBright(input_directory_images.length) +
                    chalk.white(" [") +
                    chalk.greenBright(freedSpace) +
                    chalk.white(" was reduced]")
            );
        });
    }, undefined);

    await deleteTempFolder();

    clear();

    const totalInputSize = convertBytesToMegabytes(processLogs.reduce((totalSize, log) => totalSize + log.size_in, 0));
    const totalOutputSize = convertBytesToMegabytes(processLogs.reduce((totalSize, log) => totalSize + log.size_output, 0));
    const freedSpace = convertBytesToMegabytes(processLogs.reduce((totalSize, log) => totalSize + (log.size_in - log.size_output), 0));

    logProcessResult(totalInputSize, totalOutputSize, freedSpace);
};

App();
