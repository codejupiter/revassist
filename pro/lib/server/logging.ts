type LogField = string | number | boolean | null | undefined;

type LogFields = Record<string, LogField>;

function compact(fields: LogFields) {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
}

export function requestContext(request: Request, route: string): LogFields {
  return {
    route,
    requestId: request.headers.get("x-vercel-id") ?? request.headers.get("x-request-id") ?? "local",
    deployment: process.env.VERCEL_URL ?? "local"
  };
}

export function logInfo(event: string, fields: LogFields = {}) {
  console.log(JSON.stringify(compact({ level: "info", event, ts: new Date().toISOString(), ...fields })));
}

export function logWarn(event: string, fields: LogFields = {}) {
  console.warn(JSON.stringify(compact({ level: "warn", event, ts: new Date().toISOString(), ...fields })));
}

export function logError(event: string, fields: LogFields = {}) {
  console.error(JSON.stringify(compact({ level: "error", event, ts: new Date().toISOString(), ...fields })));
}
