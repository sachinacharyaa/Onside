import { EventEmitter } from "node:events";
import { TxlineNormalizer } from "./txline-normalize.js";
import type { MatchEvent, MatchEventSource, MatchMeta } from "./types.js";

export type TxlineClientOptions = {
  /** API origin, e.g. https://txline-dev.txodds.com (devnet) or https://txline.txodds.com (mainnet). */
  apiUrl: string;
  /** Activated long-lived API token from /api/token/activate (see @onside/txline-setup). */
  apiToken: string;
  /** TxLINE fixture id to follow, e.g. from /api/fixtures/snapshot. */
  fixtureId: number;
  /** Minimum ms between emitted odds ticks. Default 5000. */
  oddsThrottleMs?: number;
};

type SseMessage = { id?: string; event?: string; data: string };

/**
 * Live TxLINE (txodds) adapter. Authenticates with a guest JWT + activated
 * API token, resolves fixture metadata, then consumes the scores and odds
 * SSE streams, normalizing everything into MatchEvent.
 *
 * Implements the exact same MatchEventSource interface as ReplayClient —
 * swapping live/replay is a config flip (`USE_REPLAY_MODE`), never a
 * downstream code change.
 *
 * Docs: https://txline.txodds.com/documentation/examples/streaming-data
 */
export class TxlineClient extends EventEmitter implements MatchEventSource {
  readonly meta: MatchMeta;
  private readonly opts: Required<TxlineClientOptions>;
  readonly normalizer: TxlineNormalizer;
  private jwt: string | null = null;
  private stopped = true;
  private aborters: AbortController[] = [];

  constructor(opts: TxlineClientOptions) {
    super();
    this.opts = { oddsThrottleMs: 5000, ...opts, apiUrl: opts.apiUrl.replace(/\/$/, "") };
    this.normalizer = new TxlineNormalizer(opts.fixtureId);
    this.meta = {
      matchId: `txline-${opts.fixtureId}`,
      homeTeam: "Home",
      awayTeam: "Away",
      competition: "TxLINE live feed",
    };
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    void this.run();
  }

  stop(): void {
    this.stopped = true;
    for (const aborter of this.aborters) aborter.abort();
    this.aborters = [];
  }

