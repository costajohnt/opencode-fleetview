import assert from "node:assert/strict"
import test from "node:test"
import mod, { findOnPath } from "../tui.js"

test("default export is a TUI plugin module", () => {
  assert.equal(mod.id, "opencode.fleetview")
  assert.equal(typeof mod.tui, "function")
  assert.equal(mod.server, undefined)
})

test("registers a single /fleetview palette command", async () => {
  const layers = []
  const api = { keymap: { registerLayer: (layer) => layers.push(layer) } }
  await mod.tui(api)

  assert.equal(layers.length, 1)
  assert.equal(layers[0].commands.length, 1)
  const command = layers[0].commands[0]
  assert.equal(command.namespace, "palette")
  assert.equal(command.name, "fleetview.open")
  assert.equal(command.slashName, "fleetview")
  assert.equal(typeof command.run, "function")
})

test("missing binary toasts the install one-liner instead of spawning", async () => {
  const toasts = []
  const layers = []
  const api = {
    keymap: { registerLayer: (layer) => layers.push(layer) },
    ui: {
      toast: (t) => toasts.push(t),
      dialog: {
        clear: () => assert.fail("dialog should not close when fleetview is missing"),
      },
    },
    renderer: {
      suspend: () => assert.fail("renderer must not be suspended when fleetview is missing"),
      resume: () => assert.fail("renderer must not be resumed when fleetview is missing"),
    },
  }
  await mod.tui(api)

  const PATH = process.env.PATH
  process.env.PATH = "/nonexistent-dir-for-opencode-fleetview-test"
  try {
    await layers[0].commands[0].run()
  } finally {
    process.env.PATH = PATH
  }

  assert.equal(toasts.length, 1)
  assert.match(toasts[0].message, /npm i -g fleetview/)
})

test("findOnPath walks PATH in order and only accepts executables", () => {
  const env = { PATH: ["/a", "/b"].join(":") }
  assert.equal(
    findOnPath("fleetview", env, (f) => f === "/b/fleetview"),
    "/b/fleetview",
  )
  assert.equal(
    findOnPath("fleetview", env, () => false),
    undefined,
  )
})

test("findOnPath finds a real executable on the live PATH", () => {
  assert.ok(findOnPath("node"))
  assert.equal(findOnPath("definitely-not-a-real-binary-xyz"), undefined)
})
