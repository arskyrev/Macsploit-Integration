# Macsploit-Integration
VSC Extension for Seamless Macsploit Execution

Insert Script in Autoexecute for Extension to work.


```lua
local WebSocket = WebSocket.connect("ws://localhost:8080")

local function fName()
    local milliseconds = math.floor((os.clock() % 1) * 1000)
    return "script"..tostring(milliseconds)..".lua"
end
 
WebSocket.OnMessage:Connect(function(message)
    local success, result = pcall(function()
        local data = game:GetService("HttpService"):JSONDecode(message)
        if data.op == "load" then
            local fileName = fName()
            writefile(fileName, data.string)

            local func, loadError = loadfile(fileName)
            if func then
                local execSuccess, execError = pcall(func)
                if not execSuccess then
                    error(execError)
                end
            else
                error(loadError)
            end
            
            delfile(fileName)
        end
    end)
    
    if not success then
        error(result)
    end
end)

WebSocket.OnClose:Connect(function()
    print("WebSocket connection closed")
end)
