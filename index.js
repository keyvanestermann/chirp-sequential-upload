import { SerialPort } from "serialport";
import inquirer from "inquirer";
import { spawn } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "fs";
import path from "path";

// Load config file
const configFile = readFileSync("./config.json", "utf-8");
const config = JSON.parse(configFile);
const images = readdirSync(config.imagesPath).filter((file) =>
  file.endsWith(".img")
);

let portsChoices = [];

async function main() {
  try {
    // Retrieve available serial ports
    let ports = await SerialPort.list();

    // Filter only USB ports
    ports = ports.filter((port) => port.path.indexOf("USB") > -1);

    if (ports.length === 0) {
      throw new Error("No USB devices found.");
    }

    // Format choices for inquirer
    portsChoices = ports.map((port) => {
      let name = port.path;
      if (port.manufacturer) {
        name += ` - ${port.manufacturer}`;
      }
      if (port.productId) {
        name += ` - ${port.productId}`;
      }
      return { name, value: port.path };
    });
  } catch (error) {
    console.error("Error:", error.message);
  }

  if (portsChoices.length === 0) {
    console.error("No USB devices available.");
    return;
  }

  // Interactive prompts
  inquirer
    .prompt([
      {
        type: "list",
        name: "port",
        message: "Select USB port:",
        choices: portsChoices,
      },
      {
        type: "list",
        name: "model",
        message: "Select radio model:",
        choices: [{ name: "Baofeng UV-5R", value: "Baofeng_UV-5R" }],
      },
      {
        type: "list",
        name: "action",
        message: "What do you want to do?",
        choices: [
          { name: "Download image from radio", value: "download" },
          { name: "Upload image to radio", value: "upload" },
          {
            name: "Upload image to multiple radios in sequence",
            value: "loop",
          },
        ],
      },
      {
        type: "input",
        name: "mmap_output",
        message: "Enter output image file name:",
        default: (answers) => answers.model + ".img",
        when: (answers) => answers.action === "download",
      },
      {
        type: "list",
        name: "mmap_input",
        message: "Select input image file:",
        choices: images,
        when: (answers) =>
          answers.action === "upload" || answers.action === "loop",
      },
      {
        type: "confirm",
        name: "overwrite",
        message: "A file with this name exists, overwrite?",
        default: false,
        when: (answers) => {
          if (answers.action === "download") {
            return existsSync(
              path.join(config.imagesPath, answers.mmap_output)
            );
          }
          return false;
        },
      },
    ])
    // Process responses
    .then((answers) => {
      // Check if input file exists
      if (
        answers.action === "upload" &&
        !existsSync(path.join(config.imagesPath, answers.mmap_input))
      ) {
        throw new Error(
          "File " +
            path.join(config.imagesPath, answers.mmap_input) +
            " does not exist."
        );
      }

      // Download image from radio
      if (answers.action == "download") {
        let outputFile = path.join(config.imagesPath, answers.mmap_output);
        downloadImage(answers.port, answers.model, outputFile).then(() => {
          console.log("Download complete. Image saved to:", outputFile);
        });
      }

      // Upload image to radio
      if (answers.action == "upload") {
        let inputFile = path.join(config.imagesPath, answers.mmap_input);
        console.log("Image loaded from:", inputFile);
        uploadImage(answers.port, answers.model, inputFile).then(() => {
          console.log("Image uploaded successfully.");
        });
      }

      // Upload image to multiple radios in sequence
      if (answers.action == "loop") {
        let inputFile = path.join(config.imagesPath, answers.mmap_input);
        console.log("Image loaded from:", inputFile);
        startLoop(answers.port, answers.model, inputFile).then(() => {
          console.log("Done.");
        });
      }
    })
    .catch((error) => {
      if (error.isTtyError) {
        // Prompt couldn't be rendered in the current environment
        console.log(
          "Error: Interactive prompt couldn't be rendered in the current environment."
        );
        return;
      } else {
        console.log("Error:", error.message);
        return;
      }
    });
}

// Loop function to upload to multiple radios
async function startLoop(serial, radio, mmap) {
  let count = 0;
  let continueLoop = true;

  while (continueLoop) {
    try {
      // Prompt user to connect the next radio before continuing
      const answers = await promptForNextRadio(count);
      if (!answers.continue) {
        continueLoop = false;
        break;
      }
      // Upload image to the connected radio
      const code = await uploadImage(serial, radio, mmap);
      if (code === 1) {
        count++;
        continueLoop = true;
      } else {
        continueLoop = false;
        throw new Error("Error uploading image.");
      }
    } catch (error) {
      console.log("Error:", error.message);
      break;
    }
  }
}

async function promptForNextRadio(count) {
  let message = "Connect the next radio and press Continue";
  if (count === 0) {
    message = "Connect the first radio and press Continue";
  }
  return inquirer.prompt([
    {
      type: "list",
      name: "continue",
      message: message,
      choices: [
        { name: "Continue", value: true },
        { name: "Quit", value: false },
      ],
    },
  ]);
}

async function uploadImage(serial, radio, mmap) {
  return runChirpCommand([
    "-s",
    serial,
    "-r",
    radio,
    "--upload-mmap",
    "--mmap",
    mmap,
  ]);
}

// Download image from radio
async function downloadImage(serial, radio, mmap) {
  return runChirpCommand([
    "-s",
    serial,
    "-r",
    radio,
    "--download-mmap",
    "--mmap",
    mmap,
  ]);
}

// Function to execute a chirpc command
async function runChirpCommand(args) {
  console.log(
    `Executing command: ${config.chirpcPath} ${args.join(" ")}`
  );

  const process = spawn(config.chirpcPath, args, {
    stdio: "inherit", // Output directly to parent terminal
  });

  return new Promise((resolve, reject) => {
    process.on("close", (code) => {
      if (code === 1) {
        // Chirp does not follow POSIX conventions (1 = success, 2 = error, 0 = never)
        resolve(code);
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });

    process.on("error", (err) => {
      reject(err);
    });
  });
}

main();
