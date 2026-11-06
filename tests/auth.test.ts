import { describe, expect, it } from "vitest";
import { checkPassword, decrypt, encrypt, hashPassword, hmac, sign, verify } from "@/lib/server/crypto";

describe("auth & crypto", () => {
  it("hashes and checks passwords with scrypt", () => {
    const h = hashPassword("demo1234");
    expect(h).not.toContain("demo1234");
    expect(checkPassword("demo1234", h)).toBe(true);
    expect(checkPassword("wrong", h)).toBe(false);
  });

  it("signs sessions and rejects tampering and expiry", () => {
    const t = sign({ uid: "u1", exp: Date.now() + 60000 });
    expect(verify<{ uid: string }>(t)?.uid).toBe("u1");
    const [p, s] = t.split(".");
    expect(verify(`${p}x.${s}`)).toBeNull();
    expect(verify(sign({ uid: "u1", exp: Date.now() - 1 }))).toBeNull();
    expect(verify(undefined)).toBeNull();
  });

  it("encrypts integration secrets at rest", () => {
    const e = encrypt("sk-live-123");
    expect(e.startsWith("enc:")).toBe(true);
    expect(e).not.toContain("sk-live-123");
    expect(decrypt(e)).toBe("sk-live-123");
  });

  it("produces stable webhook signatures", () => {
    expect(hmac("s", "1.{}")).toBe(hmac("s", "1.{}"));
    expect(hmac("s", "1.{}")).not.toBe(hmac("t", "1.{}"));
  });
});
