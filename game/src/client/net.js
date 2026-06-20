// Thin WebSocket client. Surfaces the welcome handshake and state snapshots via
// callbacks and auto-reconnects if the connection drops.

import { MSG, encode, decode } from '../shared/protocol.js';

export class NetClient {
  constructor(url) {
    this.url = url;
    this.id = null;
    this.level = null;
    this.connected = false;
    this.onWelcome = null;
    this.onState = null;
    this.onLevel = null; // (levelMeta) => void  campaign progression
    this.onStatus = null; // (connected: boolean) => void
    this._shouldReconnect = true;
  }

  connect() {
    this._shouldReconnect = true;
    this._open();
    return this;
  }

  _open() {
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.connected = true;
      this.onStatus && this.onStatus(true);
    };
    ws.onmessage = (ev) => {
      const m = decode(typeof ev.data === 'string' ? ev.data : ev.data.toString());
      if (!m) return;
      if (m.t === MSG.WELCOME) {
        this.id = m.id;
        this.level = m.level;
        this.onWelcome && this.onWelcome(m);
      } else if (m.t === MSG.STATE) {
        this.onState && this.onState(m.snap);
      } else if (m.t === MSG.LEVEL) {
        this.level = m.level;
        this.onLevel && this.onLevel(m.level);
      }
    };
    ws.onclose = () => {
      this.connected = false;
      this.onStatus && this.onStatus(false);
      if (this._shouldReconnect) setTimeout(() => this._open(), 1000);
    };
    ws.onerror = () => ws.close();
  }

  close() {
    this._shouldReconnect = false;
    this.ws && this.ws.close();
  }

  _send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(encode(msg));
  }

  join(name) {
    this._send({ t: MSG.JOIN, name });
  }
  sendInput(input) {
    this._send({ t: MSG.INPUT, input });
  }
  addBot() {
    this._send({ t: MSG.ADD_BOT });
  }
  removeBot() {
    this._send({ t: MSG.REMOVE_BOT });
  }
  restart() {
    this._send({ t: MSG.RESTART });
  }
}
