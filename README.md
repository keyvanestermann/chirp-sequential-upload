# chirp-sequential-upload

This is a Node.js script used in conjucture with "Chirp" to upload an image to multiple radios in sequence, by plugging each radio one after the other.
For now it only supports the Baofeng UV-5R. Feel free to contribute to support other radios.
You can also download and/or upload an image from/to a single radio.


## Use at your own risks

This script is provided "as-is", you should understand what it does before using it.

## Before you start

- You must run this script in a Linux environnement (WSL works too)
- You must have NodeJS and Chirp installed

## How to use
- Add your images to the `mmap/` folder at the root of the project
- Specify the path to the `chirpc` binary in `config.json`
- Plug in your radio with the programming cable
- Run the script and follow the instructions

## Share a USB device from Windows to WSL
From https://learn.microsoft.com/en-us/windows/wsl/connect-usb

- Install `usbipd`
- Connect the USB cable to your computer
- In an terminal, as administrator, type `usbipd list`
- To share the device, type `usbipd bind --busid 4-4` by replacing **4-4** with the range retrieved from the previous command
- Attach the device to WSL using : `usbipd attach --wsl --busid <busid>`
- From WSL, run `lsusb` to confirm that the device is connected
- To detach the device from WSL, simply unplug it or run `usbipd detach --busid <busid>`

## Help me stay caffeinated

If this helped you, consider buying me a coffee ! 

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://ko-fi.com/keyvanestermann)