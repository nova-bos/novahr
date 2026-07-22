import { describe, it, expect } from "vitest";
import { isNotificationVisibleTo } from "./visibility";

const hr = { role: "hr", employeeId: "e-hr" };
const exco = { role: "exco", employeeId: undefined };
const manager = { role: "manager", employeeId: "e-mgr" };
const employee = { role: "employee", employeeId: "e-emp" };

const broadcastHr = { audienceRole: "hr", recipientEmployeeId: null };
const broadcastManager = { audienceRole: "manager", recipientEmployeeId: null };
const personalEmp = { audienceRole: null, recipientEmployeeId: "e-emp" };

describe("isNotificationVisibleTo", () => {
  it("returns false when there is no user", () => {
    expect(isNotificationVisibleTo(broadcastHr, null)).toBe(false);
  });

  it("shows all broadcasts to hr and exco", () => {
    expect(isNotificationVisibleTo(broadcastHr, hr)).toBe(true);
    expect(isNotificationVisibleTo(broadcastManager, hr)).toBe(true);
    expect(isNotificationVisibleTo(broadcastHr, exco)).toBe(true);
  });

  it("shows only manager-audience broadcasts to managers, never HR-internal", () => {
    expect(isNotificationVisibleTo(broadcastManager, manager)).toBe(true);
    expect(isNotificationVisibleTo(broadcastHr, manager)).toBe(false);
    expect(isNotificationVisibleTo({ audienceRole: null, recipientEmployeeId: null }, manager)).toBe(false);
  });

  it("never shows broadcasts to employees", () => {
    expect(isNotificationVisibleTo(broadcastManager, employee)).toBe(false);
    expect(isNotificationVisibleTo(broadcastHr, employee)).toBe(false);
  });

  it("shows personal notifications only to the named recipient", () => {
    expect(isNotificationVisibleTo(personalEmp, employee)).toBe(true);
    expect(isNotificationVisibleTo(personalEmp, manager)).toBe(false);
    expect(isNotificationVisibleTo(personalEmp, hr)).toBe(false);
    // hr sees their own personal notification
    expect(isNotificationVisibleTo({ audienceRole: null, recipientEmployeeId: "e-hr" }, hr)).toBe(true);
  });
});
