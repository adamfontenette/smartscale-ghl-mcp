/**
 * Tool Registry — bridges existing tool classes to McpServer.registerTool()
 * 
 * Reads tool definitions from all existing tool classes, infers annotations
 * from tool names and metadata, and registers them with the McpServer API.
 * 
 * This avoids rewriting 38 tool files while getting all the benefits of
 * the new SDK: annotations, Zod validation, structured responses.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations, Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { GHLApiClient } from './clients/ghl-api-client.js';
import { ContactTools } from './tools/contact-tools.js';
import { ConversationTools } from './tools/conversation-tools.js';
import { BlogTools } from './tools/blog-tools.js';
import { OpportunityTools } from './tools/opportunity-tools.js';
import { CalendarTools } from './tools/calendar-tools.js';
import { EmailTools } from './tools/email-tools.js';
import { LocationTools } from './tools/location-tools.js';
import { EmailISVTools } from './tools/email-isv-tools.js';
import { SocialMediaTools } from './tools/social-media-tools.js';
import { MediaTools } from './tools/media-tools.js';
import { ObjectTools } from './tools/object-tools.js';
import { AssociationTools } from './tools/association-tools.js';
import { CustomFieldV2Tools } from './tools/custom-field-v2-tools.js';
import { WorkflowTools } from './tools/workflow-tools.js';
import { SurveyTools } from './tools/survey-tools.js';
import { StoreTools } from './tools/store-tools.js';
import { ProductsTools } from './tools/products-tools.js';
import { AffiliatesTools } from './tools/affiliates-tools.js';
import { BusinessesTools } from './tools/businesses-tools.js';
import { CampaignsTools } from './tools/campaigns-tools.js';
import { CompaniesTools } from './tools/companies-tools.js';
import { CoursesTools } from './tools/courses-tools.js';
import { FormsTools } from './tools/forms-tools.js';
import { FunnelsTools } from './tools/funnels-tools.js';
import { InvoicesTools } from './tools/invoices-tools.js';
import { LinksTools } from './tools/links-tools.js';
import { PaymentsTools } from './tools/payments-tools.js';
import { PhoneTools } from './tools/phone-tools.js';
import { ReportingTools } from './tools/reporting-tools.js';
import { ReputationTools } from './tools/reputation-tools.js';
import { SaasTools } from './tools/saas-tools.js';
import { SmartListsTools } from './tools/smartlists-tools.js';
import { SnapshotsTools } from './tools/snapshots-tools.js';
import { TemplatesTools } from './tools/templates-tools.js';
import { TriggersTools } from './tools/triggers-tools.js';
import { UsersTools } from './tools/users-tools.js';
import { WebhooksTools } from './tools/webhooks-tools.js';
import { WorkflowBuilderTools } from './tools/workflow-builder-tools.js';
import { PhoneSystemTools } from './tools/phone-system-tools.js';
import { VoiceAITools } from './tools/voice-ai-tools.js';
import { ProposalsTools } from './tools/proposals-tools.js';
import { CustomMenusTools } from './tools/custom-menus-tools.js';
import { MarketplaceTools } from './tools/marketplace-tools.js';
import { AgentStudioTools } from './tools/agent-studio-tools.js';

// ─── Types ──────────────────────────────────────────────────

interface ToolModule {
  name: string;
  instance: any;
  getTools: () => Tool[];
  executeTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

// ─── Annotation Inference ───────────────────────────────────

/**
 * Infer MCP tool annotations from tool name and metadata.
 * This classifies every tool by its HTTP method semantics.
 */
