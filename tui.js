import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const id = "opencode.fleetview"
const BIN = "fleetview"
const INSTALL_HINT = "npm i -g fleetview"

/** Resolve an executable on PATH without shelling out. Returns the full path or undefined. */
export function findOnPath(bin, env = process.env, exists = isExecutable) {
  const dirs = (env.PATH ?? "").split(path.delimiter).filter(Boolean)
  for (const dir of dirs) {
    const file = path.join(dir, bin)
    if (exists(file)) return file
  }
}

function isExecutable(file) {
  try {
    fs.accessSync(file, fs.constants.X_OK)
    return fs.statSync(file).isFile()
  } catch {
    return false
  }
}

/** Hand the terminal to `bin`, then give it back to the renderer. */
async function handover(api, bin) {
  api.renderer.suspend()
  try {
    await new Promise((resolve) => {
      const child = spawn(bin, [], { stdio: "inherit" })
      child.on("error", resolve)
      child.on("close", resolve)
    })
  } finally {
    api.renderer.resume()
  }
}

/** @type {import("@opencode-ai/plugin/tui").TuiPlugin} */
const tui = async (api) => {
  api.keymap.registerLayer({
    commands: [
      {
        namespace: "palette",
        name: "fleetview.open",
        title: "FleetView",
        desc: "Open the fleetview agent roster",
        category: "Plugin",
        slashName: "fleetview",
        async run() {
          const bin = findOnPath(BIN)
          if (!bin) {
            api.ui.toast({
              variant: "warning",
              title: "fleetview is not installed",
              message: `Install it with: ${INSTALL_HINT}`,
              duration: 8000,
            })
            return
          }
          api.ui.dialog.clear()
          await handover(api, bin)
        },
      },
    ],
  })
}

/** @type {import("@opencode-ai/plugin/tui").TuiPluginModule & { id: string }} */
export default { id, tui }
