module.exports = {
  data: { name: "Control Custom Data", source: { type: "string", value: "" } },
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
    {
      element: "input",
      storeAs: "fileName",
      name: "File Name (solo List/Custom)",
      placeholder: "customData"
    },
    "_",
    {
      element: "input",
      storeAs: "dataName",
      name: "Data Name",
      placeholder: "Key"
    },
    "_",
    {
      element: "dropdown",
      name: "Control",
      storeAs: "control",
      extraField: "controlValue",
      choices: [
        {name: "Add To Value", placeholder: "Value To Add", field: true},
        {name: "Overwrite", placeholder: "New Value", field: true},
      ]
    }
  ],
  compatibility: ["Any"],
  subtitle: (values, constants) => {
    let type = values.target || "Server"
    return `${type} | Data: ${values.dataName} - ${values.control} (${values.controlValue})`
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

    // halfDropdown: type en values.target, custom ID en values.customId
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

    let dataName = bridge.transf(values.dataName)
    let addValue = bridge.transf(values.controlValue)
    let currentData = ""

    // Usar bridge.data.IO para tipos estándar (igual que acciones oficiales)
    const useInternalStorage = ["Server", "User", "Member", "Channel", "Role"].includes(type)
    let storedData
    let filePath
    let toolkitDir

    if (useInternalStorage) {
      // Usar almacenamiento interno del bot (igual que acciones oficiales)
      storedData = bridge.data.IO.get()
      if (!storedData[key]) storedData[key] = {}
      if (!storedData[key][id]) storedData[key][id] = {}
      currentData = storedData[key][id][dataName] || ""
    } else {
      // List y Custom -> archivo JSON personalizado
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

      let fileName = bridge.transf(values.fileName) || "customData"
      if (!fileName.endsWith(".json")) fileName += ".json"

      toolkitDir = path.join(projectFolder, "AppData", "Toolkit")
      filePath = path.join(toolkitDir, fileName)

      storedData = {}
      if (fs.existsSync(filePath)) {
        try { storedData = JSON.parse(fs.readFileSync(filePath, "utf8")) } catch (e) { storedData = {} }
      }
      if (!storedData.users) storedData.users = {}
      if (!storedData.guilds) storedData.guilds = {}
      if (!storedData.members) storedData.members = {}
      if (!storedData.channels) storedData.channels = {}
      if (!storedData.lists) storedData.lists = {}
      if (!storedData.roles) storedData.roles = {}
      if (!storedData.custom) storedData.custom = {}

      if (type === "List") {
        currentData = storedData.lists[dataName] || ""
      } else { // Custom ID
        if (!storedData.custom[id]) storedData.custom[id] = {}
        currentData = storedData.custom[id][dataName] || ""
      }
    }

    if (values.control == "Add To Value") {
      if (!isNaN(parseFloat(currentData)) && !isNaN(parseFloat(addValue)) && currentData !== "" && addValue !== "") {
        currentData = Number(currentData) + Number(addValue)
      } else {
        currentData = `${currentData}${addValue}`
      }
    } else {
      currentData = bridge.transf(values.controlValue)
    }

    // Guardar
    if (["Server", "User", "Member", "Channel", "Role"].includes(type)) {
      // Almacenamiento interno del bot (igual que acciones oficiales)
      storedData = bridge.data.IO.get()
      if (!storedData[key]) storedData[key] = {}
      if (!storedData[key][id]) storedData[key][id] = {}
      storedData[key][id][dataName] = currentData
      bridge.data.IO.write(storedData)
    } else {
      // List/Custom -> archivo JSON
      if (type === "List") {
        storedData.lists[dataName] = currentData
      } else { // Custom
        if (!storedData.custom[id]) storedData.custom[id] = {}
        storedData.custom[id][dataName] = currentData
      }
      if (!fs.existsSync(toolkitDir)) fs.mkdirSync(toolkitDir, { recursive: true })
      fs.writeFileSync(filePath, JSON.stringify(storedData, null, 2))
    }
  },
};