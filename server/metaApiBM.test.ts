/**
 * Vitest — BM Auto-Discovery helpers (Round 7.23 Phase 1)
 * Tests: testBMConnection + discoverBMAccounts
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { testBMConnection, discoverBMAccounts } from "./metaApi";

beforeAll(() => {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "test-secret";
  }
});

const fetchSpy = vi.spyOn(globalThis, "fetch");

afterEach(() => {
  fetchSpy.mockReset();
});

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("testBMConnection", () => {
  it("returns ok=true and BM info on happy path", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonRes({ id: "user_99", name: "John Doe" }))
      .mockResolvedValueOnce(jsonRes({ id: "1234567890", name: "Richbiotech BM" }));

    const r = await testBMConnection("1234567890", "EAAB-test");
    expect(r.ok).toBe(true);
    expect(r.bmName).toBe("Richbiotech BM");
    expect(r.meName).toBe("John Doe");
    expect(r.category).toBe("ok");
  });

  it("returns ok=false with token_expired classification on /me OAuthException 190", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonRes(
        {
          error: {
            message: "Session has expired",
            type: "OAuthException",
            code: 190,
            fbtrace_id: "abc",
          },
        },
        400,
      ),
    );

    const r = await testBMConnection("1234567890", "EAAB-bad");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.category).toBe("token_expired");
      expect(r.httpStatus).toBe(400);
    }
  });

  it("returns ok=false with app_blocked when code 200 'API access blocked'", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonRes(
        {
          error: {
            message: "API access blocked.",
            type: "OAuthException",
            code: 200,
            fbtrace_id: "xyz",
          },
        },
        400,
      ),
    );

    const r = await testBMConnection("1234567890", "EAAB-blocked");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.category).toBe("app_blocked");
    }
  });

  it("rejects when /me ok but /{bm_id} returns code 100 (BM not found)", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonRes({ id: "user_99", name: "John Doe" }))
      .mockResolvedValueOnce(
        jsonRes(
          {
            error: {
              message: "Unsupported get request",
              type: "GraphMethodException",
              code: 100,
              fbtrace_id: "bbb",
            },
          },
          400,
        ),
      );

    const r = await testBMConnection("9999999999", "EAAB-test");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.meName).toBe("John Doe"); // /me succeeded
      expect(r.category).toBe("account_not_found");
    }
  });
});

describe("discoverBMAccounts", () => {
  it("returns owned + client accounts mapped + counted", async () => {
    fetchSpy
      // /me
      .mockResolvedValueOnce(jsonRes({ id: "user_99", name: "John Doe" }))
      // /{bm_id}
      .mockResolvedValueOnce(jsonRes({ id: "1234567890", name: "Richbiotech BM" }))
      // /owned_ad_accounts
      .mockResolvedValueOnce(
        jsonRes({
          data: [
            {
              id: "act_111",
              name: "RB-Owned-A",
              account_status: 1,
              currency: "THB",
              timezone_name: "Asia/Bangkok",
            },
            {
              id: "act_222",
              name: "RB-Owned-B",
              account_status: 1,
              currency: "THB",
              timezone_name: "Asia/Bangkok",
            },
          ],
        }),
      )
      // /client_ad_accounts
      .mockResolvedValueOnce(
        jsonRes({
          data: [
            {
              id: "act_999",
              name: "Client-Z",
              account_status: 2,
              currency: "USD",
              timezone_name: "Asia/Bangkok",
            },
          ],
        }),
      );

    const r = await discoverBMAccounts("1234567890", "EAAB-test");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.ownedAccounts.length).toBe(2);
      expect(r.clientAccounts.length).toBe(1);
      expect(r.totalCount).toBe(3);
      expect(r.ownedAccounts[0].bmAdAccountId).toBe("act_111");
      expect(r.ownedAccounts[0].ownership).toBe("owned");
      expect(r.clientAccounts[0].ownership).toBe("client");
      expect(r.clientAccounts[0].accountStatus).toBe(2);
    }
  });

  it("returns empty arrays + ok=false when token connection fails", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonRes(
        {
          error: {
            message: "API access blocked.",
            type: "OAuthException",
            code: 200,
          },
        },
        400,
      ),
    );

    const r = await discoverBMAccounts("1234567890", "EAAB-blocked");
    expect(r.ok).toBe(false);
    expect(r.totalCount).toBe(0);
    expect(r.ownedAccounts).toEqual([]);
    expect(r.clientAccounts).toEqual([]);
    if (!r.ok) {
      expect(r.category).toBe("app_blocked");
    }
  });

  it("propagates fetch error during discover (after BM auth ok)", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonRes({ id: "user_99", name: "John Doe" }))
      .mockResolvedValueOnce(jsonRes({ id: "1234567890", name: "BM" }))
      .mockResolvedValueOnce(
        jsonRes(
          {
            error: {
              message: "Application request limit reached",
              type: "OAuthException",
              code: 4,
            },
          },
          400,
        ),
      )
      .mockResolvedValueOnce(jsonRes({ data: [] }));

    const r = await discoverBMAccounts("1234567890", "EAAB-test");
    expect(r.ok).toBe(false);
    expect(r.totalCount).toBe(0);
    if (!r.ok) {
      expect(r.category).toBe("rate_limit");
    }
  });
});
