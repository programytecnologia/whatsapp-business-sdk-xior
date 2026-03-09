import { createHmac } from "node:crypto";
import type { NextFunction, Response } from "express";
import {
  captureRawBody,
  type RawBodyRequest,
  verifyHubSignature,
} from "../../src/webhooks/helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const APP_SECRET = "test-app-secret-1234";
const BODY = Buffer.from(JSON.stringify({ object: "page", entry: [] }));
const VALID_SIG = `sha256=${createHmac("sha256", APP_SECRET).update(BODY).digest("hex")}`;

const makeReq = (sig?: string, rawBody?: Buffer): RawBodyRequest =>
  ({ headers: { "x-hub-signature-256": sig }, rawBody }) as unknown as RawBodyRequest;

const makeMocks = () => ({
  res: { sendStatus: jest.fn() } as unknown as Response,
  next: jest.fn() as NextFunction,
});

// ---------------------------------------------------------------------------
// verifyHubSignature
// ---------------------------------------------------------------------------

describe("verifyHubSignature", () => {
  it("calls next() when the signature is valid", () => {
    const { res, next } = makeMocks();
    verifyHubSignature(APP_SECRET)(makeReq(VALID_SIG, BODY), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.sendStatus).not.toHaveBeenCalled();
  });

  it("returns 403 when the signature is incorrect", () => {
    const { res, next } = makeMocks();
    // same length as a real sha256 hex sig but wrong value
    const wrongSig = `sha256=${"0".repeat(64)}`;
    verifyHubSignature(APP_SECRET)(makeReq(wrongSig, BODY), res, next);

    expect(res.sendStatus).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when the signature header is missing", () => {
    const { res, next } = makeMocks();
    verifyHubSignature(APP_SECRET)(makeReq(undefined, BODY), res, next);

    expect(res.sendStatus).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when rawBody is not present (captureRawBody not configured)", () => {
    const { res, next } = makeMocks();
    verifyHubSignature(APP_SECRET)(makeReq(VALID_SIG, undefined), res, next);

    expect(res.sendStatus).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 (no throw) when the sig string has a different length than expected", () => {
    const { res, next } = makeMocks();
    verifyHubSignature(APP_SECRET)(makeReq("sha256=short", BODY), res, next);

    expect(res.sendStatus).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects when the body is tampered but sig matches original body", () => {
    const { res, next } = makeMocks();
    const tamperedBody = Buffer.from(JSON.stringify({ object: "page", entry: [{ evil: true }] }));
    verifyHubSignature(APP_SECRET)(makeReq(VALID_SIG, tamperedBody), res, next);

    expect(res.sendStatus).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("uses the first value when the header is an array", () => {
    const { res, next } = makeMocks();
    const req = {
      headers: { "x-hub-signature-256": [VALID_SIG, "sha256=other"] },
      rawBody: BODY,
    } as unknown as RawBodyRequest;
    verifyHubSignature(APP_SECRET)(req, res, next);

    // First value is valid — should pass
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.sendStatus).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// captureRawBody
// ---------------------------------------------------------------------------

describe("captureRawBody", () => {
  it("sets rawBody on the request object", () => {
    const req = {} as RawBodyRequest;
    captureRawBody(
      req as Parameters<typeof captureRawBody>[0],
      {} as Parameters<typeof captureRawBody>[1],
      BODY,
    );

    expect(req.rawBody).toBe(BODY);
  });
});
