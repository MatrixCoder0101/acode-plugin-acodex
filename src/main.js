import plugin from "../plugin.json";
import style from "./style.scss";

// xtermjs
import { Terminal } from "xterm";
// xtermjs addons
import { FitAddon } from "xterm-addon-fit";
import { WebglAddon } from "xterm-addon-webgl";
import { SerializeAddon } from "xterm-addon-serialize";

// acode commopents & api
const alert = acode.require("alert");
const confirm = acode.require("confirm");
const prompt = acode.require("prompt");
const appSettings = acode.require("settings");
const helpers = acode.require("helpers");
const fsOperation = acode.require("fsOperation");

const { clipboard } = cordova.plugins;

// constants
const TERMINAL_STORE_PATH = window.DATA_STORAGE + "terminals";

class AcodeX {
  isDragging = false;
  startY;
  startHeight;
  // constants for dragable show terminal button
  isFlotBtnDragging = false;
  btnStartPosX;
  btnStartPosY;
  isTerminalMinimized = false;
  previousTerminalHeight;
  command = "";
  // default settings for terminal
  CURSOR_BLINK = true;
  SHOW_ARROW_BTN = false;
  CURSOR_STYLE1 = "block";
  CURSOR_STYLE2 = "underline";
  CURSOR_STYLE3 = "bar";
  FONT_SIZE = 10;
  SCROLLBACK = 1000;
  SCROLL_SENSITIVITY = 1000;
  // Terminal Theme Color
  BACKGROUND_COLOR = "#1c2431";
  FOREGROUND_COLOR = "#cccccc";
  SELECTIONBACKGROUND = "#399ef440";
  BLACK = "#666666";
  BLUE = "#399ef4";
  BRIGHT_BLACK = "#666666";
  BRIGHT_BLUE = "#399ef4";
  BRIGHT_CYAN = "#21c5c7";
  BRIGHT_GREEN = "#4eb071";
  BRIGHT_MAGENTA = "#b168df";
  BRIGHT_RED = "#da6771";
  BRIGHT_WHITE = "#efefef";
  BRIGHT_YELLOW = "#fff099";
  CYAN = "#21c5c7";
  GREEN = "#4eb071";
  MAGENTA = "#b168df";
  RED = "#da6771";
  WHITE = "#efefef";
  YELLOW = "#fff099";
  // New theme
  /*BACKGROUND_COLOR = "#1e2127";
    FOREGROUND_COLOR = "#c0c5ce";
    SELECTIONBACKGROUND = "#2c313c";
    BLACK = "#1e2127";
    BLUE = "#61afef";
    BRIGHT_BLACK = "#565c64";
    BRIGHT_BLUE = "#61afef";
    BRIGHT_CYAN = "#56b6c2";
    BRIGHT_GREEN = "#98c379";
    BRIGHT_MAGENTA = "#c678dd";
    BRIGHT_RED = "#e06c75";
    BRIGHT_WHITE = "#c0c5ce";
    BRIGHT_YELLOW = "#e5c07b";
    CYAN = "#56b6c2";
    GREEN = "#98c379";
    MAGENTA = "#c678dd";
    RED = "#e06c75";
    WHITE = "#c0c5ce";
    YELLOW = "#e5c07b";*/

  constructor() {
    if (!appSettings.value[plugin.id]) {
      appSettings.value[plugin.id] = {
        cursorBlink: this.CURSOR_BLINK,
        showArrowBtn: this.SHOW_ARROW_BTN,
        cursorStyle: this.CURSOR_STYLE1,
        fontSize: this.FONT_SIZE,
        scrollBack: this.SCROLLBACK,
        scrollSensitivity: this.SCROLL_SENSITIVITY,
        backgroundColor: this.BACKGROUND_COLOR,
        foregroundColor: this.FOREGROUND_COLOR,
        selectionBackground: this.SELECTIONBACKGROUND,
        black: this.BLACK,
        blue: this.BLUE,
        brightBlack: this.BRIGHT_BLACK,
        brightBlue: this.BRIGHT_BLUE,
        brightCyan: this.BRIGHT_CYAN,
        brightGreen: this.BRIGHT_GREEN,
        brightMagenta: this.BRIGHT_MAGENTA,
        brightRed: this.BRIGHT_RED,
        brightWhite: this.BRIGHT_WHITE,
        brightYellow: this.BRIGHT_YELLOW,
        cyan: this.CYAN,
        green: this.GREEN,
        magenta: this.MAGENTA,
        red: this.RED,
        white: this.WHITE,
        yellow: this.YELLOW,
      };
      appSettings.update(false);
    }
  }

