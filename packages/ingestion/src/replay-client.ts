import { EventEmitter } from "node:events";
import type { MatchEvent, MatchEventSource, MatchMeta } from "./types.js";

export type ReplayFile = {
  meta: MatchMeta;
  events: MatchEvent[];
};

export type ReplayClientOptions = {
  /**
   * Fixed ms between events when timestamp pacing is unavailable
   * (or when `speed` is unset / <= 0). Default 1500.
   */
  intervalMs?: number;
  /**
   * Playback multiplier over real event timestamps.
   * e.g. 60 → a 2-hour match finishes in ~2 minutes.
   * When set (> 0), delays are `(Δt_real / speed)`, clamped to [minGapMs, maxGapMs].
   */
  speed?: number;
  /** Floor gap between events under speed mode. Default 40ms. */
  minGapMs?: number;
  /** Cap gap between events under speed mode. Default 5000ms — keeps demos readable. */
  maxGapMs?: number;
};

function eventTimeMs(event: MatchEvent): number {
  const t = Date.parse(event.timestamp);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Replays a recorded (or hand-built) match timeline at accelerated speed.
 * Implements the exact same MatchEventSource interface as the live
 * TxLINE client, so swapping to live data is a config flip.
 */
export class ReplayClient extends EventEmitter implements MatchEventSource {
  readonly meta: MatchMeta;
  /** Mirrors TxlineClient.normalizer.lastScoreSeq for settlement preferredSeq. */
  readonly normalizer: { lastScoreSeq: number | null };
  private readonly events: MatchEvent[];
  private readonly intervalMs: number;
  private readonly speed: number;
  private readonly minGapMs: number;
  private readonly maxGapMs: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private cursor = 0;

  constructor(replay: ReplayFile, opts: ReplayClientOptions = {}) {
    super();
    this.meta = replay.meta;
    this.events = [...replay.events].sort((a, b) => {
      const dt = eventTimeMs(a) - eventTimeMs(b);
      if (dt !== 0) return dt;
      return a.minute - b.minute;
    });
    this.intervalMs = opts.intervalMs ?? 1500;
    this.speed = opts.speed ?? 0;
    this.minGapMs = opts.minGapMs ?? 40;
    this.maxGapMs = opts.maxGapMs ?? 5000;
    this.normalizer = {
      lastScoreSeq: replay.meta.finalSeq ?? null,
    };
  }

  start(): void {
    if (this.timer) return;
    this.scheduleNext(0);
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private delayBefore(index: number): number {
    if (this.speed <= 0 || index <= 0) return this.intervalMs;
    const prev = eventTimeMs(this.events[index - 1]!);
    const cur = eventTimeMs(this.events[index]!);
    if (!prev || !cur || cur <= prev) return this.minGapMs;
    const scaled = (cur - prev) / this.speed;
    return Math.min(this.maxGapMs, Math.max(this.minGapMs, scaled));
  }

  private scheduleNext(delayMs: number): void {
    this.timer = setTimeout(() => {
      const event = this.events[this.cursor];
      if (!event) {
        this.stop();
        this.emit("end");
        return;
      }
      if (typeof event.seq === "number" && event.seq >= 1) {
        this.normalizer.lastScoreSeq = event.seq;
      }
      this.cursor += 1;
      this.emit("event", event);
      if (event.type === "fulltime") {
        this.stop();
        this.emit("end");
        return;
      }
      this.scheduleNext(this.delayBefore(this.cursor));
    }, delayMs);
  }
}
