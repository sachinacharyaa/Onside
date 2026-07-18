import { EventEmitter } from "node:events";
import type { MatchEvent, MatchEventSource, MatchMeta } from "./types.js";

export type ReplayFile = {
  meta: MatchMeta;
  events: MatchEvent[];
};

export type ReplayClientOptions = {
  /** Milliseconds between emitted events. Default 1500. */
  intervalMs?: number;
};

/**
 * Replays a recorded (or hand-built) match timeline at accelerated speed.
 * Implements the exact same MatchEventSource interface as the live
 * TxLINE client, so swapping to live data is a config flip.
 */
export class ReplayClient extends EventEmitter implements MatchEventSource {
  readonly meta: MatchMeta;
  private readonly events: MatchEvent[];
  private readonly intervalMs: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private cursor = 0;

  constructor(replay: ReplayFile, opts: ReplayClientOptions = {}) {
    super();
    this.meta = replay.meta;
    this.events = [...replay.events].sort((a, b) => a.minute - b.minute);
    this.intervalMs = opts.intervalMs ?? 1500;
  }

  start(): void {
    if (this.timer) return;
    this.scheduleNext();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNext(): void {
    this.timer = setTimeout(() => {
      const event = this.events[this.cursor];
      if (!event) {
        this.stop();
        this.emit("end");
        return;
      }
      this.cursor += 1;
      this.emit("event", event);
      if (event.type === "fulltime") {
        this.stop();
        this.emit("end");
        return;
      }
      this.scheduleNext();
    }, this.intervalMs);
  }
}