  async init() {
    try {
      this.xtermCss = tag("link", {
        rel: "stylesheet",
        href: this.baseUrl + "xterm.css",
      });
      this.$style = tag("style", {
        textContent: style,
      });
      document.head.append(this.xtermCss, this.$style);
      // add command in command Pallete for opening and closing terminal
      editorManager.editor.commands.addCommand({
        name: "acodex:open_terminal",
        description: "Open Terminal",
        bindKey: { win: "Ctrl-K" },
        exec: this.openNewTerminal.bind(this),
      });
      editorManager.editor.commands.addCommand({
        name: "acodex:close_terminal",
        description: "Close Terminal",
        bindKey: { win: "Ctrl-J" },
        exec: this.closeTerminal.bind(this),
      });
      // main terminal container
      this.$terminalContainer = tag("div", {
        className: "terminal-container",
      });
      this.$terminalHeader = tag("div", {
        className: "terminal-header",
      });
      this.$terminalTitle = tag("h3", {
        textContent: "AcodeX",
      });
      const $controlBtn = tag("div", {
        className: "control-btn",
      });
      this.$formatPyCode = tag("button", {
        className: "format-pycode-btn",
      });
      this.$formatPyCode.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M439.8 200.5c-7.7-30.9-22.3-54.2-53.4-54.2h-40.1v47.4c0 36.8-31.2 67.8-66.8 67.8H172.7c-29.2 0-53.4 25-53.4 54.3v101.8c0 29 25.2 46 53.4 54.3 33.8 9.9 66.3 11.7 106.8 0 26.9-7.8 53.4-23.5 53.4-54.3v-40.7H226.2v-13.6h160.2c31.1 0 42.6-21.7 53.4-54.2 11.2-33.5 10.7-65.7 0-108.6zM286.2 404c11.1 0 20.1 9.1 20.1 20.3 0 11.3-9 20.4-20.1 20.4-11 0-20.1-9.2-20.1-20.4.1-11.3 9.1-20.3 20.1-20.3zM167.8 248.1h106.8c29.7 0 53.4-24.5 53.4-54.3V91.9c0-29-24.4-50.7-53.4-55.6-35.8-5.9-74.7-5.6-106.8.1-45.2 8-53.4 24.7-53.4 55.6v40.7h106.9v13.6h-147c-31.1 0-58.3 18.7-66.8 54.2-9.8 40.7-10.2 66.1 0 108.6 7.6 31.6 25.7 54.2 56.8 54.2H101v-48.8c0-35.3 30.5-66.4 66.8-66.4zm-6.7-142.6c-11.1 0-20.1-9.1-20.1-20.3.1-11.3 9-20.4 20.1-20.4 11 0 20.1 9.2 20.1 20.4s-9 20.3-20.1 20.3z"/></svg>`;
      this.$cdBtn = tag("button", {
        className: "cd-btn",
      });
      this.$cdBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-folder2-open" viewBox="0 0 16 16"><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v.64c.57.265.94.876.856 1.546l-.64 5.124A2.5 2.5 0 0 1 12.733 15H3.266a2.5 2.5 0 0 1-2.481-2.19l-.64-5.124A1.5 1.5 0 0 1 1 6.14V3.5zM2 6h12v-.5a.5.5 0 0 0-.5-.5H9c-.964 0-1.71-.629-2.174-1.154C6.374 3.334 5.82 3 5.264 3H2.5a.5.5 0 0 0-.5.5V6zm-.367 1a.5.5 0 0 0-.496.562l.64 5.124A1.5 1.5 0 0 0 3.266 14h9.468a1.5 1.5 0 0 0 1.489-1.314l.64-5.124A.5.5 0 0 0 14.367 7H1.633z"/></svg>`;
      this.$hideTermBtn = tag("button", {
        className: "hide-terminal-btn",
      });
      this.$hideTermBtn.innerHTML = `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" height="1.5em" width="1.5em"><path fill="currentColor" d="M15.5 25.5q-.65 0-1.075-.425Q14 24.65 14 24q0-.65.425-1.075.425-.425 1.075-.425h17q.65 0 1.075.425Q34 23.35 34 24q0 .65-.425 1.075-.425.425-1.075.425Z"/></svg>`;
      this.$closeTermBtn = tag("button", {
        className: "close-terminal-btn",
      });
      this.$closeTermBtn.innerHTML = `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" height="1.5em" width="1.5em"><path fill="currentColor" d="M24 26.1 13.5 36.6q-.45.45-1.05.45-.6 0-1.05-.45-.45-.45-.45-1.05 0-.6.45-1.05L21.9 24 11.4 13.5q-.45-.45-.45-1.05 0-.6.45-1.05.45-.45 1.05-.45.6 0 1.05.45L24 21.9l10.5-10.5q.45-.45 1.05-.45.6 0 1.05.45.45.45.45 1.05 0 .6-.45 1.05L26.1 24l10.5 10.5q.45.45.45 1.05 0 .6-.45 1.05-.45.45-1.05.45-.6 0-1.05-.45Z"/></svg>`;
      $controlBtn.append(
        ...[
          this.$formatPyCode,
          this.$cdBtn,
          this.$hideTermBtn,
          this.$closeTermBtn,
        ]
      );
      this.$terminalHeader.append(...[this.$terminalTitle, $controlBtn]);
      this.$terminalContent = tag("div", {
        className: "terminal-content",
      });
      this.$customContextMenu = tag("div", {
        className: "custom-context-menu",
        child: tag("div", {
          id: "paste-option",
          textContent: "Paste",
        }),
      });
      this.$terminalContent.append(this.$customContextMenu);
      this.$terminalContainer.append(
        this.$terminalHeader,
        this.$terminalContent
      );
      // show terminal button
      this.$showTermBtn = tag("button", {
        className: "show-terminal-btn",
      });
      this.$showTermBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-terminal" viewBox="0 0 16 16"><path d="M6 9a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3A.5.5 0 0 1 6 9zM3.854 4.146a.5.5 0 1 0-.708.708L4.793 6.5 3.146 8.146a.5.5 0 1 0 .708.708l2-2a.5.5 0 0 0 0-.708l-2-2z"/><path d="M2 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2H2zm12 1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h12z"/></svg>`;
      // append Terminal panel to app main
      app.get("main").append(this.$terminalContainer, this.$showTermBtn);

      this.$showTermBtn.classList.add("hide");
      this.$terminalContainer.classList.add("hide");

      // add event listnner to all buttons and terminal panel header
      this.$terminalHeader.addEventListener(
        "mousedown",
        this.startDragging.bind(this)
      );
      this.$terminalHeader.addEventListener(
        "touchstart",
        this.startDragging.bind(this)
      );

      this.$closeTermBtn.addEventListener(
        "click",
        this.closeTerminal.bind(this)
      );
      this.$hideTermBtn.addEventListener("click", this.minimise.bind(this));
      this.$cdBtn.addEventListener("click", this._cdToActiveDir.bind(this));
      this.$formatPyCode.addEventListener(
        "click",
        this._formatPythonCode.bind(this)
      );
      document
        .getElementById("paste-option")
        .addEventListener("click", this._handlePaste.bind(this));

      // add event listener for show terminal button
      this.$showTermBtn.addEventListener(
        "mousedown",
        this.startDraggingFlotingBtn.bind(this)
      );
      document.addEventListener("mousemove", this.dragFlotButton.bind(this));
      document.addEventListener("mouseup", this.stopDraggingFlotBtn.bind(this));
      this.$showTermBtn.addEventListener(
        "touchstart",
        this.startDraggingFlotingBtn.bind(this)
      );
      document.addEventListener("touchmove", this.dragFlotButton.bind(this));
      document.addEventListener(
        "touchend",
        this.stopDraggingFlotBtn.bind(this)
      );
      this.$showTermBtn.addEventListener("click", this.maxmise.bind(this));

      window.addEventListener("mousemove", this.drag.bind(this));
      window.addEventListener("touchmove", this.drag.bind(this));
      window.addEventListener("mouseup", this.stopDragging.bind(this));
      window.addEventListener("touchend", this.stopDragging.bind(this));
      window.addEventListener("resize", () => {
        if (
          !this.$terminalContainer.classList.contains("hide") ||
          this.$terminalContainer.style.height != "0px"
        ) {
          const totalHeaderHeight =
            document.querySelector("#root header").offsetHeight +
            document.querySelector("#root ul").offsetHeight;
          const totalFooterHeight =
            document.querySelector("#quick-tools").offsetHeight;
          const screenHeight =
            window.innerHeight - (totalHeaderHeight + totalFooterHeight);

          const currentHeight = parseInt(this.$terminalContainer.style.height);
          const adjustedHeight = Math.min(currentHeight, screenHeight);
          this.$terminalContainer.style.height = adjustedHeight + "px";
        }
        if (!this.$showTermBtn.classList.contains("hide")) {
          let totalHeaderHeight =
            document.querySelector("#root header").offsetHeight +
            document.querySelector("#root ul").offsetHeight;
          let maxY =
            window.innerHeight -
            totalHeaderHeight -
            this.$showTermBtn.offsetHeight;
          const currentY = parseInt(this.$showTermBtn.style.bottom);
          this.$showTermBtn.style.bottom =
            Math.max(0, Math.min(maxY, currentY)) + "px";
        }
      });

      this.$terminalContent.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        const { clientX, clientY } = event;
        const { left, top } = event.currentTarget.getBoundingClientRect();
        const offsetX = clientX - left;
        const offsetY = clientY - top;
        this.$customContextMenu.style.display = "block";
        this.$customContextMenu.style.left = `${offsetX}px`;
        this.$customContextMenu.style.top = `${offsetY}px`;
      });
      this.$terminalContent.addEventListener("click", () => {
        this.$customContextMenu.style.display = "none";
      });

