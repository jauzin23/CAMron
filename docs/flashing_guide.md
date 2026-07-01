# Flashing Guide

This guide explains how to connect and flash your ESP32-CAM module using the CAMron web application.

## Required Hardware

You need the following hardware components to flash the firmware.

First, you need a standard ESP32-CAM module.

Second, you need a USB adapter. This can be an FTDI Programmer or an ESP32-CAM-MB micro-USB adapter board.

Third, you need a micro-USB cable that supports data transfer. Many common cables only provide power and will not allow your computer to communicate with the camera.

Fourth, you need a jumper wire to connect the GPIO 0 pin to the GND pin if you are using an FTDI Programmer.

## Software Drivers

Your computer needs specific USB drivers to communicate with the adapter board.

Most adapter boards use either the CH340 or the CP210x serial chip. You must download and install the drivers for your chip from the manufacturer's website. If your computer does not show any new COM ports when you plug in the USB adapter, you are likely missing these drivers.

## Step-by-Step Instructions

First, configure the hardware for flashing mode. If you are using an ESP32-CAM-MB adapter, plug the ESP32-CAM module onto the adapter and connect it to your computer. If you are using an FTDI Programmer, connect TX on the programmer to RX on the ESP32-CAM, and connect RX on the programmer to TX on the ESP32-CAM. Connect the 5V power pin and the GND pin. Connect a jumper wire between GPIO 0 and GND on the ESP32-CAM. Press the reset button on the ESP32-CAM to boot the module into flashing mode.

Second, open the CAMron dashboard in a compatible browser. Google Chrome and Microsoft Edge are recommended.

Third, fill in your Wi-Fi network name (SSID) and Password in the flashing wizard. Click the button to start the compilation. The backend will compile the custom firmware and show you the logs.

Fourth, when the compilation completes, click the connect button. Your browser will open a small window listing the available serial ports. Select the serial port for your USB adapter and click Connect.

Fifth, the browser will start writing the compiled binaries to the ESP32-CAM. You can follow the flashing progress on the screen.

Finally, when the process is done, remove the jumper wire connecting GPIO 0 to GND if you used one. Press the reset button on the ESP32-CAM to reboot it. The camera will connect to your Wi-Fi network and register with the backend automatically.
