// The union of Linear's and Notion's public integration directories (compiled from their
// public listings, 2026), plus Council-native connectors. `sources` records which product
// lists the app. Only `live` apps call real APIs in this prototype; the rest connect in
// simulated mode so the agent tool surface works end to end.

export type IntegrationSource = "linear" | "notion" | "council";
export type IntegrationCapability = "sync" | "unfurl" | "intake" | "notify" | "import" | "embed" | "ai-search" | "automation" | "sso" | "agent";
export type IntegrationAuth = "oauth" | "token" | "webhook" | "none";

export interface CatalogApp {
  id: string;
  name: string;
  category: string;
  sources: IntegrationSource[];
  description: string;
  auth: IntegrationAuth;
  capabilities: IntegrationCapability[];
  live?: boolean;
  color: string;
  glyph: string;
}

const L: IntegrationSource[] = ["linear"];
const N: IntegrationSource[] = ["notion"];
const B: IntegrationSource[] = ["linear", "notion"];

function app(
  id: string,
  name: string,
  category: string,
  sources: IntegrationSource[],
  auth: IntegrationAuth,
  capabilities: IntegrationCapability[],
  color: string,
  glyph: string,
  description: string,
  live = false,
): CatalogApp {
  return { id, name, category, sources, auth, capabilities, color, glyph, description, ...(live ? { live } : {}) };
}

