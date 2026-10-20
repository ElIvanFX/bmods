const fs = require("node:fs")
const path = require("node:path")

function getProjectFolder() {
  let botData = {}
  try { botData = require("../data.json") } catch (e) { }
  const workingDir = path.normalize(process.cwd() || "")
  if (
    workingDir.includes(path.join("common", "Bot Maker For Discord")) ||
    workingDir.endsWith("Bot Maker For Discord") ||
    fs.existsSync(path.join(workingDir, "AppData", "Kits", "EditorBones.js")) ||
    fs.existsSync(path.join(workingDir, "linux-data")) ||
    fs.existsSync(path.join(workingDir, "mac-data")) ||
    (fs.existsSync(path.join(workingDir, "stage1")) &&
      fs.existsSync(path.join(workingDir, "stage2")) &&
      fs.existsSync(path.join(workingDir, "stage3")) &&
      fs.existsSync(path.join(workingDir, "stage4")) &&
      fs.existsSync(path.join(workingDir, "stage5")))
  ) {
    if (botData.prjSrc) return botData.prjSrc
  }
  return workingDir
}

function findKeyRecursive(obj, targetKey) {
  if (!obj || typeof obj !== "object") return undefined
  if (obj[targetKey] !== undefined) return obj[targetKey]
  for (const key of Object.keys(obj)) {
    const val = findKeyRecursive(obj[key], targetKey)
    if (val !== undefined) return val
  }
  return undefined
}

module.exports = {
  data: { name: "Get Custom Data" },
  category: "Custom Data",
  UI: [
    {
      element: "input",
      storeAs: "fileName",
      name: "File Name",
      placeholder: "customData.json (ej: customData.json, tickets.json, etc.)"
    },
    "-",
    {
      element: "input",
      storeAs: "dataName",
      name: "Data Name",
      placeholder: "Key a buscar"
    },
    "-",
    {
      element: "input",
      name: "Default Value",
      storeAs: "defaultValue"
    },
    "-",
    {
      element: "store",
      storeAs: "store"
    }
  ],
  compatibility: ["Any"],
  subtitle: (values, constants) => {
    return `File: ${values.fileName || "customData.json"} | Key: ${values.dataName} → ${constants.variable(values.store)}`
  },
  async run(values, message, client, bridge) {
    const fs = require("node:fs")
    const path = require("node:path")

    const botData = require("../data.json")
    const workingDir = path.normalize(process.cwd())
    let projectFolder
    if (
      workingDir.includes(path.join("common", "Bot Maker For Discord")) ||
      workingDir.endsWith("Bot Maker For Discord") ||
      fs.existsSync(path.join(workingDir, "AppData", "Kits", "EditorBones.js")) ||
      fs.existsSync(path.join(workingDir, "linux-data")) ||
      fs.existsSync(path.join(workingDir, "mac-data")) ||
      (fs.existsSync(path.join(workingDir, "stage1")) &&
        fs.existsSync(path.join(workingDir, "stage2")) &&
        fs.existsSync(path.join(workingDir, "stage3")) &&
        fs.existsSync(path.join(workingDir, "stage4")) &&
        fs.existsSync(path.join(workingDir, "stage5")))
    ) {
      projectFolder = botData.prjSrc
    } else {
      projectFolder = workingDir
    }

    let dataName = bridge.transf(values.dataName)
    let result = ""
    if (values.defaultValue != undefined) {
      result = bridge.transf(values.defaultValue)
    }

    // 1) Buscar en almacenamiento interno (bridge.data.IO) - recursivo en TODO
    const storedData = bridge.data.IO.get()
    result = findKeyRecursive(storedData, dataName)

    // 2) Fallback: buscar en archivo JSON de Toolkit - TODO el archivo
    if (result === "" || result === undefined) {
      let fileName = bridge.transf(values.fileName) || "customData"
      if (!fileName.endsWith(".json")) fileName += ".json"
      const toolkitDir = path.join(getProjectFolder(), "AppData", "Toolkit")
      const filePath = path.join(toolkitDir, fileName)
      
      if (fs.existsSync(filePath)) {
        try {
          const fileData = JSON.parse(fs.readFileSync(filePath, "utf8"))
          result = findKeyRecursive(fileData, dataName)
        } catch (e) { }
      }
    }

    // Return raw value - if result is an object with single key, extract the value
    let finalResult = result
    if (typeof result === "object" && result !== null && !Array.isArray(result)) {
      const keys = Object.keys(result)
      if (keys.length === 1) {
        finalResult = result[keys[0]]
      }
    }
    bridge.store(values.store, finalResult)
  },
};

function findKeyRecursive(obj, targetKey) {
  if (!obj || typeof obj !== "object") return undefined
  if (obj[targetKey] !== undefined) return obj[targetKey]
  for (const key of Object.keys(obj)) {
    const val = findKeyRecursive(obj[key], targetKey)
    if (val !== undefined) return val
  }
  return undefined
}