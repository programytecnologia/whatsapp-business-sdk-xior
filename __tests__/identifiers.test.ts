import type { WebhookMessage } from "../src/types";
import {
  getUserChangedUserIdEvent,
  isBsuid,
  isUserChangedUserIdSystemMessage,
  resolveRecipient,
} from "../src/utils/identifiers";

describe("WhatsApp identifier helpers", () => {
  describe("isBsuid", () => {
    it.each([
      ["US.13491208655302741918", true],
      ["BR.abc123", true],
      ["gb.A1B2C3", true],
      ["USA.123", false],
      ["U.123", false],
      ["US.", false],
      ["US.abc-123", false],
      ["+16505551234", false],
      ["16505551234", false],
      ["US.abc_123", false],
    ])("returns %s for %s", (value, expected) => {
      expect(isBsuid(value)).toBe(expected);
    });
  });

  describe("resolveRecipient", () => {
    it.each([
      [{ wa_id: "16505551234" }, { to: "16505551234" }],
      [{ user_id: "US.13491208655302741918" }, { recipient: "US.13491208655302741918" }],
      [{ wa_id: "16505551234", user_id: "US.13491208655302741918" }, { to: "16505551234" }],
    ])("resolves %#", (input, expected) => {
      expect(resolveRecipient(input)).toEqual(expected);
    });

    it("throws when no identifier is available", () => {
      expect(() => resolveRecipient({})).toThrow("Either wa_id or user_id must be provided");
    });
  });

  describe("user_changed_user_id system events", () => {
    const system = {
      body: "User changed their phone number",
      identity: "identity-hash",
      new_wa_id: "16505559876",
      wa_id: "16505559876",
      customer: "16505551234",
      user_id: "US.999999999",
      parent_user_id: "US.parent999",
      type: {
        customer_changed_number: false,
        customer_identity_changed: false,
        user_changed_user_id: true,
      },
    };
    const systemMessage: WebhookMessage = {
      type: "system",
      id: "wamid.system1",
      timestamp: "1739321000",
      system,
    };

    it("narrows user_changed_user_id system messages", () => {
      expect(isUserChangedUserIdSystemMessage(systemMessage)).toBe(true);
    });

    it("returns an ergonomic identity-change payload", () => {
      expect(getUserChangedUserIdEvent(systemMessage)).toEqual({
        body: "User changed their phone number",
        identity: "identity-hash",
        customer: "16505551234",
        wa_id: "16505559876",
        new_wa_id: "16505559876",
        user_id: "US.999999999",
        parent_user_id: "US.parent999",
      });
    });

    it("returns undefined for other system messages", () => {
      expect(
        getUserChangedUserIdEvent({
          ...systemMessage,
          system: {
            ...system,
            type: {
              ...system.type,
              user_changed_user_id: false,
            },
          },
        }),
      ).toBeUndefined();
    });
  });
});