export const CATALOG: CatalogApp[] = [
  // Council-native
  app("council-mcp", "Council MCP server", "Agents & AI", ["council"], "none", ["agent", "ai-search", "automation"], "#7c6cf2", "◆", "Expose this workspace to any MCP client — Claude, Cursor, ChatGPT and more. External agents go through the same human gate.", true),
  app("webhook", "Webhooks", "Automation", ["council"], "webhook", ["notify", "automation"], "#475569", "⇢", "POST a JSON payload to any https endpoint when agents act.", true),

  // Engineering
  app("github", "GitHub", "Engineering", B, "token", ["sync", "unfurl", "automation", "ai-search", "embed"], "#24292f", "GH", "Link PRs and commits to issues, auto-close on merge, read and create GitHub issues.", true),
  app("gitlab", "GitLab", "Engineering", B, "oauth", ["sync", "unfurl", "automation", "embed"], "#fc6d26", "GL", "Link merge requests to issues and move issues through workflow states automatically."),
  app("bitbucket", "Bitbucket", "Engineering", N, "oauth", ["unfurl", "embed"], "#2684ff", "BB", "Preview repositories, pull requests and commits inside pages."),
  app("github-copilot", "GitHub Copilot", "Agents & AI", L, "oauth", ["agent"], "#6e40c9", "Co", "Assign issues to Copilot's coding agent and review the pull request it opens."),
  app("cursor", "Cursor", "Agents & AI", L, "oauth", ["agent"], "#111111", "Cu", "Delegate issues to Cursor background agents from the issue view."),
  app("devin", "Devin", "Agents & AI", L, "oauth", ["agent"], "#1f6feb", "Dv", "Assign issues to Devin; it posts progress and opens pull requests."),
  app("codegen", "Codegen", "Agents & AI", L, "oauth", ["agent"], "#0ea5e9", "Cg", "Code agent that picks up issues and ships pull requests."),
  app("claude", "Claude", "Agents & AI", B, "oauth", ["agent", "ai-search"], "#d97757", "Cl", "Use Claude with your workspace over MCP: read, search and create issues and pages."),
  app("chatgpt", "ChatGPT", "Agents & AI", B, "oauth", ["agent", "ai-search"], "#10a37f", "AI", "Connect ChatGPT to search and act on your workspace."),
  app("sentry", "Sentry", "Engineering", B, "oauth", ["intake", "sync", "unfurl", "embed"], "#362d59", "Se", "Create issues from Sentry errors and keep them in sync when resolved."),
  app("vercel", "Vercel", "Engineering", L, "oauth", ["sync", "notify"], "#000000", "▲", "Link preview deployments to issues and pull requests."),
  app("netlify", "Netlify", "Engineering", L, "oauth", ["notify"], "#00c7b7", "Nf", "See deploy previews and status on linked issues."),
  app("datadog", "Datadog", "Engineering", L, "oauth", ["intake", "notify"], "#632ca6", "Dd", "Open issues from monitors and incidents."),
  app("pagerduty", "PagerDuty", "Engineering", L, "oauth", ["intake", "notify"], "#06ac38", "PD", "Create and link issues from PagerDuty incidents."),
  app("opsgenie", "Opsgenie", "Engineering", L, "oauth", ["intake", "notify"], "#2684ff", "Og", "Turn alerts into tracked follow-up issues."),
  app("incident-io", "incident.io", "Engineering", L, "oauth", ["intake", "sync"], "#f25533", "io", "Sync incident follow-ups and action items as issues."),
  app("rootly", "Rootly", "Engineering", L, "oauth", ["intake", "sync"], "#6c2bd9", "Ro", "Incident action items become issues automatically."),
  app("firehydrant", "FireHydrant", "Engineering", L, "oauth", ["intake", "sync"], "#ff4f00", "FH", "Track retrospective tasks from incidents."),
  app("retool", "Retool", "Engineering", L, "token", ["automation"], "#3d3d3d", "Rt", "Build internal tools on top of workspace data."),
  app("raycast", "Raycast", "Productivity", L, "oauth", ["automation"], "#ff6363", "Ry", "Create and search issues from the Raycast launcher."),
  app("codepen", "CodePen", "Embeds", N, "none", ["embed"], "#1e1f26", "CP", "Embed live pens in pages."),
  app("replit", "Replit", "Embeds", N, "none", ["embed"], "#f26207", "Rp", "Embed runnable repls in pages."),

  // Communication
  app("slack", "Slack", "Communication", B, "webhook", ["notify", "intake", "unfurl", "ai-search", "sync"], "#4a154b", "Sl", "Post updates to channels, create issues from messages, unfurl links, and search Slack from AI.", true),
  app("microsoft-teams", "Microsoft Teams", "Communication", B, "oauth", ["notify", "intake", "unfurl", "ai-search"], "#5059c9", "T", "Notifications, issue creation from messages and link previews in Teams."),
  app("discord", "Discord", "Communication", L, "oauth", ["notify", "intake", "unfurl"], "#5865f2", "Di", "Turn community feedback into issues and unfurl links."),
  app("zoom", "Zoom", "Communication", N, "oauth", ["embed", "ai-search"], "#2d8cff", "Zm", "Bring meeting notes and recordings into pages."),
  app("gmail", "Gmail", "Communication", N, "oauth", ["ai-search", "intake"], "#ea4335", "M", "Search and reference email from AI; turn threads into tasks."),
  app("outlook", "Outlook", "Communication", N, "oauth", ["ai-search", "intake"], "#0078d4", "O", "Search mail from AI and capture threads as pages."),
  app("loom", "Loom", "Communication", B, "none", ["embed", "unfurl"], "#625df5", "Lo", "Embed and preview Loom videos in issues and pages."),
  app("descript", "Descript", "Communication", L, "none", ["embed"], "#0d0d0d", "Ds", "Embed Descript recordings in issues."),

  // Customer support & sales
  app("zendesk", "Zendesk", "Customer", B, "oauth", ["intake", "sync", "ai-search"], "#03363d", "Zd", "Create and link issues from tickets; agents see status updates."),
  app("intercom", "Intercom", "Customer", B, "oauth", ["intake", "sync"], "#1f8ded", "Ic", "Escalate conversations to issues and close the loop with customers."),
  app("front", "Front", "Customer", L, "oauth", ["intake", "sync"], "#a857f1", "Fr", "Link customer conversations to issues."),
  app("help-scout", "Help Scout", "Customer", L, "oauth", ["intake", "sync"], "#1292ee", "HS", "Create issues from Help Scout conversations."),
  app("plain", "Plain", "Customer", L, "oauth", ["intake", "sync"], "#0b0b0b", "Pl", "Customer requests become linked issues."),
  app("pylon", "Pylon", "Customer", L, "oauth", ["intake", "sync"], "#3b82f6", "Py", "B2B support threads linked to issues."),
  app("gong", "Gong", "Customer", L, "oauth", ["intake", "ai-search"], "#8039df", "Gg", "Feature requests from sales calls become customer requests."),
  app("hubspot", "HubSpot", "Customer", B, "oauth", ["intake", "sync", "ai-search"], "#ff7a59", "Hs", "Attach CRM context to requests; search deals from AI."),
  app("salesforce", "Salesforce", "Customer", B, "oauth", ["intake", "sync", "ai-search"], "#00a1e0", "SF", "Link accounts and opportunities to issues and search CRM from AI."),
  app("productboard", "Productboard", "Product", L, "oauth", ["sync"], "#1d2a3a", "Pb", "Push features to issues and sync status back."),
  app("canny", "Canny", "Product", L, "oauth", ["intake", "sync"], "#525df9", "Ca", "Link feedback posts to issues and notify voters."),

  // Files & docs
  app("google-drive", "Google Drive", "Files & docs", B, "oauth", ["embed", "unfurl", "ai-search"], "#1fa463", "Dr", "Embed and preview Docs, Sheets and Slides; search Drive from AI."),
  app("google-sheets", "Google Sheets", "Files & docs", B, "oauth", ["sync", "embed"], "#0f9d58", "Sh", "Export issue data to live spreadsheets; embed sheets in pages."),
  app("google-calendar", "Google Calendar", "Productivity", N, "oauth", ["sync", "embed"], "#4285f4", "Ca", "See meetings next to your docs and attach notes to events."),
  app("onedrive", "OneDrive", "Files & docs", N, "oauth", ["embed", "ai-search"], "#0364b8", "1D", "Embed files and search OneDrive from AI."),
  app("sharepoint", "SharePoint", "Files & docs", N, "oauth", ["embed", "ai-search"], "#038387", "SP", "Search SharePoint sites and documents from AI."),
  app("dropbox", "Dropbox", "Files & docs", N, "oauth", ["embed"], "#0061ff", "Db", "Embed Dropbox files and folders."),
  app("box", "Box", "Files & docs", N, "oauth", ["embed", "ai-search"], "#0061d5", "box", "Embed Box files and search them from AI."),
  app("confluence", "Confluence", "Files & docs", N, "oauth", ["import", "ai-search"], "#1868db", "Cf", "Import spaces and search Confluence from AI."),

  // Project management (import + sync)
  app("jira", "Jira", "Project management", B, "oauth", ["import", "sync", "ai-search", "unfurl"], "#0052cc", "J", "Import projects, two-way sync issues, and search Jira from AI."),
  app("asana", "Asana", "Project management", B, "oauth", ["import", "sync", "embed"], "#f06a6a", "As", "Import projects and sync tasks."),
  app("trello", "Trello", "Project management", B, "oauth", ["import", "embed"], "#0079bf", "Tr", "Import boards and embed cards."),
  app("shortcut", "Shortcut", "Project management", L, "token", ["import"], "#58b1e4", "Sc", "Import stories, epics and workflows."),
  app("monday", "monday.com", "Project management", N, "oauth", ["import", "embed"], "#ff3d57", "mo", "Import boards and embed views."),
  app("clickup", "ClickUp", "Project management", N, "oauth", ["import", "embed"], "#7b68ee", "CU", "Import tasks and docs."),
  app("airtable", "Airtable", "Project management", B, "oauth", ["sync", "embed", "import"], "#fcb400", "At", "Sync bases into databases and embed views."),
  app("notion", "Notion", "Files & docs", L, "oauth", ["unfurl", "sync"], "#191919", "N", "Link issues and projects to Notion docs with live previews."),
  app("linear", "Linear", "Project management", N, "oauth", ["sync", "unfurl", "embed", "ai-search"], "#5e6ad2", "Li", "Synced databases of Linear issues and projects with link previews."),
  app("unito", "Unito", "Automation", L, "oauth", ["sync"], "#3c6ce1", "U", "Two-way sync with dozens of other tools."),
  app("toggl", "Toggl Track", "Productivity", L, "oauth", ["automation"], "#e57cd8", "Tg", "Start timers from issues."),
  app("harvest", "Harvest", "Productivity", L, "oauth", ["automation"], "#fa5d00", "Hv", "Track time against issues."),

  // Automation
  app("zapier", "Zapier", "Automation", B, "oauth", ["automation"], "#ff4a00", "Z", "Connect to thousands of apps with triggers and actions."),
  app("make", "Make", "Automation", B, "oauth", ["automation"], "#6d00cc", "Mk", "Visual automation scenarios with triggers and actions."),
  app("n8n", "n8n", "Automation", B, "token", ["automation"], "#ea4b71", "n8", "Self-hostable workflow automation."),
  app("pipedream", "Pipedream", "Automation", B, "token", ["automation"], "#2c2c2c", "PD", "Code-level automation with prebuilt actions."),
  app("airbyte", "Airbyte", "Data & analytics", L, "token", ["sync"], "#615eff", "Ab", "Replicate issue data into your warehouse."),

  // Design & whiteboards
  app("figma", "Figma", "Design", B, "oauth", ["embed", "unfurl", "sync"], "#a259ff", "F", "Embed live frames, preview links and link designs to issues."),
  app("miro", "Miro", "Design", B, "oauth", ["embed", "unfurl"], "#ffd02f", "Mi", "Embed boards and preview links."),
  app("canva", "Canva", "Design", N, "none", ["embed"], "#00c4cc", "Cv", "Embed Canva designs."),
  app("pitch", "Pitch", "Design", N, "none", ["embed"], "#5d3fd3", "Pi", "Embed presentations."),
  app("lucid", "Lucid", "Design", N, "oauth", ["embed"], "#f96b13", "Lu", "Embed Lucidchart and Lucidspark diagrams."),
  app("whimsical", "Whimsical", "Design", N, "none", ["embed"], "#7b3fe4", "Wh", "Embed flowcharts, wireframes and mind maps."),
  app("excalidraw", "Excalidraw", "Design", N, "none", ["embed"], "#6965db", "Ex", "Embed hand-drawn diagrams."),
  app("framer", "Framer", "Design", N, "none", ["embed"], "#0055ff", "Fm", "Embed Framer prototypes and sites."),
  app("webflow", "Webflow", "Design", N, "oauth", ["embed", "sync"], "#4353ff", "Wf", "Embed and publish content."),

  // Forms & scheduling
  app("typeform", "Typeform", "Forms", B, "oauth", ["intake", "embed"], "#262627", "Tf", "Responses become issues or database rows."),
  app("tally", "Tally", "Forms", N, "oauth", ["intake", "embed"], "#1c1c1c", "Ta", "Send form submissions into databases."),
  app("jotform", "Jotform", "Forms", N, "oauth", ["intake", "embed"], "#ff6100", "Jf", "Collect submissions into databases."),
  app("calendly", "Calendly", "Forms", N, "none", ["embed"], "#006bff", "Cy", "Embed scheduling pages."),

  // Data & analytics
  app("amplitude", "Amplitude", "Data & analytics", N, "none", ["embed"], "#1e61f0", "Am", "Embed charts and dashboards."),
  app("mixpanel", "Mixpanel", "Data & analytics", N, "none", ["embed"], "#7856ff", "Mx", "Embed reports."),
  app("hex", "Hex", "Data & analytics", N, "none", ["embed"], "#f5c0c0", "Hx", "Embed notebooks and apps."),
  app("tableau", "Tableau", "Data & analytics", N, "none", ["embed"], "#e97627", "Tb", "Embed dashboards."),

  // Identity & security
  app("okta", "Okta", "Identity", B, "oauth", ["sso"], "#007dc1", "Ok", "SAML SSO and SCIM provisioning."),
  app("google-workspace", "Google Workspace SSO", "Identity", B, "oauth", ["sso"], "#4285f4", "G", "Sign in with Google and restrict by domain."),
  app("entra-id", "Microsoft Entra ID", "Identity", B, "oauth", ["sso"], "#0078d4", "En", "SAML SSO and SCIM provisioning (Azure AD)."),

  // Embeds & media
  app("youtube", "YouTube", "Embeds", N, "none", ["embed"], "#ff0000", "▶", "Embed videos."),
  app("vimeo", "Vimeo", "Embeds", N, "none", ["embed"], "#1ab7ea", "V", "Embed videos."),
  app("x", "X (Twitter)", "Embeds", N, "none", ["embed"], "#000000", "𝕏", "Embed posts."),
  app("spotify", "Spotify", "Embeds", N, "none", ["embed"], "#1db954", "Sp", "Embed tracks and playlists."),
  app("google-maps", "Google Maps", "Embeds", N, "none", ["embed"], "#34a853", "Mp", "Embed maps and places."),
];

export const CATEGORIES = Array.from(new Set(CATALOG.map((a) => a.category))).sort();

export function catalogApp(id: string): CatalogApp | undefined {
  return CATALOG.find((a) => a.id === id);
}

export const CAPABILITY_LABEL: Record<IntegrationCapability, string> = {
  sync: "Two-way sync",
  unfurl: "Link previews",
  intake: "Create from",
  notify: "Notifications",
  import: "Import",
  embed: "Embeds",
  "ai-search": "AI search",
  automation: "Automation",
  sso: "SSO",
  agent: "Agent",
};
