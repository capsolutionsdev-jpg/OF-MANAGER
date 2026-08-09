import { describe, it, expect } from "vitest";
import { isDisposableEmail, isValidEmail } from "@/lib/demo/disposable";

describe("isValidEmail()", () => {
  it("accepte un e-mail valide", () => {
    expect(isValidEmail("jean.dupont@of.fr")).toBe(true);
  });
  it("refuse un format invalide", () => {
    expect(isValidEmail("pas-un-email")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("isDisposableEmail()", () => {
  it("détecte les domaines jetables (insensible à la casse)", () => {
    expect(isDisposableEmail("test@yopmail.com")).toBe(true);
    expect(isDisposableEmail("TEST@Mailinator.com")).toBe(true);
    expect(isDisposableEmail("x@10minutemail.com")).toBe(true);
  });
  it("laisse passer les domaines pro/persos", () => {
    expect(isDisposableEmail("contact@monof.fr")).toBe(false);
    expect(isDisposableEmail("jean@gmail.com")).toBe(false);
  });
});
