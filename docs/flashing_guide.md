# Flashing Guide

This guide explains how to connect and flash your ESP32-CAM module using the CAMron web dashboard.

## Hardware Requirements

1. **ESP32-CAM Module:** Standard AI-Thinker board.
2. **USB Programmer:** An ESP32-CAM-MB micro-USB adapter board (recommended) or an FTDI programmer.
3. **USB Cable:** Data transfer cable.

---

## USB Drivers

Your computer must recognize the USB programmer to interface with it.

If the browser displays "No compatible serial ports found" during the connection step, download and install the appropriate drivers for your chip.

---

## Instructions

### 1. Wire the Hardware

- **Using an ESP32-CAM-MB adapter:** Plug the camera board onto the adapter, then connect it to your computer via USB.

### 2. Connect to the Serial Port

Connect your device. When the browser dialog appears, select your programmer's COM port and click connect.

### 3. Wifi Configuration

Open the dashboard, navigate to the flashing page, and enter your wifi credentials (this is the wifi to be used by the camera). Go to the next step.

### 4. Write the Firmware

The backend will compile the binary. After that, the frontend will write the binaries to the ESP32-CAM.

DONE!!!