function inferAnnotations(toolName: string, meta?: any): ToolAnnotations {
  const name = toolName.toLowerCase();
  const access = meta?.labels?.access;

  // Read-only operations
  const isRead = access === 'read' ||
    name.startsWith('get_') ||
    name.startsWith('search_') ||
    name.startsWith('list_') ||
    name.startsWith('check_') ||
    name.startsWith('validate_') ||
    name.startsWith('view_') ||
    name.startsWith('ghl_get_') ||
    name.startsWith('ghl_list_') ||
    name.startsWith('get_csv_') ||
    name.startsWith('get_platform_') ||
    name.startsWith('get_blocked_') ||
    name.startsWith('download_') ||
    name.startsWith('generate_invoice_number') ||
    name.startsWith('generate_estimate_number') ||
    name === 'get_timezones' ||
    name === 'verify_email' ||
    name === 'live_chat_typing';

  // Destructive operations (DELETE)
  const isDestructive = access === 'delete' ||
    name.startsWith('delete_') ||
    name.startsWith('remove_') ||
    name.startsWith('ghl_delete_') ||
    name.startsWith('bulk_delete_') ||
    name === 'void_invoice' ||
    name === 'cancel_scheduled_message' ||
    name === 'cancel_scheduled_email' ||
    name === 'cancel_invoice_schedule';

  // Idempotent operations (GET, PUT, DELETE — same result if repeated)
  const isIdempotent = isRead ||
    name.startsWith('update_') ||
    name.startsWith('upsert_') ||
    name.startsWith('ghl_update_') ||
    name.startsWith('set_') ||
    isDestructive;

  return {
    title: toolName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    readOnlyHint: isRead,
    destructiveHint: isDestructive,
    idempotentHint: isIdempotent,
    openWorldHint: true, // All tools interact with GHL API
  };
}

/**
 * Build a Zod input shape from a tool's JSON Schema.
 *
 * Mostly permissive (z.any()) so we don't accidentally reject valid args
 * from existing callers. BUT: when the schema declares a primitive scalar
 * type — number, integer, boolean — we use z.coerce.* so MCP transports
 * that ship those values as strings (which happens in practice) are
 * coerced before the handler runs.
 *
 * This fixes errors like:
 *   GHL API Error (422): slotInterval must be a number conforming
 *   to the specified constraints
 * which happen when callers pass slotInterval=45 but the JSON-RPC layer
 * forwards "45". Strings/arrays/objects and untyped fields keep z.any().
 *
 * Always injects `locationId` (Path C v4) so sub-account routing works
 * end-to-end: Cowork forwards locationId → server router picks the
 * right sub-account PIT from GHL_LOCATION_TOKENS → tool runs against
 * that sub-account.
 *
 * NOTE: We type the local `shape` as a mutable `Record<string, z.ZodTypeAny>`
 * because Zod v4 made `z.ZodRawShape` a `Readonly<...>` mapped type, which
 * forbids index assignment (TS2542). The runtime shape is identical — we
 * only cast back to `z.ZodRawShape` at return so the McpServer.registerTool
 * inputSchema contract is preserved.
 */
function buildInputShape(jsonSchema: any): z.ZodRawShape {
  const shape: Record<string, z.ZodTypeAny> = {};
  const required = new Set<string>(
    Array.isArray(jsonSchema?.required) ? jsonSchema.required : []
  );

  if (jsonSchema && jsonSchema.type === 'object' && jsonSchema.properties) {
    for (const [key, prop] of Object.entries(jsonSchema.properties as Record<string, any>)) {
      const desc = (prop && typeof prop === 'object' && typeof prop.description === 'string')
        ? prop.description
        : '';

      // Pick a Zod type based on the declared JSON Schema type. For scalar
      // primitives we use z.coerce so string-encoded values (e.g. "45")
      // get converted before the tool handler sees them. Anything else
      // (string, array, object, mixed, missing) stays z.any() — the
      // permissive default — to avoid rejecting calls.
      let zod: z.ZodTypeAny;
      const t = prop && typeof prop === 'object' ? prop.type : undefined;
      if (t === 'number' || t === 'integer') {
        zod = z.coerce.number();
      } else if (t === 'boolean') {
        zod = z.coerce.boolean();
      } else {
        zod = z.any();
      }

      if (desc) zod = zod.describe(desc);
      if (!required.has(key)) zod = zod.optional();
      shape[key] = zod;
    }
  }

  // Always expose locationId for sub-account routing.
  // If a tool already declared its own locationId, leave that one alone.
  if (!('locationId' in shape)) {
    shape.locationId = z.string().optional().describe(
      'Sub-account locationId for routing. If omitted, server falls back to the default GHL_LOCATION_ID env var.'
    );
  }

  return shape as z.ZodRawShape;
}

// ─── Tool Registry ──────────────────────────────────────────

export class ToolRegistry {
  private modules: ToolModule[] = [];
  private toolToModule = new Map<string, ToolModule>();
  private allToolDefs: Tool[] = [];

  constructor(ghlClient: GHLApiClient) {
    this.initModules(ghlClient);
  }

