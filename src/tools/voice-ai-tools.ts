/**
 * GoHighLevel Voice AI Tools
 * Tools for managing voice AI agents, actions, and call logs
 */

import { GHLApiClient } from '../clients/ghl-api-client.js';

export class VoiceAITools {
  constructor(private ghlClient: GHLApiClient) {}

  getToolDefinitions() {
    return [
      {
        name: 'list_voice_ai_agents',
        description: 'Retrieve a paginated list of voice AI agents for a location.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)'
            },
            page: {
              type: 'number',
              description: 'Page number starting from 1 (default: 1)'
            },
            pageSize: {
              type: 'number',
              description: 'Number of items per page, max 50 (default: 10)'
            },
            query: {
              type: 'string',
              description: 'Search query to filter agents by name'
            }
          }
        },
        _meta: {
          labels: {
            category: 'voice-ai',
            access: 'read',
            complexity: 'simple'
          }
        }
      },
      {
        name: 'create_voice_ai_agent',
        description: 'Create a new voice AI agent configuration and settings.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)'
            },
            agentName: {
              type: 'string',
              description: 'Name of the voice AI agent'
            },
            businessName: {
              type: 'string',
              description: 'Business name associated with the agent'
            },
            welcomeMessage: {
              type: 'string',
              description: 'Welcome message spoken at the start of a call'
            },
            agentPrompt: {
              type: 'string',
              description: 'System prompt defining agent behavior'
            },
            voiceId: {
              type: 'string',
              description: 'Voice ID to use for text-to-speech'
            },
            language: {
              type: 'string',
              description: 'Language code for the agent (e.g., en-US)'
            },
            patienceLevel: {
              type: 'string',
              description: 'Agent patience level setting'
            },
            maxCallDuration: {
              type: 'number',
              description: 'Maximum call duration in seconds'
            },
            inboundNumber: {
              type: 'string',
              description: 'Inbound phone number for the agent'
            },
            timezone: {
              type: 'string',
              description: 'Timezone for agent working hours (e.g., America/New_York)'
            }
          }
        },
        _meta: {
          labels: {
            category: 'voice-ai',
            access: 'write',
            complexity: 'moderate'
          }
        }
      },
      {
        name: 'get_voice_ai_agent',
        description: 'Retrieve detailed configuration and settings for a specific voice AI agent.',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'Unique agent identifier'
            },
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)'
            }
          },
          required: ['agentId']
        },
        _meta: {
          labels: {
            category: 'voice-ai',
            access: 'read',
            complexity: 'simple'
          }
        }
      },
      {
        name: 'update_voice_ai_agent',
        description: 'Partially update an existing voice AI agent configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'Unique agent identifier'
            },
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)'
            },
            agentName: {
              type: 'string',
              description: 'Name of the voice AI agent'
            },
            businessName: {
              type: 'string',
              description: 'Business name associated with the agent'
            },
            welcomeMessage: {
              type: 'string',
              description: 'Welcome message spoken at the start of a call'
            },
            agentPrompt: {
              type: 'string',
              description: 'System prompt defining agent behavior'
            },
            voiceId: {
              type: 'string',
              description: 'Voice ID to use for text-to-speech'
            },
            language: {
              type: 'string',
              description: 'Language code for the agent (e.g., en-US)'
            },
            maxCallDuration: {
              type: 'number',
              description: 'Maximum call duration in seconds'
            },
            timezone: {
              type: 'string',
              description: 'Timezone for agent working hours'
            }
          },
          required: ['agentId']
        },
        _meta: {
          labels: {
            category: 'voice-ai',
            access: 'write',
            complexity: 'moderate'
          }
        }
      },
      {
        name: 'delete_voice_ai_agent',
        description: 'Delete a voice AI agent and all its configurations.',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'Unique agent identifier'
            },
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)'
            }
          },
          required: ['agentId']
        },
        _meta: {
          labels: {
            category: 'voice-ai',
            access: 'delete',
            complexity: 'simple'
          }
        }
      },
      {
        name: 'create_voice_ai_action',
        description: 'Create a new action for a voice AI agent. Actions define specific behaviors and capabilities during calls.',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'ID of the agent this action belongs to'
            },
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)'
            },
            actionType: {
              type: 'string',
              description: 'Type of action to create (e.g., transfer_call, book_appointment)'
            },
            name: {
              type: 'string',
              description: 'Name of the action'
            },
            actionParameters: {
              type: 'object',
              description: 'Parameters specific to the action type'
            }
          },
          required: ['agentId', 'actionType', 'name', 'actionParameters']
        },
        _meta: {
          labels: {
            category: 'voice-ai',
            access: 'write',
            complexity: 'moderate'
          }
        }
      },
      {
        name: 'get_voice_ai_action',
        description: 'Retrieve details of a specific voice AI agent action.',
        inputSchema: {
          type: 'object',
          properties: {
            actionId: {
              type: 'string',
              description: 'Unique action identifier'
            },
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)'
            }
          },
          required: ['actionId']
        },
        _meta: {
          labels: {
            category: 'voice-ai',
            access: 'read',
            complexity: 'simple'
          }
        }
      },
      {
        name: 'update_voice_ai_action',
        description: 'Update an existing voice AI agent action.',
        inputSchema: {
          type: 'object',
          properties: {
            actionId: {
              type: 'string',
              description: 'Unique action identifier'
            },
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)'
            },
            agentId: {
              type: 'string',
              description: 'ID of the agent this action belongs to'
            },
            actionType: {
              type: 'string',
              description: 'Type of action'
            },
            name: {
              type: 'string',
              description: 'Name of the action'
            },
            actionParameters: {
              type: 'object',
              description: 'Parameters specific to the action type'
            }
          },
          required: ['actionId']
        },
        _meta: {
          labels: {
            category: 'voice-ai',
            access: 'write',
            complexity: 'moderate'
          }
        }
      },
      {
        name: 'delete_voice_ai_action',
        description: 'Delete a voice AI agent action.',
        inputSchema: {
          type: 'object',
          properties: {
            actionId: {
              type: 'string',
              description: 'Unique action identifier'
            },
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)'
            }
          },
          required: ['actionId']
        },
        _meta: {
          labels: {
            category: 'voice-ai',
            access: 'delete',
            complexity: 'simple'
          }
        }
      },
      {
        name: 'list_voice_ai_call_logs',
        description: 'Retrieve a paginated list of voice AI call logs for a location.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)'
            },
            agentId: {
              type: 'string',
              description: 'Filter call logs by agent ID'
            },
            contactId: {
              type: 'string',
              description: 'Filter call logs by contact ID'
            },
            callType: {
              type: 'string',
              description: 'Filter by call type (e.g., inbound, outbound)'
            },
            startDate: {
              type: 'string',
              description: 'Start date filter (ISO 8601 format)'
            },
            endDate: {
              type: 'string',
              description: 'End date filter (ISO 8601 format)'
            },
            actionType: {
              type: 'string',
              description: 'Filter by action type taken during call'
            },
            sortBy: {
              type: 'string',
              description: 'Field to sort results by'
            },
            sort: {
              type: 'string',
              description: 'Sort direction: asc or desc'
            },
            page: {
              type: 'number',
              description: 'Page number starting from 1 (default: 1)'
            },
            pageSize: {
              type: 'number',
              description: 'Number of items per page (default: 10)'
            }
          }
        },
        _meta: {
          labels: {
            category: 'voice-ai',
            access: 'read',
            complexity: 'simple'
          }
        }
      },
      {
        name: 'get_voice_ai_call_log',
        description: 'Retrieve details of a specific voice AI call log entry.',
        inputSchema: {
          type: 'object',
          properties: {
            callId: {
              type: 'string',
              description: 'Unique call log identifier'
            },
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)'
            }
          },
          required: ['callId']
        },
        _meta: {
          labels: {
            category: 'voice-ai',
            access: 'read',
            complexity: 'simple'
          }
        }
      }
    ];
  }

  async handleToolCall(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const config = this.ghlClient.getConfig();
    const locationId = (args.locationId as string) || config.locationId;

    switch (toolName) {
      case 'list_voice_ai_agents': {
        const params = new URLSearchParams();
        params.append('locationId', locationId);
        if (args.page) params.append('page', String(args.page));
        if (args.pageSize) params.append('pageSize', String(args.pageSize));
        if (args.query) params.append('query', String(args.query));
        return this.ghlClient.makeRequest('GET', `/voice-ai/agents?${params.toString()}`);
      }

      case 'create_voice_ai_agent': {
        // GHL voice AI endpoints reject `locationId` in the request body
        // (HTTP 422: "property locationId should not exist"). The locationId
        // is communicated via the URL query string instead.
        const body: Record<string, unknown> = {};
        const fields = [
          'agentName', 'businessName', 'welcomeMessage', 'agentPrompt',
          'voiceId', 'language', 'patienceLevel', 'maxCallDuration',
          'inboundNumber', 'timezone', 'numberPoolId', 'callEndWorkflowIds',
          'sendPostCallNotificationTo', 'agentWorkingHours',
          'isAgentAsBackupDisabled', 'translation', 'sendUserIdleReminders',
          'reminderAfterIdleTimeSeconds'
        ];
        for (const field of fields) {
          if (args[field] !== undefined) body[field] = args[field];
        }
        return this.ghlClient.makeRequest('POST', `/voice-ai/agents?locationId=${locationId}`, body);
      }

      case 'get_voice_ai_agent': {
        const agentId = args.agentId as string;
        return this.ghlClient.makeRequest('GET', `/voice-ai/agents/${agentId}?locationId=${locationId}`);
      }

      case 'update_voice_ai_agent': {
        const agentId = args.agentId as string;
        // GHL rejects `locationId` in the PATCH body with HTTP 422.
        // It is passed via the URL query string instead.
        const body: Record<string, unknown> = {};
        const fields = [
          'agentName', 'businessName', 'welcomeMessage', 'agentPrompt',
          'voiceId', 'language', 'patienceLevel', 'maxCallDuration',
          'inboundNumber', 'timezone', 'numberPoolId', 'callEndWorkflowIds',
          'sendPostCallNotificationTo', 'agentWorkingHours',
          'isAgentAsBackupDisabled', 'translation', 'sendUserIdleReminders',
          'reminderAfterIdleTimeSeconds'
        ];
        for (const field of fields) {
          if (args[field] !== undefined) body[field] = args[field];
        }
        return this.ghlClient.makeRequest('PATCH', `/voice-ai/agents/${agentId}?locationId=${locationId}`, body);
      }

      case 'delete_voice_ai_agent': {
        const agentId = args.agentId as string;
        return this.ghlClient.makeRequest('DELETE', `/voice-ai/agents/${agentId}?locationId=${locationId}`);
      }

      case 'create_voice_ai_action': {
        // GHL rejects `locationId` in the POST body with HTTP 422.
        // It is passed via the URL query string instead.
        const body: Record<string, unknown> = {
          agentId: args.agentId,
          actionType: args.actionType,
          name: args.name,
          actionParameters: args.actionParameters
        };
        return this.ghlClient.makeRequest('POST', `/voice-ai/actions?locationId=${locationId}`, body);
      }

      case 'get_voice_ai_action': {
        const actionId = args.actionId as string;
        return this.ghlClient.makeRequest('GET', `/voice-ai/actions/${actionId}?locationId=${locationId}`);
      }

      case 'update_voice_ai_action': {
        const actionId = args.actionId as string;
        // GHL rejects `locationId` in the PUT body with HTTP 422.
        // It is passed via the URL query string instead.
        const body: Record<string, unknown> = {};
        if (args.agentId) body.agentId = args.agentId;
        if (args.actionType) body.actionType = args.actionType;
        if (args.name) body.name = args.name;
        if (args.actionParameters !== undefined) body.actionParameters = args.actionParameters;
        return this.ghlClient.makeRequest('PUT', `/voice-ai/actions/${actionId}?locationId=${locationId}`, body);
      }

      case 'delete_voice_ai_action': {
        const actionId = args.actionId as string;
        return this.ghlClient.makeRequest('DELETE', `/voice-ai/actions/${actionId}?locationId=${locationId}`);
      }

      case 'list_voice_ai_call_logs': {
        const params = new URLSearchParams();
        params.append('locationId', locationId);
        if (args.agentId) params.append('agentId', String(args.agentId));
        if (args.contactId) params.append('contactId', String(args.contactId));
        if (args.callType) params.append('callType', String(args.callType));
        if (args.startDate) params.append('startDate', String(args.startDate));
        if (args.endDate) params.append('endDate', String(args.endDate));
        if (args.actionType) params.append('actionType', String(args.actionType));
        if (args.sortBy) params.append('sortBy', String(args.sortBy));
        if (args.sort) params.append('sort', String(args.sort));
        if (args.page) params.append('page', String(args.page));
        if (args.pageSize) params.append('pageSize', String(args.pageSize));
        return this.ghlClient.makeRequest('GET', `/voice-ai/dashboard/call-logs?${params.toString()}`);
      }

      case 'get_voice_ai_call_log': {
        const callId = args.callId as string;
        return this.ghlClient.makeRequest('GET', `/voice-ai/dashboard/call-logs/${callId}?locationId=${locationId}`);
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
