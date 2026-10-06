import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  attachContinueContextTraceHeader,
  CONTINUE_CONTEXT_TRACE_HEADER,
  createContinueContextTraceCollector,
  isContinueContextTraceAuthorized,
} from "./continueContextTrace";

describe("continueContextTrace", () => {
  const prevCron = process.env.CRON_SECRET;
  const prevAdmin = process.env.ADMIN_SECRET;

  afterEach(() => {
    if (prevCron === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prevCron;
    if (prevAdmin === undefined) delete process.env.ADMIN_SECRET;
    else process.env.ADMIN_SECRET = prevAdmin;
  });

  it("serializes checkpoint names in order", () => {
    const trace = createContinueContextTraceCollector();
    trace.record("route_enter");
    trace.record("peek_enter");
    trace.record("before_rpc");
    expect(trace.serializeHeader()).toBe("route_enter,peek_enter,before_rpc");
  });

  it("authorizes trace when Authorization matches CRON_SECRET", () => {
    process.env.CRON_SECRET = "trace-secret";
    delete process.env.ADMIN_SECRET;
    const req = new NextRequest("http://localhost/api/v1/hosted-handoff/continue-context", {
      headers: { authorization: "Bearer trace-secret" },
    });
    expect(isContinueContextTraceAuthorized(req)).toBe(true);
  });

  it("rejects trace when Authorization is missing or wrong", () => {
    process.env.CRON_SECRET = "trace-secret";
    const req = new NextRequest("http://localhost/api/v1/hosted-handoff/continue-context");
    expect(isContinueContextTraceAuthorized(req)).toBe(false);
  });

  it("does not authorize when no server secret is configured", () => {
    delete process.env.CRON_SECRET;
    delete process.env.ADMIN_SECRET;
    const req = new NextRequest("http://localhost/api/v1/hosted-handoff/continue-context", {
      headers: { authorization: "Bearer anything" },
    });
    expect(isContinueContextTraceAuthorized(req)).toBe(false);
  });

  it("attaches trace header without leaking secrets", () => {
    const trace = createContinueContextTraceCollector();
    trace.record("route_enter");
    trace.record("peek_return_null");
    const headers = new Headers();
    attachContinueContextTraceHeader(headers, trace);
    expect(headers.get(CONTINUE_CONTEXT_TRACE_HEADER)).toBe("route_enter,peek_return_null");
    expect(headers.get(CONTINUE_CONTEXT_TRACE_HEADER)).not.toContain("secret");
  });
});
