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

// fileName siempre como input manual
const fileNameUI = { element: "input", storeAs: "fileName", name: "File Name", placeholder: "customData.json" }

module.exports = {
  data: { name: "Delete Custom Data" },
  category: "Custom Data",
  UI: [
    {
      element: "halfDropdown",
      storeAs: "target",
      extraField: "customId",
      name: "Data Type",
      choices: [
        { name: "Server" },
        { name: "User" },
        { name: "Member" },
        { name: "Channel" },
        { name: "Role" },
        { name: "List" },
        { name: "Custom ID", field: true }
      ],
    },
    "_",
    fileNameUI,
    "-",
    {
      element: "dropdown",
      storeAs: "deleteType",
      extraField: "delete",
      name: "Delete Type",
      choices: [
        { name: "All Data (delete entire section/file)" },
        { name: "Specific Data", placeholder: "Data Name (key)", field: true },
      ]
    }
  ],
  compatibility: ["Any"],
  subtitle: (values, constants) => {
    let type = values.target || "Server"
    if (values.deleteType === "All Data (delete entire section/file)") {
      return `Delete All | ${type}`
    }
    return `Delete Specific: ${values.delete || ""} | ${type}`
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

    let type = values.target || "Server"
    let td = {}
    if (type === "Server") td.guild = { type: "current", value: "" }
    else if (type === "User" || type === "Member") td.user = { type: "author", value: "" }
    else if (type === "Channel") td.channel = { type: "command", value: "" }
    else if (type === "Role") td.role = { type: "id", value: "" }
    else if (type === "Custom ID") td.customId = values.customId || ""

    const TYPE_KEYS = {
      Server: "guilds",
      User: "users",
      Member: "members",
      Channel: "channels",
      Role: "roles",
      List: "lists",
      "Custom ID": "custom"
    }
    const key = TYPE_KEYS[type] || "guilds"

    let id = null
    if (type === "Server") {
      let guild = await bridge.getGuild(td.guild || { type: "current", value: "" })
      id = guild.id
    } else if (type === "User") {
      let user = await bridge.getUser(td.user || { type: "author", value: "" })
      id = user.id
    } else if (type === "Member") {
      let user = await bridge.getUser(td.user || { type: "author", value: "" })
      id = `${user.member.guildID}${user.id}`
    } else if (type === "Channel") {
      let channel = await bridge.getChannel(td.channel || { type: "command", value: "" })
      id = channel.id
    } else if (type === "Role") {
      let role = await bridge.getRole(td.role || { type: "id", value: "" })
      id = role.id
    } else if (type === "Custom ID") {
      id = bridge.transf(td.customId || "")
    }

    const useInternalStorage = ["Server", "User", "Member", "Channel", "Role"].includes(type)

    if (useInternalStorage) {
      // Almacenamiento interno del bot (igual que Delete Server Data oficial)
      let storedData = bridge.data.IO.get()
      if (values.deleteType === "All Data (delete entire section/file)") {
        if (storedData[key] && storedData[key][id]) {
          delete storedData[key][id]
        }
      } else {
        let dataName = bridge.transf(values.delete)
        if (dataName && storedData[key] && storedData[key][id]) {
          delete storedData[key][id][dataName]
        }
      }
      bridge.data.IO.write(storedData)
    } else {
      // List y Custom -> archivo JSON personalizado
      let fileName = bridge.transf(values.fileName) || "customData"
      if (!fileName.endsWith(".json")) fileName += ".json"

      const toolkitDir = path.join(getProjectFolder(), "AppData", "Toolkit")
      const filePath = path.join(toolkitDir, fileName)

      if (!fs.existsSync(filePath)) return

      let storedData = {}
      try { storedData = JSON.parse(fs.readFileSync(filePath, "utf8")) } catch (e) { return }

      if (values.deleteType === "All Data (delete entire section/file)") {
        if (type === "List") {
          delete storedData.lists[id]
        } else { // Custom ID
          if (storedData.custom && storedData.custom[id]) {
            delete storedData.custom[id]
          }
        }
      } else {
        let dataName = bridge.transf(values.delete)
        if (!dataName) return
        if (type === "List") {
          if (storedData.lists && storedData.lists[dataName] != undefined) {
            delete storedData.lists[dataName]
          }
        } else { // Custom ID
          if (storedData.custom && storedData.custom[id] && storedData.custom[id][dataName] != undefined) {
            delete storedData.custom[id][dataName]
          }
        }
      }

      fs.writeFileSync(filePath, JSON.stringify(storedData, null, 2))
    }
  },
};