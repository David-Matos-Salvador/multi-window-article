import { WindowState, WorkerMessage } from "./types";

let clients: { port: MessagePort, id: number }[] = [];
let nextId: number = 0;
let windows: { windowState: WindowState; id: number; port: MessagePort }[] = [];

onconnect = ({ ports }: MessageEvent<WorkerMessage>) => {

  const port = ports[0];
  console.log('onconnect',clients);
  const sendSync = () => {
    windows.forEach((w) =>
      w.port.postMessage({
        action: "sync",
        payload: { allWindows: JSON.parse(JSON.stringify(windows)) },
      } satisfies WorkerMessage)
    );
  };
  nextId += 1;
  clients.push({ port, id: nextId });

  port.onmessage = function (event: MessageEvent<WorkerMessage>) {
    const msg = event.data;
    switch (msg.action) {
      case "connected": {
        console.log("connected", { nextId, msg, port });
        windows.push({
          id: nextId,
          windowState: msg.payload.state,
          port,
        });
        const message: WorkerMessage = {
          action: "attributedId",
          payload: { id: nextId },
        };
        port.postMessage(message);

        sendSync();

        break;
      }
      case "windowUnloaded": {
        const id = msg.payload.id;
        clients = clients.filter(client => client.id !== id)
        windows = windows.filter((windowItem) => windowItem.id !== id);
        sendSync();
        break;
      }
      case "windowStateChanged": {
        const { id, newWindow } = msg.payload;
        const oldWindowIndex = windows.findIndex((w) => w.id === id);
        if (oldWindowIndex !== -1) {
          windows[oldWindowIndex].windowState = newWindow;
          sendSync();
        }
        break;
      }
    }
  };

  port.onmessageerror = function () {
    console.error("oupsi doupsi!!!!!!!!!!");
  };
};

self.addEventListener("beforeunload", (event) => {
  console.warn("oupsi !!!!!!!");
  event.returnValue = `Are you sure you want to leave?`;
});
