/**
 * Example Embedded MCP Service
 * A simple calculator service demonstrating the embedded adapter pattern
 */

import {
  IMCPService,
  InitializeResult,
  ListToolsResult,
  CallToolRequest,
  CallToolResult,
} from '../src/types/mcp.js';

/**
 * Calculator service options
 */
export interface CalculatorOptions {
  precision?: number;
}

/**
 * Calculator MCP Service
 */
class CalculatorService implements IMCPService {
  private precision: number;

  constructor(options: CalculatorOptions = {}) {
    this.precision = options.precision ?? 2;
  }

  async initialize(): Promise<InitializeResult> {
    return {
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: 'calculator',
        version: '1.0.0',
      },
      capabilities: {
        tools: {},
      },
    };
  }

  async listTools(): Promise<ListToolsResult> {
    return {
      tools: [
        {
          name: 'add',
          description: 'Add two numbers',
          parameters: {
            a: {
              type: 'number',
              description: 'First number',
              required: true,
            },
            b: {
              type: 'number',
              description: 'Second number',
              required: true,
            },
          },
        },
        {
          name: 'subtract',
          description: 'Subtract two numbers',
          parameters: {
            a: {
              type: 'number',
              description: 'First number',
              required: true,
            },
            b: {
              type: 'number',
              description: 'Second number',
              required: true,
            },
          },
        },
        {
          name: 'multiply',
          description: 'Multiply two numbers',
          parameters: {
            a: {
              type: 'number',
              description: 'First number',
              required: true,
            },
            b: {
              type: 'number',
              description: 'Second number',
              required: true,
            },
          },
        },
        {
          name: 'divide',
          description: 'Divide two numbers',
          parameters: {
            a: {
              type: 'number',
              description: 'Numerator',
              required: true,
            },
            b: {
              type: 'number',
              description: 'Denominator',
              required: true,
            },
          },
        },
      ],
    };
  }

  async callTool(request: CallToolRequest): Promise<CallToolResult> {
    const { name, arguments: args } = request;
    const a = Number(args.a);
    const b = Number(args.b);

    // Validate inputs
    if (isNaN(a) || isNaN(b)) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Both arguments must be valid numbers',
          },
        ],
        isError: true,
      };
    }

    let result: number;

    try {
      switch (name) {
        case 'add':
          result = a + b;
          break;
        case 'subtract':
          result = a - b;
          break;
        case 'multiply':
          result = a * b;
          break;
        case 'divide':
          if (b === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: Division by zero',
                },
              ],
              isError: true,
            };
          }
          result = a / b;
          break;
        default:
          return {
            content: [
              {
                type: 'text',
                text: `Error: Unknown tool: ${name}`,
              },
            ],
            isError: true,
          };
      }

      // Format result with precision
      const formatted = result.toFixed(this.precision);

      return {
        content: [
          {
            type: 'text',
            text: formatted,
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: error instanceof Error ? error.message : String(error),
          },
        ],
        isError: true,
      };
    }
  }

  async close(): Promise<void> {
    // No cleanup needed for this simple service
  }
}

/**
 * Factory function for creating calculator service
 */
export function create(options?: CalculatorOptions): IMCPService {
  return new CalculatorService(options);
}

/**
 * Default export
 */
export default create;
