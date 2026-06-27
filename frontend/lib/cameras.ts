export type CameraStatus = "live" | "recording" | "offline"

export type Camera = {
  id: string
  name: string
  status: CameraStatus
  fps: number
  ip: string
  signal: number // 0-5 segmented bars
  dbm: number
}

export const cameras: Camera[] = [
  {
    id: "cam-01",
    name: "Main Entrance",
    status: "recording",
    fps: 50,
    ip: "192.168.1.85",
    signal: 4,
    dbm: -52,
  },
  {
    id: "cam-02",
    name: "North Garage",
    status: "live",
    fps: 30,
    ip: "192.168.1.86",
    signal: 5,
    dbm: -41,
  },
  {
    id: "cam-03",
    name: "Backyard",
    status: "live",
    fps: 25,
    ip: "192.168.1.87",
    signal: 3,
    dbm: -67,
  },
  {
    id: "cam-04",
    name: "Side Hallway",
    status: "offline",
    fps: 0,
    ip: "192.168.1.88",
    signal: 0,
    dbm: -99,
  },
  {
    id: "cam-05",
    name: "Server Room",
    status: "recording",
    fps: 60,
    ip: "192.168.1.89",
    signal: 5,
    dbm: -38,
  },
  {
    id: "cam-06",
    name: "Outer Gate",
    status: "live",
    fps: 30,
    ip: "192.168.1.90",
    signal: 2,
    dbm: -74,
  },
]
