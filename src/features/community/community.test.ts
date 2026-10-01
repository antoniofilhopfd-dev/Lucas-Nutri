import { describe, it, expect } from "vitest";
import { postSchema, canPublish, hasPublicImageConsent, canModerate, publicName, likeCount, isCommunityImagePath } from "./rules";
describe("comunidade", () => {
  const clin = { consent_type: "clinical_use" as const, accepted: true, revoked_at: null };
  const pub = { consent_type: "public_use" as const, accepted: true, revoked_at: null };
  it("consentimento clínico não autoriza publicação", () => { expect(hasPublicImageConsent([clin])).toBe(false); expect(hasPublicImageConsent([pub])).toBe(true); expect(hasPublicImageConsent([{ ...pub, revoked_at: "2026-10-01" }])).toBe(false); });
  it("foto exige consentimento público e bucket da comunidade", () => {
    expect(canPublish({ image_path: "community-images/p/1.webp" }, [clin])).toMatch(/uso público/);
    expect(canPublish({ image_path: "community-images/p/1.webp" }, [pub])).toBeNull();
    expect(canPublish({ image_path: "patient-body-photos/p/a/front.webp" }, [pub])).toMatch(/clínicas/);
    expect(canPublish({}, [])).toBeNull(); expect(isCommunityImagePath("community-images/../x")).toBe(false);
  });
  it("paciente não publica conteúdo oficial", () => { expect(postSchema.safeParse({ kind: "official", body: "x" }).success).toBe(false); expect(postSchema.safeParse({ kind: "tip", body: "Beba água" }).success).toBe(true); });
  it("moderação", () => { expect(canModerate("visible", "hidden")).toBe(true); expect(canModerate("hidden", "visible")).toBe(true); expect(canModerate("deleted", "visible")).toBe(false); });
  it("nome público minimizado", () => { expect(publicName({ preferred_name: "Mari", full_name: "Marina Costa" })).toBe("Mari"); expect(publicName({ full_name: "Marina Costa" })).toBe("Marina"); });
  it("curtidas", () => expect(likeCount([{ post_id: "a" }, { post_id: "a" }, { post_id: "b" }], "a")).toBe(2));
});
