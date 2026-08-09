/**
 * Source code for the Lemonade Studio companion Roblox Studio plugin.
 * Generated per-install so the backend URL is baked in.
 */
export function buildPluginSource(baseUrl: string, token = ""): string {
  const safeBase = baseUrl.replace(/["\\]/g, "").replace(/\/+$/, "");
  const safeToken = token.replace(/[^a-zA-Z0-9_-]/g, "");
  return `--!strict
--[[
	Lemonade Studio — companion plugin
	Connects an open Roblox Studio place to your Lemonade Studio project so the
	AI can create scripts, build instance trees, edit properties and read the
	Explorer hierarchy.

	Install: save as a .lua/.rbxm inside your Roblox Plugins folder, or right
	click a Script in Studio -> "Save as Local Plugin".

	Requires: Game Settings -> Security -> Allow HTTP Requests = ON
]]

local HttpService = game:GetService("HttpService")
local Selection = game:GetService("Selection")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local Terrain = workspace.Terrain

local BASE_URL = "${safeBase}"
local DEFAULT_TOKEN = "${safeToken}"
local POLL_INTERVAL = 1.5

local SETTING_TOKEN = "LemonadeStudio_Token"
local SETTING_URL = "LemonadeStudio_Url"

----------------------------------------------------------------------
-- Widget UI
----------------------------------------------------------------------

local toolbar = plugin:CreateToolbar("Lemonade Studio")
local button = toolbar:CreateButton("Lemonade", "Open the Lemonade Studio panel", "rbxasset://textures/ui/GuiImagePlaceholder.png")
button.ClickableWhenViewportHidden = true

local widget = plugin:CreateDockWidgetPluginGui(
	"LemonadeStudioPanel",
	DockWidgetPluginGuiInfo.new(Enum.InitialDockState.Right, false, false, 320, 380, 280, 320)
)
widget.Title = "Lemonade Studio"

local root = Instance.new("Frame")
root.Size = UDim2.fromScale(1, 1)
root.BackgroundColor3 = Color3.fromRGB(24, 25, 30)
root.BorderSizePixel = 0
root.Parent = widget

local padding = Instance.new("UIPadding")
padding.PaddingTop = UDim.new(0, 12)
padding.PaddingBottom = UDim.new(0, 12)
padding.PaddingLeft = UDim.new(0, 12)
padding.PaddingRight = UDim.new(0, 12)
padding.Parent = root

local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 8)
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Parent = root

local function label(text: string, size: number, color: Color3, order: number): TextLabel
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.Size = UDim2.new(1, 0, 0, size + 6)
	l.Font = Enum.Font.GothamMedium
	l.TextSize = size
	l.TextXAlignment = Enum.TextXAlignment.Left
	l.TextColor3 = color
	l.Text = text
	l.TextWrapped = true
	l.LayoutOrder = order
	l.Parent = root
	return l
end

label("LEMONADE STUDIO", 12, Color3.fromRGB(236, 214, 90), 1)
local statusLabel = label("Disconnected", 14, Color3.fromRGB(240, 120, 120), 2)
local projectLabel = label("No project", 12, Color3.fromRGB(150, 152, 160), 3)

label("Connection token", 12, Color3.fromRGB(150, 152, 160), 4)

local tokenBox = Instance.new("TextBox")
tokenBox.Size = UDim2.new(1, 0, 0, 30)
tokenBox.BackgroundColor3 = Color3.fromRGB(38, 39, 46)
tokenBox.BorderSizePixel = 0
tokenBox.Font = Enum.Font.Code
tokenBox.TextSize = 13
tokenBox.TextColor3 = Color3.fromRGB(235, 235, 240)
tokenBox.PlaceholderText = "paste token from the website"
tokenBox.ClearTextOnFocus = false
tokenBox.Text = plugin:GetSetting(SETTING_TOKEN) or DEFAULT_TOKEN
tokenBox.LayoutOrder = 5
tokenBox.Parent = root
local tokenCorner = Instance.new("UICorner")
tokenCorner.CornerRadius = UDim.new(0, 6)
tokenCorner.Parent = tokenBox

label("Server URL", 12, Color3.fromRGB(150, 152, 160), 6)

local urlBox = Instance.new("TextBox")
urlBox.Size = UDim2.new(1, 0, 0, 30)
urlBox.BackgroundColor3 = Color3.fromRGB(38, 39, 46)
urlBox.BorderSizePixel = 0
urlBox.Font = Enum.Font.Code
urlBox.TextSize = 12
urlBox.TextColor3 = Color3.fromRGB(235, 235, 240)
urlBox.ClearTextOnFocus = false
urlBox.Text = plugin:GetSetting(SETTING_URL) or BASE_URL
urlBox.LayoutOrder = 7
urlBox.Parent = root
local urlCorner = Instance.new("UICorner")
urlCorner.CornerRadius = UDim.new(0, 6)
urlCorner.Parent = urlBox

local connectButton = Instance.new("TextButton")
connectButton.Size = UDim2.new(1, 0, 0, 34)
connectButton.BackgroundColor3 = Color3.fromRGB(236, 214, 90)
connectButton.BorderSizePixel = 0
connectButton.Font = Enum.Font.GothamBold
connectButton.TextSize = 14
connectButton.TextColor3 = Color3.fromRGB(30, 30, 20)
connectButton.Text = "Connect"
connectButton.LayoutOrder = 8
connectButton.Parent = root
local btnCorner = Instance.new("UICorner")
btnCorner.CornerRadius = UDim.new(0, 6)
btnCorner.Parent = connectButton

local logLabel = label("", 11, Color3.fromRGB(130, 132, 142), 9)
logLabel.Size = UDim2.new(1, 0, 0, 90)
logLabel.TextYAlignment = Enum.TextYAlignment.Top

local logLines: { string } = {}
local function log(message: string)
	table.insert(logLines, 1, message)
	while #logLines > 6 do
		table.remove(logLines)
	end
	logLabel.Text = table.concat(logLines, "\\n")
end

local function setStatus(text: string, color: Color3)
	statusLabel.Text = text
	statusLabel.TextColor3 = color
end

----------------------------------------------------------------------
-- HTTP helpers
----------------------------------------------------------------------

local connected = false
local running = false
local token = tokenBox.Text
local baseUrl = urlBox.Text

local function request(path: string, body: { [string]: any }): (boolean, any)
	local ok, response = pcall(function()
		return HttpService:RequestAsync({
			Url = baseUrl .. path,
			Method = "POST",
			Headers = { ["Content-Type"] = "application/json" },
			Body = HttpService:JSONEncode(body),
		})
	end)

	if not ok then
		return false, tostring(response)
	end
	if not response.Success then
		return false, string.format("HTTP %d: %s", response.StatusCode, tostring(response.Body))
	end

	local decoded
	local decodeOk, decodeErr = pcall(function()
		decoded = HttpService:JSONDecode(response.Body)
	end)
	if not decodeOk then
		return false, "Bad JSON: " .. tostring(decodeErr)
	end
	return true, decoded
end

----------------------------------------------------------------------
-- Instance helpers
----------------------------------------------------------------------

local SERVICE_NAMES = {
	Workspace = true,
	ServerScriptService = true,
	ServerStorage = true,
	ReplicatedStorage = true,
	ReplicatedFirst = true,
	StarterGui = true,
	StarterPack = true,
	StarterPlayer = true,
	Lighting = true,
	SoundService = true,
	Teams = true,
	TextChatService = true,
}

-- Resolves a path like "ServerScriptService/Systems/Combat" into an instance.
-- When createMissing is true, missing segments become Folders.
local function resolvePath(path: string, createMissing: boolean): Instance?
	if path == nil or path == "" then
		return workspace
	end
	local segments = {}
	for segment in string.gmatch(path, "[^/%.]+") do
		table.insert(segments, segment)
	end
	if #segments == 0 then
		return workspace
	end

	local first = segments[1]
	local current: Instance
	if SERVICE_NAMES[first] then
		local ok, service = pcall(function()
			return game:GetService(first)
		end)
		if not ok or not service then
			return nil
		end
		current = service
	elseif first == "game" then
		current = game
	else
		current = workspace
		table.insert(segments, 1, "Workspace")
	end

	for index = 2, #segments do
		local name = segments[index]
		local child = current:FindFirstChild(name)
		if not child then
			if not createMissing then
				return nil
			end
			child = Instance.new("Folder")
			child.Name = name
			child.Parent = current
		end
		current = child
	end
	return current
end

local function toColor3(value: any): Color3?
	if typeof(value) == "table" and #value >= 3 then
		return Color3.fromRGB(value[1], value[2], value[3])
	end
	return nil
end

local function toVector3(value: any): Vector3?
	if typeof(value) == "table" and #value >= 3 then
		return Vector3.new(value[1], value[2], value[3])
	end
	return nil
end

local VECTOR_PROPS = { Size = true, Position = true, Orientation = true, Velocity = true, Scale = true }
local COLOR_PROPS = { Color = true, BrickColor = true, Color3 = true }

local function applyProperties(instance: Instance, properties: { [string]: any }?)
	if not properties then
		return
	end
	for key, value in pairs(properties) do
		local applied: any = value
		if VECTOR_PROPS[key] then
			applied = toVector3(value) or value
		elseif COLOR_PROPS[key] then
			applied = toColor3(value) or value
		elseif key == "Material" and typeof(value) == "string" then
			applied = (Enum.Material :: any)[value] or Enum.Material.Plastic
		elseif key == "Shape" and typeof(value) == "string" then
			applied = (Enum.PartType :: any)[value] or Enum.PartType.Block
		elseif key == "CFrame" and typeof(value) == "table" and #value >= 3 then
			applied = CFrame.new(value[1], value[2], value[3])
		end

		local ok, err = pcall(function()
			(instance :: any)[key] = applied
		end)
		if not ok then
			warn(string.format("[Lemonade] could not set %s.%s: %s", instance.Name, key, tostring(err)))
		end
	end
end

local function applyAttributes(instance: Instance, attributes: { [string]: any }?)
	if not attributes then
		return
	end
	for key, value in pairs(attributes) do
		pcall(function()
			instance:SetAttribute(key, value)
		end)
	end
end

-- Builds a node { className, name, properties, attributes, source, children }
local function buildNode(node: any, parent: Instance): Instance?
	local className = node.className or node.ClassName or "Folder"
	local ok, instance = pcall(function()
		return Instance.new(className)
	end)
	if not ok or not instance then
		warn("[Lemonade] unknown class: " .. tostring(className))
		return nil
	end

	instance.Name = node.name or node.Name or className

	if node.source and instance:IsA("LuaSourceContainer") then
		pcall(function()
			(instance :: any).Source = node.source
		end)
	end

	applyProperties(instance, node.properties)
	applyAttributes(instance, node.attributes)
	instance.Parent = parent

	if typeof(node.children) == "table" then
		for _, child in ipairs(node.children) do
			buildNode(child, instance)
		end
	end
	return instance
end

local MAX_TREE_NODES = 1500

local function serializeTree(instance: Instance, depth: number, budget: { count: number }): any
	if budget.count >= MAX_TREE_NODES or depth < 0 then
		return nil
	end
	budget.count += 1

	local node: any = {
		name = instance.Name,
		className = instance.ClassName,
	}
	if instance:IsA("LuaSourceContainer") then
		local ok, source = pcall(function()
			return (instance :: any).Source
		end)
		if ok and typeof(source) == "string" then
			node.lines = select(2, string.gsub(source, "\\n", "\\n")) + 1
			node.preview = string.sub(source, 1, 400)
		end
	end

	local children = instance:GetChildren()
	if #children > 0 and depth > 0 then
		local serializedChildren = {}
		for _, child in ipairs(children) do
			local serialized = serializeTree(child, depth - 1, budget)
			if serialized then
				table.insert(serializedChildren, serialized)
			end
		end
		if #serializedChildren > 0 then
			node.children = serializedChildren
		end
	end
	return node
end

local function collectPlaceTree(): any
	local budget = { count = 0 }
	local services = {
		"Workspace",
		"ServerScriptService",
		"ServerStorage",
		"ReplicatedStorage",
		"ReplicatedFirst",
		"StarterGui",
		"StarterPack",
		"StarterPlayer",
		"Lighting",
	}
	local roots = {}
	for _, name in ipairs(services) do
		local ok, service = pcall(function()
			return game:GetService(name)
		end)
		if ok and service then
			local serialized = serializeTree(service, 5, budget)
			if serialized then
				table.insert(roots, serialized)
			end
		end
	end
	return { name = game.Name, children = roots, nodeCount = budget.count }
end

----------------------------------------------------------------------
-- Command execution
----------------------------------------------------------------------

local handlers: { [string]: (any) -> any } = {}

handlers["create_script"] = function(payload)
	local parent = resolvePath(payload.parent or "ServerScriptService", true)
	if not parent then
		error("Could not resolve parent: " .. tostring(payload.parent))
	end
	local className = payload.className or "Script"
	local name = payload.name or "LemonadeScript"

	local existing = parent:FindFirstChild(name)
	local target: Instance
	if existing and existing:IsA("LuaSourceContainer") and existing.ClassName == className then
		target = existing
	else
		target = Instance.new(className)
		target.Name = name
		target.Parent = parent
	end
	;(target :: any).Source = payload.source or ""
	Selection:Set({ target })
	return { path = target:GetFullName(), created = existing == nil }
end

handlers["update_script"] = function(payload)
	local target = resolvePath(payload.path, false)
	if not target or not target:IsA("LuaSourceContainer") then
		error("Script not found: " .. tostring(payload.path))
	end
	;(target :: any).Source = payload.source or ""
	Selection:Set({ target })
	return { path = target:GetFullName() }
end

handlers["build_instances"] = function(payload)
	local parent = resolvePath(payload.parent or "Workspace", true)
	if not parent then
		error("Could not resolve parent: " .. tostring(payload.parent))
	end
	local nodes = payload.tree or payload.nodes or {}
	if nodes.className or nodes.ClassName then
		nodes = { nodes }
	end
	local created = {}
	for _, node in ipairs(nodes) do
		local instance = buildNode(node, parent)
		if instance then
			table.insert(created, instance:GetFullName())
		end
	end
	local selectable = {}
	for _, child in ipairs(parent:GetChildren()) do
		if table.find(created, child:GetFullName()) then
			table.insert(selectable, child)
		end
	end
	if #selectable > 0 then
		Selection:Set(selectable)
	end
	return { created = created, count = #created }
end

handlers["set_properties"] = function(payload)
	local target = resolvePath(payload.path, false)
	if not target then
		error("Instance not found: " .. tostring(payload.path))
	end
	applyProperties(target, payload.properties)
	applyAttributes(target, payload.attributes)
	return { path = target:GetFullName() }
end

handlers["delete_instance"] = function(payload)
	local target = resolvePath(payload.path, false)
	if not target then
		error("Instance not found: " .. tostring(payload.path))
	end
	local fullName = target:GetFullName()
	target:Destroy()
	return { path = fullName }
end

handlers["terrain_fill"] = function(payload)
	local regions = payload.regions or {}
	local filled = 0
	for _, region in ipairs(regions) do
		local material = (Enum.Material :: any)[region.material or "Grass"] or Enum.Material.Grass
		local position = Vector3.new(region.position[1], region.position[2], region.position[3])
		local size = Vector3.new(region.size[1], region.size[2], region.size[3])
		if region.shape == "ball" then
			Terrain:FillBall(position, math.max(size.X, size.Y, size.Z) / 2, material)
		elseif region.shape == "cylinder" then
			Terrain:FillCylinder(CFrame.new(position), size.Y, math.max(size.X, size.Z) / 2, material)
		else
			Terrain:FillBlock(CFrame.new(position), size, material)
		end
		filled += 1
	end
	return { regions = filled }
end

handlers["clear_terrain"] = function()
	Terrain:Clear()
	return { cleared = true }
end

handlers["get_tree"] = function()
	return collectPlaceTree()
end

handlers["read_script"] = function(payload)
	local target = resolvePath(payload.path, false)
	if not target or not target:IsA("LuaSourceContainer") then
		error("Script not found: " .. tostring(payload.path))
	end
	return { path = target:GetFullName(), source = (target :: any).Source }
end

local function executeCommand(command: any)
	local handler = handlers[command.type]
	if not handler then
		return false, nil, "Unsupported command type: " .. tostring(command.type)
	end

	local recording = ChangeHistoryService:TryBeginRecording("Lemonade: " .. tostring(command.type))
	local ok, result = pcall(handler, command.payload or {})
	if recording then
		ChangeHistoryService:FinishRecording(
			recording,
			ok and Enum.FinishRecordingOperation.Commit or Enum.FinishRecordingOperation.Cancel
		)
	end

	if not ok then
		return false, nil, tostring(result)
	end
	return true, result, nil
end

----------------------------------------------------------------------
-- Connection loop
----------------------------------------------------------------------

local function reportResult(commandId: string, ok: boolean, result: any, err: string?)
	local success, response = request("/api/public/plugin/result", {
		token = token,
		commandId = commandId,
		status = ok and "done" or "error",
		result = result,
		error = err,
	})
	if not success then
		log("report failed: " .. tostring(response))
	end
end

local function pollOnce()
	local ok, response = request("/api/public/plugin/poll", {
		token = token,
		placeName = game.Name,
		placeId = tostring(game.PlaceId),
	})

	if not ok then
		setStatus("Connection error", Color3.fromRGB(240, 120, 120))
		log(tostring(response))
		return
	end

	setStatus("Connected", Color3.fromRGB(120, 220, 150))
	if response.projectName then
		projectLabel.Text = response.projectName
	end

	local commands = response.commands or {}
	if #commands == 0 then
		return
	end

	setStatus("Syncing (" .. #commands .. ")", Color3.fromRGB(236, 214, 90))
	for _, command in ipairs(commands) do
		local success, result, err = executeCommand(command)
		if success then
			log("[ok] " .. tostring(command.type))
		else
			log("[err] " .. tostring(command.type) .. ": " .. tostring(err))
		end
		reportResult(command.id, success, result, err)
	end
	setStatus("Connected", Color3.fromRGB(120, 220, 150))
end

local function startLoop()
	if running then
		return
	end
	running = true
	task.spawn(function()
		while running and connected do
			local ok, err = pcall(pollOnce)
			if not ok then
				log("loop error: " .. tostring(err))
			end
			task.wait(POLL_INTERVAL)
		end
		running = false
	end)
end

local function connect()
	token = tokenBox.Text:gsub("%s", "")
	baseUrl = urlBox.Text:gsub("%s", ""):gsub("/+$", "")

	if token == "" then
		setStatus("Token required", Color3.fromRGB(240, 120, 120))
		return
	end

	plugin:SetSetting(SETTING_TOKEN, token)
	plugin:SetSetting(SETTING_URL, baseUrl)

	setStatus("Connecting...", Color3.fromRGB(236, 214, 90))
	local ok, response = request("/api/public/plugin/connect", {
		token = token,
		placeName = game.Name,
		placeId = tostring(game.PlaceId),
	})

	if not ok then
		connected = false
		setStatus("Failed", Color3.fromRGB(240, 120, 120))
		log(tostring(response))
		return
	end

	connected = true
	projectLabel.Text = response.projectName or "Project"
	connectButton.Text = "Reconnect"
	setStatus("Connected", Color3.fromRGB(120, 220, 150))
	log("connected to " .. tostring(response.projectName))

	-- Send the Explorer tree immediately so the AI has context.
	task.spawn(function()
		local tree = collectPlaceTree()
		local sent, sendErr = request("/api/public/plugin/tree", {
			token = token,
			placeName = game.Name,
			tree = tree,
		})
		if not sent then
			log("tree upload failed: " .. tostring(sendErr))
		else
			log("explorer tree synced (" .. tostring(tree.nodeCount) .. " nodes)")
		end
	end)

	startLoop()
end

connectButton.Activated:Connect(connect)

button.Click:Connect(function()
	widget.Enabled = not widget.Enabled
end)

plugin.Unloading:Connect(function()
	running = false
	connected = false
end)

if tokenBox.Text ~= "" then
	task.defer(connect)
end
`;
}