  private async renewJwt(): Promise<string> {
    const res = await fetch(`${this.opts.apiUrl}/auth/guest/start`, { method: "POST" });
    if (!res.ok) throw new Error(`guest auth failed: ${res.status}`);
    const body = (await res.json()) as { token: string };
    this.jwt = body.token;
    return this.jwt;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bearer ${this.jwt}`,
      "X-Api-Token": this.opts.apiToken,
      ...extra,
    };
  }

  private async apiGet(path: string): Promise<any> {
    if (!this.jwt) await this.renewJwt();
    let res = await fetch(`${this.opts.apiUrl}${path}`, { headers: this.headers() });
    if (res.status === 401) {
      await this.renewJwt();
      res = await fetch(`${this.opts.apiUrl}${path}`, { headers: this.headers() });
    }
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
    return res.json();
  }

  private async run(): Promise<void> {
    try {
      await this.renewJwt();
      await this.resolveFixtureMeta();
      await this.seedFromSnapshots();
      await Promise.all([this.consumeStream("scores"), this.consumeStream("odds")]);
    } catch (err) {
      if (!this.stopped) {
        this.emit("error", err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  private async resolveFixtureMeta(): Promise<void> {
    try {
      const fixtures = (await this.apiGet("/api/fixtures/snapshot")) as any[];
      const fixture = fixtures.find(
        (f) => Number(f.FixtureId ?? f.fixtureId) === this.opts.fixtureId,
      );
      if (!fixture) {
        this.meta.competition = `TxLINE fixture ${this.opts.fixtureId}`;
        return;
      }
      const p1IsHome = fixture.Participant1IsHome ?? fixture.participant1IsHome ?? true;
      const p1 = String(
        fixture.Participant1 ?? fixture.participant1 ?? `Team ${fixture.Participant1Id ?? "1"}`,
      );
      const p2 = String(
        fixture.Participant2 ?? fixture.participant2 ?? `Team ${fixture.Participant2Id ?? "2"}`,
      );
      this.meta.homeTeam = p1IsHome ? p1 : p2;
      this.meta.awayTeam = p1IsHome ? p2 : p1;
      this.meta.competition = String(
        fixture.Competition ??
          fixture.competition ??
          `TxLINE competition ${fixture.CompetitionId ?? fixture.competitionId ?? ""}`.trim(),
      );
    } catch {
      /* Metadata is cosmetic; the pipeline works without it. */
    }
  }

  /** Prime score/odds state from snapshots so we don't start blind mid-match. */
  private async seedFromSnapshots(): Promise<void> {
    try {
      const scores = (await this.apiGet(
        `/api/scores/snapshot/${this.opts.fixtureId}`,
      )) as any[];
      const rows = Array.isArray(scores) ? scores : [scores];
      // Apply chronologically (Seq ascending) so goals accumulate correctly.
      rows
        .filter(Boolean)
        .sort((a, b) => Number(a.Seq ?? a.seq ?? 0) - Number(b.Seq ?? b.seq ?? 0))
        .forEach((record) => this.emitEvents(this.normalizer.scoreRecordToEvents(record)));
    } catch {
      /* fixture may not have started yet */
    }
    try {
      const odds = (await this.apiGet(`/api/odds/snapshot/${this.opts.fixtureId}`)) as any[];
      const rows = Array.isArray(odds) ? odds : [odds];
      for (const record of rows) {
        if (!record) continue;
        const event = this.normalizer.oddsRecordToEvent(record, 0);
        if (event) this.emitEvents([event]);
      }
    } catch {
      /* no odds yet */
    }
  }

  private emitEvents(events: MatchEvent[]): void {
    for (const event of events) {
      this.emit("event", event);
      if (event.type === "fulltime") {
        this.stop();
        this.emit("end");
        return;
      }
    }
  }

  private async consumeStream(kind: "scores" | "odds"): Promise<void> {
    let backoffMs = 2000;
    while (!this.stopped && !this.normalizer.isFinished) {
      const aborter = new AbortController();
      this.aborters.push(aborter);
      try {
        if (!this.jwt) await this.renewJwt();
        const res = await fetch(`${this.opts.apiUrl}/api/${kind}/stream`, {
          headers: this.headers({ Accept: "text/event-stream", "Cache-Control": "no-cache" }),
          signal: aborter.signal,
        });
        if (res.status === 401) {
          await this.renewJwt();
          continue;
        }
        if (!res.ok) throw new Error(`${kind} stream failed: ${res.status}`);

        backoffMs = 2000;
        for await (const message of this.readSse(res)) {
          if (this.stopped) return;
          if (message.event === "heartbeat" || !message.data) continue;
          let record: any;
          try {
            record = JSON.parse(message.data);
          } catch {
            continue;
          }
          // Streams are multiplexed across fixtures — ignore others.
          const fid = Number(record?.FixtureId ?? record?.fixtureId);
          if (Number.isFinite(fid) && fid !== this.opts.fixtureId) continue;

          if (kind === "scores") {
            this.emitEvents(this.normalizer.scoreRecordToEvents(record));
          } else {
            const event = this.normalizer.oddsRecordToEvent(record, this.opts.oddsThrottleMs);
            if (event) this.emitEvents([event]);
          }
        }
      } catch (err) {
        if (this.stopped) return;
        this.emit("error", err instanceof Error ? err : new Error(String(err)));
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        backoffMs = Math.min(backoffMs * 2, 30_000);
      } finally {
        this.aborters = this.aborters.filter((a) => a !== aborter);
      }
    }
  }

  private async *readSse(res: Response): AsyncGenerator<SseMessage> {
    if (!res.body) throw new Error("stream response has no body");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep = buffer.match(/\r?\n\r?\n/);
        while (sep?.index !== undefined) {
          const block = buffer.slice(0, sep.index);
          buffer = buffer.slice(sep.index + sep[0].length);
          const message = this.parseSseBlock(block);
          if (message) yield message;
          sep = buffer.match(/\r?\n\r?\n/);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private parseSseBlock(block: string): SseMessage | null {
    const message: SseMessage = { data: "" };
    for (const line of block.split(/\r?\n/)) {
      if (!line || line.startsWith(":")) continue;
      const i = line.indexOf(":");
      const field = i === -1 ? line : line.slice(0, i);
      const value = i === -1 ? "" : line.slice(i + 1).replace(/^ /, "");
      if (field === "data") message.data += (message.data ? "\n" : "") + value;
      if (field === "event") message.event = value;
      if (field === "id") message.id = value;
    }
    return message.data || message.event ? message : null;
  }
}
