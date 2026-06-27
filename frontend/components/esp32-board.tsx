import type { CameraStatus } from "@/lib/cameras";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<CameraStatus, string> = {
  live: "#34d399",
  recording: "#ef4444",
  offline: "#52525b",
};

export function Esp32Board({ status }: { status: CameraStatus }) {
  const flash = STATUS_COLOR[status];
  const active = status !== "offline";

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg
        viewBox="0 0 240 150"
        className="h-auto w-[78%] max-w-[260px]"
        role="img"
        aria-label="ESP32-CAM board layout"
        fill="none"
      >
        <rect
          x="40"
          y="14"
          width="160"
          height="122"
          rx="6"
          fill="#101012"
          stroke="#3f3f46"
          strokeWidth="1.5"
        />
        <rect
          x="46"
          y="20"
          width="148"
          height="110"
          rx="4"
          stroke="#27272a"
          strokeWidth="1"
        />

        <rect
          x="98"
          y="6"
          width="44"
          height="14"
          rx="2"
          fill="#18181b"
          stroke="#3f3f46"
          strokeWidth="1"
        />
        <line
          x1="104"
          y1="9"
          x2="104"
          y2="17"
          stroke="#52525b"
          strokeWidth="1"
        />
        <line
          x1="110"
          y1="9"
          x2="110"
          y2="17"
          stroke="#52525b"
          strokeWidth="1"
        />
        <line
          x1="116"
          y1="9"
          x2="116"
          y2="17"
          stroke="#52525b"
          strokeWidth="1"
        />
        <line
          x1="122"
          y1="9"
          x2="122"
          y2="17"
          stroke="#52525b"
          strokeWidth="1"
        />
        <line
          x1="128"
          y1="9"
          x2="128"
          y2="17"
          stroke="#52525b"
          strokeWidth="1"
        />
        <line
          x1="134"
          y1="9"
          x2="134"
          y2="17"
          stroke="#52525b"
          strokeWidth="1"
        />

        <rect
          x="96"
          y="34"
          width="48"
          height="48"
          rx="4"
          fill="#0a0a0b"
          stroke="#3f3f46"
          strokeWidth="1.5"
        />
        <circle
          cx="120"
          cy="58"
          r="17"
          fill="#18181b"
          stroke="#52525b"
          strokeWidth="1.5"
        />
        <circle
          cx="120"
          cy="58"
          r="10"
          fill="#09090b"
          stroke="#3f3f46"
          strokeWidth="1"
        />
        <circle cx="120" cy="58" r="4" fill="#27272a" />
        <circle cx="116" cy="54" r="1.6" fill="#52525b" />

        <rect
          x="54"
          y="34"
          width="34"
          height="40"
          rx="2"
          fill="#0e0e10"
          stroke="#3f3f46"
          strokeWidth="1"
        />
        <text
          x="71"
          y="56"
          textAnchor="middle"
          fontSize="6"
          fill="#52525b"
          fontFamily="monospace"
        >
          ESP32
        </text>
        <text
          x="71"
          y="64"
          textAnchor="middle"
          fontSize="5"
          fill="#3f3f46"
          fontFamily="monospace"
        >
          WROOM
        </text>

        <path
          d="M150 38 h36 v6 h-36 v6 h36 v6 h-36 v6 h36"
          stroke="#3f3f46"
          strokeWidth="1.2"
        />

        <rect
          x="54"
          y="92"
          width="46"
          height="30"
          rx="2"
          fill="#0e0e10"
          stroke="#3f3f46"
          strokeWidth="1"
        />
        <text
          x="77"
          y="110"
          textAnchor="middle"
          fontSize="5.5"
          fill="#52525b"
          fontFamily="monospace"
        >
          microSD
        </text>

        <rect x="150" y="92" width="8" height="5" rx="1" fill="#27272a" />
        <rect x="162" y="92" width="8" height="5" rx="1" fill="#27272a" />
        <rect x="150" y="101" width="8" height="5" rx="1" fill="#27272a" />
        <rect x="174" y="92" width="5" height="5" rx="1" fill="#3f3f46" />

        {Array.from({ length: 8 }).map((_, i) => (
          <rect
            key={`l-${i}`}
            x="32"
            y={26 + i * 13}
            width="8"
            height="6"
            rx="1"
            fill="#52525b"
          />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <rect
            key={`r-${i}`}
            x="200"
            y={26 + i * 13}
            width="8"
            height="6"
            rx="1"
            fill="#52525b"
          />
        ))}

        <text
          x="168"
          y="124"
          textAnchor="middle"
          fontSize="5.5"
          fill="#52525b"
          fontFamily="monospace"
        >
          FLASH
        </text>

        <circle cx="168" cy="112" r="3" fill={active ? flash : "#27272a"} />
      </svg>
    </div>
  );
}
