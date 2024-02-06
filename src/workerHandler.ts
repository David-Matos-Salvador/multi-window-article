import { WindowState, WorkerMessage } from "./types";
import { didWindowChange, getCurrentWindowState } from "./windowState";

type StateWithId = { id: number; windowState: WindowState };
type OnSyncCallbackFunction = (allWindows: StateWithId[]) => void;

export class WindowWorkerHandler {
  currentWindow: WindowState = getCurrentWindowState();
  id: number;
  onSyncCallbacks: OnSyncCallbackFunction[] = [];
  worker: SharedWorker;

  constructor() {
    /* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta#resolving_a_file_relative_to_the_current_one */
    this.worker = new SharedWorker(new URL("worker.ts", import.meta.url));
    const connectedMessage: WorkerMessage = {
      action: "connected",
      payload: { state: this.currentWindow },
    };
    this.onSyncCallback = this.onSyncCallback.bind(this);
    this.worker.port.postMessage(connectedMessage);
    this.worker.port.onmessage = (ev: MessageEvent<WorkerMessage>) => {
      const msg = ev.data;
      switch (msg.action) {
        case "attributedId": {
          this.id = msg.payload.id;
          break;
        }
        case "sync": {
          console.log('sync ====>', { msg });
          this.onSyncCallback(msg.payload.allWindows);
          break;
        }
      }
    };
    /* https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event */
    window.addEventListener("beforeunload", () => {
      this.worker.port.postMessage({
        action: "windowUnloaded",
        payload: { id: this.id },
      } satisfies WorkerMessage); /* https://www.freecodecamp.org/news/typescript-satisfies-operator/  */
    });

  }

  private onSyncCallback(allWindows: StateWithId[]) {
    this.currentWindow = getCurrentWindowState();
    this.onSyncCallbacks.forEach((cb) => cb(allWindows));
  }

  onSync(cb: OnSyncCallbackFunction) {
    // TODO : send back the unregister
    this.onSyncCallbacks.push(cb);
  }

  windowHasChanged() {
    const newWindow = getCurrentWindowState();
    const oldWindow = this.currentWindow;
    if (
      didWindowChange({
        newWindow,
        oldWindow,
      })
    ) {
      this.currentWindow = newWindow;
      this.worker.port.postMessage({
        action: "windowStateChanged",
        payload: { id: this.id, newWindow, oldWindow },
      } satisfies WorkerMessage);
    }
  }
}
