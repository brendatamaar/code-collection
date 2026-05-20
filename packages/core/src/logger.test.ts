import { Writable } from "node:stream";

import { describe, expect, it } from "vitest";

import { createLogger } from "./logger.js";

class MemoryStream extends Writable {
  public chunks: string[] = [];

  public override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.chunks.push(chunk.toString());
    callback();
  }
}

describe("createLogger", () => {
  it("serializes JSON lines in CI mode", () => {
    const stream = new MemoryStream();
    const logger = createLogger({ level: "info", ci: true }, stream);

    logger.info({ event: "detect", stack: "spring" }, "detected stack");

    const parsed = JSON.parse(stream.chunks.join(""));
    expect(parsed).toMatchObject({
      level: 30,
      event: "detect",
      stack: "spring",
      msg: "detected stack"
    });
    expect(parsed.pid).toBeUndefined();
    expect(parsed.hostname).toBeUndefined();
  });

  it("honors log level filtering", () => {
    const stream = new MemoryStream();
    const logger = createLogger({ level: "warn", ci: true }, stream);

    logger.info("hidden");
    logger.warn("visible");

    expect(stream.chunks.join("")).not.toContain("hidden");
    expect(stream.chunks.join("")).toContain("visible");
  });

  it("creates a pretty logger outside CI mode", () => {
    const logger = createLogger({ level: "info", ci: false });

    expect(logger.level).toBe("info");
  });
});
