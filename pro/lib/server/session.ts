export type DemoSession = {
  userId: string;
  dealerId: string;
  role: "fi_manager" | "director" | "admin";
};

export function getDemoSession(headers: Headers): DemoSession {
  return {
    userId: headers.get("x-revassist-user") ?? "demo-fi-manager",
    dealerId: headers.get("x-revassist-dealer") ?? "demo-powersports",
    role: "fi_manager"
  };
}