  private initModules(ghl: GHLApiClient): void {
    // Legacy modules (use getToolDefinitions/getTools + executeTool)
    const contactTools = new ContactTools(ghl);
    const conversationTools = new ConversationTools(ghl);
    const blogTools = new BlogTools(ghl);
    const opportunityTools = new OpportunityTools(ghl);
    const calendarTools = new CalendarTools(ghl);
    const emailTools = new EmailTools(ghl);
    const locationTools = new LocationTools(ghl);
    const emailISVTools = new EmailISVTools(ghl);
    const socialMediaTools = new SocialMediaTools(ghl);
    const mediaTools = new MediaTools(ghl);
    const objectTools = new ObjectTools(ghl);

    // Modules with getTools/executeXxxTool pattern
    const associationTools = new AssociationTools(ghl);
    const customFieldV2Tools = new CustomFieldV2Tools(ghl);
    const workflowTools = new WorkflowTools(ghl);
    const surveyTools = new SurveyTools(ghl);
    const storeTools = new StoreTools(ghl);
    const productsTools = new ProductsTools(ghl);

    // Dynamic modules (use getToolDefinitions + handleToolCall)
    const affiliatesTools = new AffiliatesTools(ghl);
    const businessesTools = new BusinessesTools(ghl);
    const campaignsTools = new CampaignsTools(ghl);
    const companiesTools = new CompaniesTools(ghl);
    const coursesTools = new CoursesTools(ghl);
    const formsTools = new FormsTools(ghl);
    const funnelsTools = new FunnelsTools(ghl);
    const invoicesTools = new InvoicesTools(ghl);
    const linksTools = new LinksTools(ghl);
    const paymentsTools = new PaymentsTools(ghl);
    const phoneTools = new PhoneTools(ghl);
    const reportingTools = new ReportingTools(ghl);
    const reputationTools = new ReputationTools(ghl);
    const saasTools = new SaasTools(ghl);
    const smartListsTools = new SmartListsTools(ghl);
    const snapshotsTools = new SnapshotsTools(ghl);
    const templatesTools = new TemplatesTools(ghl);
    const triggersTools = new TriggersTools(ghl);
    const usersTools = new UsersTools(ghl);
    const webhooksTools = new WebhooksTools(ghl);
    const phoneSystemTools = new PhoneSystemTools(ghl);
    const voiceAITools = new VoiceAITools(ghl);
    const proposalsTools = new ProposalsTools(ghl);
    const customMenusTools = new CustomMenusTools(ghl);
    const marketplaceTools = new MarketplaceTools(ghl);
    const agentStudioTools = new AgentStudioTools(ghl);

    // Register legacy modules (executeTool pattern)
    this.addModule('contact', contactTools, 'getToolDefinitions', 'executeTool');
    this.addModule('conversation', conversationTools, 'getToolDefinitions', 'executeTool');
    this.addModule('blog', blogTools, 'getToolDefinitions', 'executeTool');
    this.addModule('opportunity', opportunityTools, 'getToolDefinitions', 'executeTool');
    this.addModule('calendar', calendarTools, 'getToolDefinitions', 'executeTool');
    this.addModule('email', emailTools, 'getToolDefinitions', 'executeTool');
    this.addModule('location', locationTools, 'getToolDefinitions', 'executeTool');
    this.addModule('emailISV', emailISVTools, 'getToolDefinitions', 'executeTool');
    this.addModule('socialMedia', socialMediaTools, 'getTools', 'executeTool');
    this.addModule('media', mediaTools, 'getToolDefinitions', 'executeTool');
    this.addModule('objects', objectTools, 'getToolDefinitions', 'executeTool');

    // Modules with specialized execute methods
    this.addModule('associations', associationTools, 'getTools', 'executeAssociationTool');
    this.addModule('customFieldsV2', customFieldV2Tools, 'getTools', 'executeCustomFieldV2Tool');
    this.addModule('workflows', workflowTools, 'getTools', 'executeWorkflowTool');
    this.addModule('surveys', surveyTools, 'getTools', 'executeSurveyTool');
    this.addModule('store', storeTools, 'getTools', 'executeStoreTool');
    this.addModule('products', productsTools, 'getTools', 'executeProductsTool');

    // Dynamic modules (handleToolCall pattern)
    this.addModule('affiliates', affiliatesTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('businesses', businessesTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('campaigns', campaignsTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('companies', companiesTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('courses', coursesTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('forms', formsTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('funnels', funnelsTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('invoices', invoicesTools, 'getTools', 'handleToolCall');
    this.addModule('links', linksTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('payments', paymentsTools, 'getTools', 'handleToolCall');
    this.addModule('phone', phoneTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('reporting', reportingTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('reputation', reputationTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('saas', saasTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('smartLists', smartListsTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('snapshots', snapshotsTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('templates', templatesTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('triggers', triggersTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('users', usersTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('webhooks', webhooksTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('phoneSystem', phoneSystemTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('voiceAI', voiceAITools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('proposals', proposalsTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('customMenus', customMenusTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('marketplace', marketplaceTools, 'getToolDefinitions', 'handleToolCall');
    this.addModule('agentStudio', agentStudioTools, 'getToolDefinitions', 'handleToolCall');

    // Workflow Builder — internal API with Firebase auth (no GHL API client dependency)
    const workflowBuilderTools = new WorkflowBuilderTools();
    this.addModule('workflowBuilder', workflowBuilderTools, 'getTools', 'executeWorkflowBuilderTool');
  }

  private addModule(
    name: string,
    instance: any,
    listMethod: string,
    executeMethod: string
  ): void {
    const getTools = () => instance[listMethod]() as Tool[];
    const executeTool = (toolName: string, args: Record<string, unknown>) =>
      instance[executeMethod](toolName, args);

    const mod: ToolModule = { name, instance, getTools, executeTool };
    this.modules.push(mod);

    // Index tools by name
    try {
      const tools = getTools();
      for (const tool of tools) {
        this.toolToModule.set(tool.name, mod);
        this.allToolDefs.push(tool);
      }
    } catch (err: any) {
      process.stderr.write(`[Registry] Warning: Failed to load tools from ${name}: ${err.message}\n`);
    }
  }

  /**
   * Register all tools with a McpServer instance
   */
  registerAll(server: McpServer): number {
    let count = 0;

    for (const tool of this.allToolDefs) {
      const mod = this.toolToModule.get(tool.name);
      if (!mod) continue;

      const meta = (tool as any)._meta;
      const annotations = inferAnnotations(tool.name, meta);
      const inputShape = buildInputShape((tool as any).inputSchema);

      try {
        server.registerTool(
          tool.name,
          {
            title: annotations.title,
            description: tool.description || '',
            inputSchema: inputShape,
            annotations,
            _meta: meta,
          },
          async (args: any) => {
            try {
              const result = await mod.executeTool(tool.name, args || {});
              // Normalize result to MCP format
              const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
              return {
                content: [{ type: 'text' as const, text }],
              };
            } catch (err: any) {
              return {
                content: [{ type: 'text' as const, text: `Error executing ${tool.name}: ${err.message}` }],
                isError: true,
              };
            }
          }
        );
        count++;
      } catch (err: any) {
        process.stderr.write(`[Registry] Failed to register tool ${tool.name}: ${err.message}\n`);
      }
    }

    return count;
  }

  /**
   * Call a tool directly (for REST endpoint)
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const mod = this.toolToModule.get(name);
    if (!mod) return undefined;
    return mod.executeTool(name, args);
  }

  /**
   * Get tool counts by category (for REST /)
   */
  getToolCounts(appToolCount: number): Record<string, number | Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const mod of this.modules) {
      try {
        counts[mod.name] = mod.getTools().length;
      } catch {
        counts[mod.name] = 0;
      }
    }
    counts['apps'] = appToolCount;

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return {
      ...counts,
      total,
      sections: Object.keys(counts).length,
    };
  }

  /**
   * Get all tool definitions (for REST /tools endpoint)
   */
  getAllToolDefinitions(appTools: Tool[]): Tool[] {
    // Add annotations to existing tool defs for the REST endpoint
    return [...this.allToolDefs, ...appTools].map(tool => {
      const meta = (tool as any)._meta;
      const annotations = inferAnnotations(tool.name, meta);
      return {
        ...tool,
        annotations,
      };
    });
  }

  /**
   * Get count of registered GHL tools (excluding apps)
   */
  getToolCount(): number {
    return this.allToolDefs.length;
  }

  /**
   * Get all registered tool names
   */
  getAllToolNames(): string[] {
    return this.allToolDefs.map(t => t.name);
  }
}

// All tool registration is handled via the ToolRegistry class above.
