import { getDB } from "./db";

// Runtime for connected integrations. "live" connectors call real APIs with the user's credentials;
// every other catalog app runs in "simulated" mode so the agent tool surface is exercised end-to-end.

export interface IntegrationActionSpec {
  appId: string;
  action: string;
  description: string;
  input: Record<string, string>; // field -> description
  write: boolean;
}

export const LIVE_ACTIONS: IntegrationActionSpec[] = [
  { appId: "github", action: "list_issues", description: "List open issues in a repository", input: { repo: "owner/name" }, write: false },
  { appId: "github", action: "list_pulls", description: "List open pull requests in a repository", input: { repo: "owner/name" }, write: false },
  { appId: "github", action: "create_issue", description: "Create a GitHub issue", input: { repo: "owner/name", title: "Issue title", body: "Markdown body" }, write: true },
  { appId: "slack", action: "post_message", description: "Post a message to the connected Slack channel (incoming webhook)", input: { text: "Message text" }, write: true },
  { appId: "webhook", action: "send", description: "POST a JSON payload to the configured webhook URL", input: { payload: "JSON object" }, write: true },
];

async function github(token: string, method: string, url: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`https://api.github.com${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function validRepo(repo: unknown): string {
  if (typeof repo !== "string" || !/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error("repo must look like owner/name");
  return repo;
}

export async function runIntegrationAction(appId: string, action: string, input: Record<string, unknown>): Promise<string> {
  const conn = getDB().integrations[appId] ?? Object.values(getDB().integrations).find((c) => c.appId === appId);
  if (!conn) return `Integration "${appId}" is not connected. Ask the user to connect it from the Integrations page.`;

  if (conn.mode === "simulated") {
    return `[simulated ${appId}] ${action} completed with input ${JSON.stringify(input).slice(0, 300)}. (This app is connected in simulated mode; connect it live for real data.)`;
  }

  switch (`${appId}.${action}`) {
    case "github.list_issues": {
      const data = (await github(conn.config.token, "GET", `/repos/${validRepo(input.repo)}/issues?state=open&per_page=20`)) as { number: number; title: string; pull_request?: unknown; html_url: string }[];
      return data.filter((i) => !i.pull_request).map((i) => `#${i.number} ${i.title} (${i.html_url})`).join("\n") || "No open issues.";
    }
    case "github.list_pulls": {
      const data = (await github(conn.config.token, "GET", `/repos/${validRepo(input.repo)}/pulls?state=open&per_page=20`)) as { number: number; title: string; html_url: string }[];
      return data.map((p) => `#${p.number} ${p.title} (${p.html_url})`).join("\n") || "No open pull requests.";
    }
    case "github.create_issue": {
      const data = (await github(conn.config.token, "POST", `/repos/${validRepo(input.repo)}/issues`, { title: String(input.title ?? "Untitled"), body: String(input.body ?? "") })) as { html_url: string };
      return `Created ${data.html_url}`;
    }
    case "slack.post_message": {
      const url = conn.config.webhookUrl;
      if (!url?.startsWith("https://hooks.slack.com/")) throw new Error("Slack webhook URL is not configured");
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: String(input.text ?? "") }) });
      if (!res.ok) throw new Error(`Slack ${res.status}`);
      return "Posted to Slack.";
    }
    case "webhook.send": {
      const url = conn.config.url;
      if (!url?.startsWith("https://")) throw new Error("Webhook URL must be https");
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input.payload ?? input) });
      return `Webhook responded ${res.status}.`;
    }
    default:
      return `Action ${action} is not implemented for ${appId}.`;
  }
}

/** Actions an agent can run against a connected app. Simulated apps expose a generic pair. */
export function listActions(appId: string): IntegrationActionSpec[] {
  const live = LIVE_ACTIONS.filter((a) => a.appId === appId);
  if (live.length) return live;
  return [
    { appId, action: "search", description: `Search ${appId} (simulated)`, input: { query: "Search text" }, write: false },
    { appId, action: "create", description: `Create a record in ${appId} (simulated)`, input: { title: "Title", body: "Details" }, write: true },
  ];
}
