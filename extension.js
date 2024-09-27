const vscode = require("vscode");
const WebSocket = require("ws");

let connectionStatusItem;
let wss;
let activeConnection;

function activate(context) {
    console.log("macsploit-integration is now active!");

    connectionStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    connectionStatusItem.show();
    context.subscriptions.push(connectionStatusItem);

    let relaunch = vscode.commands.registerCommand("macsploit-integration.relaunch", () => {
        startWebSocketServer();
    });
    context.subscriptions.push(relaunch);

    let runCommand = vscode.commands.registerCommand("macsploit-integration.run", () => {
        const status = getConnectionStatus();
        if (status === "disconnected") {
            vscode.window.showWarningMessage("MacSploit is disconnected. Please connect first.");
        } else if (status === "relaunch") {
            vscode.window.showWarningMessage("MacSploit connection needs to be relaunched.");
        } else if (status === "connected") {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === "lua") {
                const luaFileText = editor.document.getText();
                const message = JSON.stringify({
                    op: "load",
                    string: luaFileText
                });
                
                if (activeConnection && activeConnection.readyState === WebSocket.OPEN) {
                    activeConnection.send(message);
                    vscode.window.showInformationMessage("Lua file sent to MacSploit.");
                } else {
                    vscode.window.showErrorMessage("WebSocket connection is not open.");
                }
            } else {
                vscode.window.showWarningMessage("No active Lua file to send.");
            }
        }
    });

    context.subscriptions.push(runCommand);

    startWebSocketServer();

    vscode.window.onDidChangeActiveTextEditor(updateRunButtonVisibility);
    updateRunButtonVisibility(vscode.window.activeTextEditor);
}

function getConnectionStatus() {
    if (connectionStatusItem.text.includes("Connected")) {
        return "connected";
    } else if (connectionStatusItem.text.includes("Disconnected")) {
        return "disconnected";
    } else if (connectionStatusItem.text.includes("Relaunch")) {
        return "relaunch";
    }
    return "unknown";
}

function updateRunButtonVisibility(editor) {
    if (editor && editor.document.languageId === "lua") {
        vscode.commands.executeCommand("setContext", "macsploit-integration.isLuaFile", true);
    } else {
        vscode.commands.executeCommand("setContext", "macsploit-integration.isLuaFile", false);
    }
}

function startWebSocketServer() {
    if (wss) {
        updateStatusBarItem("disconnected");
        wss.close();
    }

    updateStatusBarItem("disconnected");

    wss = new WebSocket.Server({ port: 8080 });

    wss.on("connection", (ws) => {
        console.log("Client connected");
        updateStatusBarItem("connected");
        activeConnection = ws;

        ws.on("close", () => {
            console.log("Client disconnected");
            updateStatusBarItem("disconnected");
            activeConnection = null;
        });

        ws.on("error", (error) => {
            console.error("WebSocket error:", error);
            updateStatusBarItem("relaunch");
            activeConnection = null;
        });
    });

    wss.on("error", (error) => {
        console.error("WebSocket server error:", error);
        updateStatusBarItem("relaunch");
    });

    wss.on("close", () => {
        console.log("WebSocket server closed");
        updateStatusBarItem("relaunch");
    });
}

function updateStatusBarItem(status) {
    if (status === "connected") {
        connectionStatusItem.text = "$(radio-tower) Connected to Macsploit";
        connectionStatusItem.color = new vscode.ThemeColor("statusBarItem.warningForeground");
        connectionStatusItem.command = undefined;
        vscode.window.showInformationMessage("Connected to Macsploit");
    } else if (status === "disconnected") {
        connectionStatusItem.text = "$(circle-slash) Disconnected from Macsploit";
        connectionStatusItem.color = new vscode.ThemeColor("statusBarItem.errorForeground");
        connectionStatusItem.command = undefined;
        vscode.window.showInformationMessage("Disconnected from Macsploit");
    } else if (status === "relaunch") {
        connectionStatusItem.text = "$(refresh) Relaunch Macsploit Connection";
        connectionStatusItem.color = new vscode.ThemeColor("statusBarItem.errorForeground");
        connectionStatusItem.command = "macsploit-integration.relaunch";
        vscode.window.showInformationMessage("Relaunching Macsploit Integration");
    }
    connectionStatusItem.tooltip = "discord.gg/enhancing";
}

function deactivate() {
    if (connectionStatusItem) {
        connectionStatusItem.dispose();
    }
    if (wss) {
        wss.close();
    }
}

module.exports = {
    activate,
    deactivate
};