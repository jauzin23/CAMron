# <p align="center">CAMron</p>

<p align="center">
  <img src="./logo.png" alt="CAMron logo" width="120px" />
</p>

<p align="center">
  <strong>An open-source, low-cost video surveillance platform.</strong><br/>
  Flash custom firmware directly from your browser. No terminals, IDEs, or coding required.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React"/>
  <img src="https://img.shields.io/badge/shadcn%2Fui-000000?style=flat-square&logo=shadcnui&logoColor=white" alt="shadcn/ui"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite"/>
  <img src="https://img.shields.io/badge/ESP32--CAM-E7352C?style=flat-square&logo=espressif&logoColor=white" alt="ESP32-CAM"/>
  <img src="https://img.shields.io/badge/Open%20Source-Yes-brightgreen?style=flat-square" alt="Open Source"/>
</p>

> **Disclaimer:** **CAMron** bears no affiliation with legendary rapper **[Cam'ron](https://en.wikipedia.org/wiki/Cam%27ron)** aka **Killa CAM**, pioneer of the _pink fur coat._

---

## The Mission

Home security and peace of mind shouldn't be expensive luxurie.

**CAMron** is a self-hosted, private, and low-cost home monitoring platform designed for everyone. By using the **ESP32-CAM**, anyone can set up their own home monitoring network without spending hundreds on commercial systems.

## Why is CAMron Different?

Most DIY security camera projects require you to install an IDE, configure libraries, and edit C++ files manually just to connect to your Wi-Fi. On the other hand, commercial systems are expensive, require subscriptions, and store your private video feeds in the cloud.

**CAMron** offers the best of both worlds:

- **Zero Code Required:** If you can type your Wi-Fi password into a browser, you can set up a CAMron camera. The heavy lifting (firmware compilation and flashing) is done entirely through the web interface.
- **100% Local & Private:** No cloud servers, no hidden tracking, and no subscriptions. Your video feeds never leave your local network.
- **Low-Cost:** Avoid expensive hardware. CAMron works seamlessly with the standard ESP32-CAM modules.

---

## No-Code Web Flashing

Traditionally, setting up ESP32 cameras requires downloading the Arduino IDE (or an equivalent), installing drivers, managing libraries, and manually editing C++ code files.

**CAMron** completely removes this barrier:

1. **Connect** your ESP32-CAM to your computer via USB.
2. **Type** your Wi-Fi name (SSID) and Password into the web interface.
3. The backend automatically compiles a custom firmware on the _backend_.
4. The frontend writes the compiled firmware directly to your device via the browser using the **Web Serial API**.
5. The camera reboots, auto-connects to your Wi-Fi, registers with the dashboard, and starts streaming immediately.

**Zero lines of code written**

---

## Main Features

- **Dynamic Firmware Compilation**: Automatically bakes your Wi-Fi configuration and host credentials into the firmware.
- **Direct-to-Device Web Serial Flashing**: Flash ESP32-CAM directly from Google Chrome or Microsoft Edge.
- **Local & Private**: No cloud connections, no subscriptions, and no external servers. Your video feeds stay on your local network.
- **Dynamic Camera Management**: Easily edit, reboot, toggle camera flashlights, and manage all camera devices from a single center.

---

## Screenshots

> [!NOTE]
> [Placeholder] Insert a screenshot of the Main Dashboard here, showing active camera streams.

> [!NOTE]
> [Placeholder] Insert a screenshot of the Flashing Wizard here, showing the Web Serial connection and compilation progress.

---

## Prerequisites

### Hardware

To use CAMron, you will need the following hardware components:

- ESP32-CAM module
- FTDI Programmer or ESP32-CAM-MB micro-USB adapter
- Micro-USB cable (data capable)

### Software

The platform requires the following software to run locally:

- Docker

---

## Getting Started

_COMING SOON_

---

## Contributing

_COMING SOON_

---

## FAQ's

_COMING SOON_

---

## License

This project is licensed under the [MIT License](LICENSE).
