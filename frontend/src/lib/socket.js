/**
 * src/lib/socket.js — Socket.IO client singleton.
 *
 * Exports a single `socket` instance shared across the entire app.
 * Call `joinProject(id)` / `leaveProject(id)` when entering/leaving a project.
 *
 * Usage:
 *   import socket, { joinProject } from "@/lib/socket";
 *   joinProject(projectId);
 *   socket.on("pin_created", handler);
 */

import { io } from "socket.io-client";

// Socket path is proxied by Vite to ws://localhost:4000/socket.io
const socket = io({
  path:             "/socket.io",
  autoConnect:      true,
  reconnectionDelay: 1000,
  transports:       ["websocket", "polling"],
});

socket.on("connect",    () => console.log("[socket] connected:", socket.id));
socket.on("disconnect", () => console.log("[socket] disconnected"));

export function joinProject(projectId) {
  socket.emit("join_project", { project_id: projectId });
}

export function leaveProject(projectId) {
  socket.emit("leave_project", { project_id: projectId });
}

export default socket;
