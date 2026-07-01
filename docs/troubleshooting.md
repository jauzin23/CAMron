# Troubleshooting Guide

This guide describes common problems you might encounter when compiling, flashing, or connecting your ESP32-CAM, and how to resolve them.

## Compilation Failures

If the compilation process fails, check the configuration of the backend server.

First, verify that the Arduino CLI path is set correctly. The backend uses the `ARDUINO_CLI_PATH` environment variable to find the compiler. If the path is wrong, the backend cannot run the compiler.

Second, check that the ESP32 board platform is installed. The compiler needs the `esp32:esp32` platform to compile firmware for the camera. You can verify this by running the Arduino CLI commands manually on the server.

Third, review the logs in the flashing wizard. If you see errors about missing files, make sure the files in the backend template folder have not been deleted or modified incorrectly.

## Flashing Failures

If the browser fails to write the compiled firmware to the camera, check your browser and hardware connections.

First, verify your browser compatibility. You must use a browser that supports the Web Serial API, such as Google Chrome or Microsoft Edge. Firefox and Safari will not work.

Second, test your micro-USB cable. Many cables are designed only for charging and do not carry data. Try using a different cable to see if your computer recognizes the serial device.

Third, check the GPIO 0 jumper wire. The ESP32-CAM must have its GPIO 0 pin connected to GND when it powers on to enter flashing mode. If this wire is missing, the module will start its normal program and the browser will fail to connect.

Fourth, close other software that might be using the COM port. If you have the Arduino IDE or a serial monitor open, it will lock the port and prevent the browser from connecting.

## Wi-Fi Connection Failures

If the camera flashes successfully but does not show up on the dashboard, it is likely unable to connect to your network or reach the backend.

First, verify your Wi-Fi credentials. If you typed the SSID or password incorrectly, the camera cannot connect. You must compile and flash the firmware again with the correct information.

Second, check the Wi-Fi frequency. The ESP32-CAM only supports 2.4 GHz networks. It will not connect to a 5 GHz network.

Third, check the `HOST_IP` environment variable in your configuration. The backend host IP must be set to the actual local network IP of the computer running the backend server. If you leave it as localhost, the camera will try to connect to itself and the registration handshake will fail.