      if (await fsOperation(TERMINAL_STORE_PATH).exists()) {
        const sessionFile = await fsOperation(TERMINAL_STORE_PATH).lsDir();
        if (sessionFile != []) {
          let terminalFileData = await fsOperation(
            TERMINAL_STORE_PATH + "/session1.json"
          ).readFile("utf8");
          let terminalState = JSON.parse(terminalFileData);
          this.openPreviousTerminal(
            terminalState.wsPort,
            terminalState.terminalContainerHeight,
            terminalState.terminalData
          );
        } else {
          await fsOperation(TERMINAL_STORE_PATH).delete();
        }
      }
    } catch (err) {
      alert("Warning", "Please Restart the app to use AcodeX");
    }
  }

  async openNewTerminal(termContainerHeight = 270) {
    /*
        open a new terminal in app
        */
    try {
      const port = await prompt("Port", "8767", "number", { required: true });
      if (port) {
        this.$terminalContainer.classList.remove("hide");
        this.$terminalContainer.style.height = termContainerHeight + "px";
        this._updateTerminalHeight.bind(this);
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }
        // initialise xtermjs Terminal class
        this.$terminal = this.terminalObj;
        this.$fitAddon = new FitAddon();
        this.$serializeAddon = new SerializeAddon();
        this.$terminal.loadAddon(this.$fitAddon);
        this.$terminal.loadAddon(this.$serializeAddon);
        this.$terminal.loadAddon(new WebglAddon());
        this.$terminal.open(this.$terminalContent);
        this._checkForKeyboardMode(this.$terminal);
        this.ws = new WebSocket(`ws://localhost:${port}/`);
        this.ws.binaryType = "arraybuffer";
        this.checkTerminalFolder();
        this._checkForWSMessage(
          this.ws,
          this.$terminal,
          this.$serializeAddon,
          port
        );
        this._actionForOnTerminalData(this.$terminal);
        this.$fitAddon.fit();
      }
    } catch (err) {
      window.alert(err);
    }
  }

  async openPreviousTerminal(port, terminalContainerHeight, previousTermState) {
    try {
      if (port) {
        this.$terminalContainer.classList.remove("hide");
        this.$terminalContainer.style.height = terminalContainerHeight + "px";
        this._updateTerminalHeight.bind(this);
        // initialise xtermjs Terminal class
        this.$terminal = this.terminalObj;
        this.$fitAddon = new FitAddon();
        this.$serializeAddon = new SerializeAddon();
        this.$terminal.loadAddon(this.$fitAddon);
        this.$terminal.loadAddon(this.$serializeAddon);
        this.$terminal.loadAddon(new WebglAddon());
        this.$terminal.open(this.$terminalContent);
        this._checkForKeyboardMode(this.$terminal);
        this.$terminal.write(previousTermState);
        this.ws = new WebSocket(`ws://localhost:${port}/`);
        this.ws.binaryType = "arraybuffer";
        this.checkTerminalFolder();
        this._checkForWSMessage(
          this.ws,
          this.$terminal,
          this.$serializeAddon,
          port
        );
        this._actionForOnTerminalData(this.$terminal);
        this.$fitAddon.fit();
      }
    } catch (err) {
      window.alert(err);
    }
  }

  _checkForKeyboardMode($terminal) {
    $terminal.textarea.addEventListener("focus", () => {
      // disable keyboard suggestion
      system.setInputType("NO_SUGGESTIONS_AGGRESSIVE");
    });
    $terminal.textarea.addEventListener("blur", () => {
      system.setInputType(appSettings.get("keyboardMode"));
    });
  }

  _updateTerminalHeight() {
    //const mainContainerHeight = window.innerHeight;
    const terminalHeaderHeight = this.$terminalHeader.offsetHeight;
    this.$terminalContent.style.height = `calc(100% - ${terminalHeaderHeight}px)`;
  }

  async _checkForWSMessage($ws, $terminal, $serializeAddon, port) {
    $ws.onmessage = async (ev) => {
      let data = ev.data;
      $terminal.write(typeof data === "string" ? data : new Uint8Array(data));
      let terminalState = $serializeAddon.serialize();
      let terminalCont = {
        wsPort: port,
        terminalContainerHeight: this.$terminalContainer.offsetHeight,
        terminalData: terminalState,
      };
      const fs = fsOperation(TERMINAL_STORE_PATH + "/session1.json");
      if (!(await fs.exists())) {
        await fsOperation(TERMINAL_STORE_PATH).createFile(
          "session1.json",
          terminalCont
        );
      } else {
        await fs.writeFile(terminalCont);
      }
    };
  }

  async checkTerminalFolder() {
    if (!(await fsOperation(TERMINAL_STORE_PATH).exists())) {
      await fsOperation(window.DATA_STORAGE).createDirectory("terminals");
    }
  }

  async _actionForOnTerminalData($terminal) {
    let cmdHistory = JSON.parse(localStorage.getItem("cmdHistory")) || [];
    let currentInputIndex = cmdHistory.length;

    $terminal.onKey((e) => {
      const printable =
        !e.domEvent.altKey &&
        !e.domEvent.altGraphKey &&
        !e.domEvent.ctrlKey &&
        !e.domEvent.metaKey;
      if (printable) {
        return;
      }
    });

    $terminal.onData((data) => {
      switch (data) {
        case "\u0003": // Ctrl+C
          $terminal.write("^C");
          this._sendData(data);
          break;
        case "\r": // Enter
          this._runCommand(this.$terminal, this.command);
          if (this.command.length > 0) {
            cmdHistory.push(this.command);
          }
          if (cmdHistory.length > 50) {
            cmdHistory.shift();
          }
          currentInputIndex = cmdHistory.length;
          localStorage.setItem("cmdHistory", JSON.stringify(cmdHistory));
          this.command = "";
          break;
        case "\u007F": // Backspace (DEL)
          // Do not delete the prompt
          if ($terminal._core.buffer.x > 4) {
            $terminal.write("\b \b");
            if (this.command.length > 0) {
              this.command = this.command.substr(0, this.command.length - 1);
            }
          }
          break;
        case "\u001B[A":
          if (currentInputIndex > 0) {
            // Only go back in history if we're not at the beginning
            currentInputIndex--;
            this._clearInput($terminal, this.command);
            $terminal.write(cmdHistory[currentInputIndex]); // Clear the current input and print the previous one
            this.command = cmdHistory[currentInputIndex];
          }
          break;
        case "\u001b[B": // If user pressed the down arrow key
          if (currentInputIndex < cmdHistory.length) {
            // Only go forward in history if we're not at the end
            currentInputIndex++;
            if (currentInputIndex === cmdHistory.length) {
              // If we're at the end, clear the input
              this._clearInput($terminal, this.command);
              this.command = "";
            } else {
              this._clearInput($terminal, this.command);
              this.command = cmdHistory[currentInputIndex];
              $terminal.write(cmdHistory[currentInputIndex]); // Clear the current input and print the next one
            }
          }
          break;
        case "\x16":
          clipboard.paste((text) => {
            this.command += text;
            $terminal.write(text);
          });
          break;
        default:
          if (
            (data >= String.fromCharCode(0x20) &&
              data <= String.fromCharCode(0x7e)) ||
            data >= "\u00a0"
          ) {
            this.command += data;
            $terminal.write(data);
          }
      }
    });
    $terminal.onBinary((data) => {
      return this._sendBinary(data);
    });
  }

  _handlePaste() {
    clipboard.paste((text) => {
      this.command += text;
      this.$terminal.write(text);
    });
  }

  _clearInput(term, cmd) {
    /*
        Clear the input area of the terminal
        */
    let inputLength = cmd.length;
    let sanetisedCmd = cmd.replace(/\s+$/, ""); // remove ending white space
    for (let i = 0; i < sanetisedCmd.length; i++) {
      term.write("\b \b");
    }
  }

  _runCommand(term, cmd) {
    /*
        run guven `cmd` in terminal
        */
    this._clearInput(term, cmd);
    this._sendData(cmd);
  }

  _sendData(data) {
    /*
        send command to backend via websocket
        */
    if (!this._checkOpenSocket()) {
      return;
    }
    this.ws.send(data);
  }

  _sendBinary(data) {
    /*
        send binary data to backend via websocket
        */
    if (!this._checkOpenSocket()) {
      return;
    }
    let buffer = new Uint8Array(data.length);
    for (let i = 0; i < data.length; ++i) {
      buffer[i] = data.charCodeAt(i) & 255;
    }
    this.ws.send(buffer);
  }

  _checkOpenSocket() {
    switch (this.ws.readyState) {
      case WebSocket.OPEN:
        return true;
      case WebSocket.CONNECTING:
        throw new Error("script was loaded before socket was open");
      case WebSocket.CLOSING:
        console.warn("socket is closing");
        return false;
      case WebSocket.CLOSED:
        throw new Error("socket is closed");
      default:
        throw new Error("Unexpected socket state");
    }
  }

  async closeTerminal() {
    /*
        remove terminal from  app
        */
    let confirmation = await confirm("Warning", "Are you sure ?");
    if (!confirmation) return;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.$terminalContent.innerHTML = "";
    if (!this.$terminalContainer.classList.contains("hide"))
      this.$terminalContainer.classList.add("hide");
    if (!this.$showTermBtn.classList.contains("hide"))
      this.$showTermBtn.classList.add("hide");
    await fsOperation(TERMINAL_STORE_PATH).delete();
    this.command = "";
    this.isTerminalMinimized = false;
    this.$terminalContainer.style.height = this.previousTerminalHeight;
  }

  startDraggingFlotingBtn(e) {
    try {
      this.isFlotBtnDragging = true;
      this.$showTermBtn.style.border = "2px solid #fff";
      if (e.type === "touchstart") {
        this.btnStartPosX = e.touches[0].clientX;
        this.btnStartPosY = e.touches[0].clientY;
      } else {
        this.btnStartPosX = e.clientX;
        this.btnStartPosY = e.clientY;
      }
    } catch (err) {
      window.alert(err);
    }
  }

  dragFlotButton(e) {
    try {
      if (!this.isFlotBtnDragging) return;
      e.preventDefault();
      let currentX, currentY;
      if (e.type === "touchmove") {
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
      } else {
        currentX = e.clientX;
        currentY = e.clientY;
      }
      let newX = this.btnStartPosX - currentX;
      let newY = this.btnStartPosY - currentY;

      this.btnStartPosX = currentX;
      this.btnStartPosY = currentY;

      let buttonBottom =
        window.innerHeight -
        (this.$showTermBtn.offsetTop + this.$showTermBtn.offsetHeight) +
        newY;
      let buttonLeft = this.$showTermBtn.offsetLeft - newX;
      let totalHeaderHeight =
        document.querySelector("#root header").offsetHeight +
        document.querySelector("#root ul").offsetHeight;
      let maxX = window.innerWidth - this.$showTermBtn.offsetWidth;
      let maxY =
        window.innerHeight - totalHeaderHeight - this.$showTermBtn.offsetHeight;

      this.$showTermBtn.style.bottom =
        Math.max(0, Math.min(maxY, buttonBottom)) + "px";
      this.$showTermBtn.style.left =
        Math.max(0, Math.min(maxX, buttonLeft)) + "px";
    } catch (err) {
      window.alert(err);
    }
  }

  stopDraggingFlotBtn() {
    try {
      this.isFlotBtnDragging = false;
      this.$showTermBtn.style.border = "none";
    } catch (err) {
      window.alert(err);
    }
  }

  startDragging(e) {
    if (e.type === "touchstart") {
      this.startY = e.touches[0].clientY;
    } else {
      e.preventDefault();
      this.startY = e.clientY;
    }
    this.startHeight = this.$terminalContainer.clientHeight;
    this.isDragging = true;
    this.$terminalContainer.style.borderTop =
      "2px solid var(--link-text-color)";
  }

  drag(e) {
    if (!this.isDragging) return;

    e.preventDefault();

    let currentY;
    if (e.type === "touchmove") {
      currentY = e.touches[0].clientY;
    } else {
      currentY = e.clientY;
    }
    const diffY = currentY - this.startY;

    let newHeight = this.startHeight - diffY;

    const totalHeaderHeight =
      document.querySelector("#root header").offsetHeight +
      document.querySelector("#root ul").offsetHeight;
    const totalFooterHeight =
      document.querySelector("#quick-tools").offsetHeight;
    const maximumHeight =
      window.innerHeight - (totalHeaderHeight + totalFooterHeight);
    const minimumHeight = 100;
    newHeight = Math.max(minimumHeight, Math.min(newHeight, maximumHeight));

    this.$terminalContainer.style.height = newHeight + "px";
    this._updateTerminalHeight.bind(this);
    this.$fitAddon.fit();
  }

  stopDragging(e) {
    this.isDragging = false;
    this.$terminalContainer.style.borderTop =
      "1px solid var(--popup-border-color)";
  }

  minimise() {
    /*
        hide terminal and active the show terminal button
        */
    try {
      if (!this.isTerminalMinimized) {
        this.previousTerminalHeight = window.getComputedStyle(
          this.$terminalContainer
        ).height;
        this.$terminalContainer.style.height = 0;
        this.isTerminalMinimized = true;
        this.$showTermBtn.classList.remove("hide");
      }
    } catch (err) {
      window.alert(err);
    }
  }

  maxmise() {
    /*
        show terminal and hide the show terminal button
        */
    if (this.isTerminalMinimized) {
      this.$terminalContainer.style.height = this.previousTerminalHeight;
      this.$showTermBtn.classList.add("hide");
      this.isTerminalMinimized = false;
    }
  }

  _convertPath(path) {
    if (path.startsWith("content://com.termux.documents/tree")) {
      let termuxPath = path
        .split("::")[1]
        .substring(0, path.split("::")[1].lastIndexOf("/"))
        .replace(/^\/data\/data\/com\.termux\/files\/home/, "$HOME");

      // Get the filename and extension
      let filename = path.substring(path.lastIndexOf("/") + 1);

      return {
        path: termuxPath,
        filename: filename,
      };
    } else if (path.startsWith("file:///storage/emulated/0/")) {
      let sdcardPath =
        "/sdcard" +
        path
          .substr("file:///storage/emulated/0".length)
          .replace(/\.[^/.]+$/, "")
          .split("/")
          .slice(0, -1)
          .join("/") +
        "/";

      // Get the filename
      let filename = path.substring(path.lastIndexOf("/") + 1);

      return {
        path: sdcardPath,
        filename: filename,
      };
    } else if (
      path.startsWith(
        "content://com.android.externalstorage.documents/tree/primary"
      )
    ) {
      let androidPath =
        "/sdcard/" +
        path
          .split("::primary:")[1]
          .substring(0, path.split("::primary:")[1].lastIndexOf("/"));

      // Get the filename
      let filename = path.substring(path.lastIndexOf("/") + 1);

      return {
        path: androidPath,
        filename: filename,
      };
    } else {
      return false;
    }
  }

  async _cdToActiveDir() {
    const { activeFile } = editorManager;
    const realPath = this._convertPath(activeFile.uri);
    if (!realPath) {
      window.toast("unsupported path type.", 3000);
      return;
    }
    this._sendData(`cd "${realPath.path}"`);
  }

  async _formatPythonCode() {
    const { activeFile } = editorManager;

    const realPath = this._convertPath(activeFile.uri);
    const fileType = helpers.getFileType(realPath.filename);
    if (fileType != "python") {
      window.toast("this is only for python files", 3000);
      return;
    }
    if (!realPath) {
      window.toast("unsupported path type.", 3000);
      return;
    }
    this._sendData(`black "${realPath.path + '/' + realPath.filename}"`);
  }

  async destroy() {
    editorManager.editor.commands.removeCommand("terminal:open_terminal");
    editorManager.editor.commands.removeCommand("terminal:close_terminal");
    this.$terminalContainer.remove();
    this.$showTermBtn.remove();
    document.removeEventListener("mousemove", this.dragFlotButton.bind(this));
    document.removeEventListener(
      "mouseup",
      this.stopDraggingFlotBtn.bind(this)
    );
    document.removeEventListener("touchmove", this.dragFlotButton.bind(this));
    document.removeEventListener(
      "touchend",
      this.stopDraggingFlotBtn.bind(this)
    );
    window.removeEventListener("mousemove", this.drag);
    window.removeEventListener("touchmove", this.drag);
    window.removeEventListener("mouseup", this.stopDragging);
    window.removeEventListener("touchend", this.stopDragging);
    if (await fsOperation(TERMINAL_STORE_PATH).exists()) {
      await fsOperation(TERMINAL_STORE_PATH).delete();
    }
  }

  get terminalObj() {
    return new Terminal({
      allowProposedApi: true,
      cursorBlink: this.settings.cursorBlink,
      cursorStyle: this.settings.cursorStyle,
      scrollBack: this.settings.scrollBack,
      scrollSensitivity: this.settings.scrollSensitivity,
      fontSize: this.settings.fontSize,
      fontFamily: '"Cascadia Code", Menlo, monospace',
      theme: {
        background: this.settings.backgroundColor,
        foreground: this.settings.foregroundColor,
        selectionBackground: this.settings.selectionBackground,
        black: this.settings.black,
        blue: this.settings.blue,
        brightBlack: this.settings.brightBlack,
        brightBlue: this.settings.brightBlue,
        brightCyan: this.settings.brightCyan,
        brightGreen: this.settings.brightGreen,
        brightMagenta: this.settings.brightMagenta,
        brightRed: this.settings.brightRed,
        brightWhite: this.settings.brightWhite,
        brightYellow: this.settings.brightYellow,
        cyan: this.settings.cyan,
        green: this.settings.green,
        magenta: this.settings.magenta,
        red: this.settings.red,
        white: this.settings.white,
        yellow: this.settings.yellow,
      },
    });
  }

  get settingsObj() {
    return {
      list: [
        {
          index: 0,
          key: "cursorBlink",
          text: "Cursor Blink",
          info: "Whether the cursor blinks.",
          checkbox: !!this.settings.cursorBlink,
        },
        {
          index: 1,
          key: "cursorStyle",
          text: "Cursor Style",
          value: this.settings.cursorStyle,
          info: "The style of the cursor.",
          select: [this.CURSOR_STYLE1, this.CURSOR_STYLE2, this.CURSOR_STYLE3],
        },
        {
          index: 2,
          key: "fontSize",
          text: "Font Size",
          value: this.settings.fontSize,
          info: "The font size used to render text.",
          prompt: "Font Size",
          promptType: "text",
          promptOption: [
            {
              match: /^[0-9]+$/,
              required: true,
            },
          ],
        },
        {
          index: 3,
          key: "scrollBack",
          text: "Scroll Back",
          value: this.settings.scrollBack,
          info: "The amount of scrollback in the terminal. Scrollback is the amount of rows that are retained when lines are scrolled beyond the initial viewport.",
          prompt: "Scroll Back",
          promptType: "number",
          promptOption: [
            {
              match: /^[0-9]+$/,
              required: true,
            },
          ],
        },
        {
          index: 4,
          key: "scrollSensitivity",
          text: "Scroll Sensitivity",
          value: this.settings.scrollSensitivity,
          info: "The scrolling speed multiplier used for adjusting normal scrolling speed.",
          prompt: "Scroll Sensitivity",
          promptType: "number",
          promptOption: [
            {
              match: /^[0-9]+$/,
              required: true,
            },
          ],
        },
        {
          index: 6,
          key: "backgroundColor",
          text: "Background Color",
          value: this.settings.backgroundColor,
          prompt: "Background Color",
          promptType: "text",
          promptOption: [
            {
              match: /^#([0-9A-Fa-f]{3}){1,2}$/,
              required: true,
            },
          ],
        },
        {
          index: 7,
          key: "foregroundColor",
          text: "Foreground Color",
          value: this.settings.foregroundColor,
          prompt: "Foreground Color",
          promptType: "text",
          promptOption: [
            {
              match: /^#([0-9A-Fa-f]{3}){1,2}$/,
              required: true,
            },
          ],
        },
        {
          index: 8,
          key: "selectionBackground",
          text: "Selection Background Color",
          value: this.settings.selectionBackground,
          prompt: "Selection Background Color",
          promptType: "text",
          promptOption: [
            {
              match: /^#([0-9A-Fa-f]{3}){1,2}$/,
              required: true,
            },
          ],
        },
        {
          index: 9,
          key: "black",
          text: "Black Color",
          value: this.settings.black,
          prompt: "Black Color",
          promptType: "text",
          promptOption: [
            {
              match: /^#([0-9A-Fa-f]{3}){1,2}$/,
              required: true,
            },
          ],
        },
        {
          index: 10,
          key: "blue",
          text: "Blue Color",
          value: this.settings.blue,
          prompt: "Blue Color",
          promptType: "text",
          promptOption: [
            {
              match: /^#([0-9A-Fa-f]{3}){1,2}$/,
              required: true,
            },
          ],
        },
        {
          index: 11,
          key: "brightBlack",
          text: "Bright Black Color",
          value: this.settings.brightBlack,
          prompt: "Bright Black Color",
          promptType: "text",
          promptOption: [
            {
              match: /^#([0-9A-Fa-f]{3}){1,2}$/,
              required: true,
            },
          ],
        },
        {
          index: 12,
          key: "brightBlue",
          text: "Bright Blue Color",
          value: this.settings.brightBlue,
          prompt: "Bright Blue Color",
          promptType: "text",
          promptOption: [
            {
              match: /^#([0-9A-Fa-f]{3}){1,2}$/,
              required: true,
            },
          ],
        },
        {
          index: 13,
          key: "brightCyan",
          text: "Bright Cyan Color",
          value: this.settings.brightCyan,
          prompt: "Bright Cyan Color",
          promptType: "text",
          promptOption: [
            {
              match: /^#([0-9A-Fa-f]{3}){1,2}$/,
              required: true,
            },
          ],
        },
        {
          index: 14,
          key: "brightGreen",
          text: "Bright Green Color",
          value: this.settings.brightGreen,
          prompt: "Bright Green Color",
          promptType: "text",
          promptOption: [
            {
              match: /^#([0-9A-Fa-f]{3}){1,2}$/,
              required: true,
            },
          ],
        },
        {
          index: 15,
          key: "brightMagenta",
          text: "Bright Magenta Color",
          value: this.settings.brightMagenta,
          prompt: "Bright Magenta Color",
          promptType: "text",
          promptOption: [
            {
              match: /^#([0-9A-Fa-f]{3}){1,2}$/,
              required: true,
            },
          ],
        },
        {
          index: 16,
          key: "brightRed",
          text: "Bright Red Color",
          value: this.settings.brightRed,
          prompt: "Bright Red Color",
          promptType: "text",
          promptOption: [
            {
              match: /^#([0-9A-Fa-f]{3}){1,2}$/,
              required: true,
            },
          ],
        },
        {
          index: 17,
          key: "brightWhite",
          text: "Bright White Color",
          value: this.settings.brightWhite,
          prompt: "Bright White Color",
          promptType: "text",
          promptOption: [
            {
              match: /^#([0-9A-Fa-f]{3}){1,2}$/,
              required: true,
            },
          ],
        },
        {
          index: 18,
          key: "brightYellow",
          text: "Bright Yellow Color",
          value: this.settings.brightYellow,
          prompt: "Bright Yellow Color",
          promptType: "text",
          promptOption: [
            {
              match: /^#([0-9A-Fa-f]{3}){1,2}$/,
              required: true,
            },
          ],
        },
        {
          index: 19,
          key: "cyan",
          text: "Cyan Color",
          value: this.settings.cyan,
          prompt: "Cyan Color",
          promptType: "text",
          promptOption: [
            {
              match: /^#([0-9A-Fa-f]{3}){1,2}$/,
              required: true,
            },
          ],
        },
        {
          index: 20,
          key: "green",
          text: "Green Color",
          value: this.settings.green,
          prompt: "Green Color",
          promptType: "text",
          promptOption: [
            {
              match: /^#([0-9A-Fa-f]{3}){1,2}$/,
              required: true,
            },
          ],
        },
        {
          index: 21,
          key: "magenta",
          text: "Magenta Color",
          value: this.settings.magenta,
          prompt: "Magenta Color",
          promptType: "text",
          promptOption: [
            {
              match: /^#([0-9A-Fa-f]{3}){1,2}$/,
              required: true,
            },
          ],
        },
        {
          index: 22,
          key: "red",
          text: "Red Color",
          value: this.settings.red,
          prompt: "Red Color",
          promptType: "text",
          promptOption: [
            {
              match: /^#([0-9A-Fa-f]{3}){1,2}$/,
              required: true,
            },
          ],
        },
        {
          index: 23,
          key: "white",
          text: "White Color",
          value: this.settings.white,
          prompt: "White Color",
          promptType: "text",
          promptOption: [
            {
              match: /^#([0-9A-Fa-f]{3}){1,2}$/,
              required: true,
            },
          ],
        },
        {
          index: 24,
          key: "yellow",
          text: "Yellow Color",
          value: this.settings.yellow,
          prompt: "Yellow Color",
          promptType: "text",
          promptOption: [
            {
              match: /^#([0-9A-Fa-f]{3}){1,2}$/,
              required: true,
            },
          ],
        },
      ],
      cb: (key, value) => {
        this.settings[key] = value;
        appSettings.update();
      },
    };
  }

  get settings() {
    return appSettings.value[plugin.id];
  }
}

if (window.acode) {
  const acodePlugin = new AcodeX();
  acode.setPluginInit(
    plugin.id,
    (baseUrl, $page, { cacheFileUrl, cacheFile }) => {
      if (!baseUrl.endsWith("/")) {
        baseUrl += "/";
      }
      acodePlugin.baseUrl = baseUrl;
      acodePlugin.init($page, cacheFile, cacheFileUrl);
    },
    acodePlugin.settingsObj
  );
  acode.setPluginUnmount(plugin.id, () => {
    acodePlugin.destroy();
  });
}
