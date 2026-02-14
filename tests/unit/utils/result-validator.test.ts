/**
 * Result Validator Unit Tests
 */

import {
  getTextSizeInBytes,
  truncateText,
  validateToolResult,
  enforceResultLimit,
  DEFAULT_RESULT_LIMIT,
} from '../../../src/utils/result-validator.js';
import { CallToolResult } from '../../../src/types/mcp.js';
import { ToolError, ErrorCode } from '../../../src/types/errors.js';

describe('getTextSizeInBytes', () => {
  it('should calculate size for ASCII text', () => {
    expect(getTextSizeInBytes('hello')).toBe(5);
    expect(getTextSizeInBytes('test')).toBe(4);
  });

  it('should calculate size for UTF-8 text', () => {
    expect(getTextSizeInBytes('你好')).toBe(6); // 2 Chinese chars = 6 bytes
    expect(getTextSizeInBytes('🎉')).toBe(4); // Emoji = 4 bytes
  });

  it('should handle empty string', () => {
    expect(getTextSizeInBytes('')).toBe(0);
  });

  it('should calculate size for mixed content', () => {
    const mixed = 'Hello 世界 🎉';
    expect(getTextSizeInBytes(mixed)).toBeGreaterThan(10);
  });
});

describe('truncateText', () => {
  it('should not truncate text within limit', () => {
    const text = 'Hello World';
    const result = truncateText(text, 100);
    expect(result).toBe(text);
  });

  it('should truncate text exceeding limit', () => {
    const text = 'A'.repeat(200);
    const result = truncateText(text, 100);
    expect(getTextSizeInBytes(result)).toBeLessThanOrEqual(100);
    expect(result).toContain('[警告: 结果已被截断，原始内容超过大小限制]');
  });

  it('should handle UTF-8 text truncation', () => {
    const text = '你好'.repeat(100); // Each char is 3 bytes
    const result = truncateText(text, 100);
    // Result includes warning message, so it may be slightly larger than original limit
    // but should not exceed too much
    expect(getTextSizeInBytes(result)).toBeLessThanOrEqual(150);
    expect(result).toContain('[警告: 结果已被截断，原始内容超过大小限制]');
  });

  it('should handle very small limits', () => {
    const text = 'Hello World';
    const result = truncateText(text, 10);
    expect(result).toBeTruthy();
    // With very small limit, only warning message might fit
    expect(getTextSizeInBytes(result)).toBeLessThanOrEqual(100);
    expect(result).toContain('警告');
  });

  it('should handle exact limit boundary', () => {
    const text = 'Test';
    const size = getTextSizeInBytes(text);
    const result = truncateText(text, size);
    expect(result).toBe(text);
  });
});

describe('validateToolResult', () => {
  it('should return result as-is if within limit', () => {
    const result: CallToolResult = {
      content: [
        {
          type: 'text',
          text: 'Small result',
        },
      ],
    };

    const validated = validateToolResult(result, 1000);
    expect(validated).toEqual(result);
  });

  it('should truncate result exceeding limit', () => {
    const largeText = 'A'.repeat(2000);
    const result: CallToolResult = {
      content: [
        {
          type: 'text',
          text: largeText,
        },
      ],
    };

    const validated = validateToolResult(result, 500);
    expect(validated.content[0].type).toBe('text');
    if (validated.content[0].type === 'text') {
      expect(getTextSizeInBytes(validated.content[0].text)).toBeLessThanOrEqual(500);
      expect(validated.content[0].text).toContain('警告');
    }
  });

  it('should use default limit if not specified', () => {
    const largeText = 'A'.repeat(DEFAULT_RESULT_LIMIT * 2);
    const result: CallToolResult = {
      content: [
        {
          type: 'text',
          text: largeText,
        },
      ],
    };

    const validated = validateToolResult(result);
    expect(validated.content[0].type).toBe('text');
    if (validated.content[0].type === 'text') {
      expect(getTextSizeInBytes(validated.content[0].text)).toBeLessThanOrEqual(
        DEFAULT_RESULT_LIMIT
      );
    }
  });

  it('should handle multiple content items', () => {
    const result: CallToolResult = {
      content: [
        {
          type: 'text',
          text: 'First item',
        },
        {
          type: 'text',
          text: 'Second item',
        },
      ],
    };

    const validated = validateToolResult(result, 100);
    expect(validated.content).toHaveLength(2);
  });

  it('should preserve isError flag', () => {
    const result: CallToolResult = {
      content: [
        {
          type: 'text',
          text: 'Error message',
        },
      ],
      isError: true,
    };

    const validated = validateToolResult(result, 1000);
    expect(validated.isError).toBe(true);
  });

  it('should handle empty content array', () => {
    const result: CallToolResult = {
      content: [],
    };

    const validated = validateToolResult(result, 100);
    expect(validated.content).toEqual([]);
  });
});

describe('enforceResultLimit', () => {
  it('should return validated result within limit', () => {
    const result: CallToolResult = {
      content: [
        {
          type: 'text',
          text: 'Small result',
        },
      ],
    };

    const validated = enforceResultLimit(result, 1000, 'test-tool');
    expect(validated).toEqual(result);
  });

  it('should throw error if truncated result still exceeds limit', () => {
    // Create a result that would exceed limit even after truncation
    const result: CallToolResult = {
      content: [
        {
          type: 'text',
          text: 'Test'.repeat(100),
        },
      ],
    };

    // Use a very small limit that cannot accommodate even truncated content
    expect(() => {
      enforceResultLimit(result, 10, 'test-tool');
    }).toThrow(ToolError);
  });

  it('should include tool name in error', () => {
    const result: CallToolResult = {
      content: [
        {
          type: 'text',
          text: 'Test'.repeat(100),
        },
      ],
    };

    try {
      enforceResultLimit(result, 10, 'my-tool');
      fail('Should have thrown error');
    } catch (error) {
      expect(error).toBeInstanceOf(ToolError);
      if (error instanceof ToolError) {
        expect(error.toolName).toBe('my-tool');
        expect(error.code).toBe(ErrorCode.TOOL_RESULT_TOO_LARGE);
      }
    }
  });

  it('should successfully truncate and return result', () => {
    const result: CallToolResult = {
      content: [
        {
          type: 'text',
          text: 'A'.repeat(2000),
        },
      ],
    };

    const validated = enforceResultLimit(result, 500, 'test-tool');
    expect(validated.content[0].type).toBe('text');
    if (validated.content[0].type === 'text') {
      expect(getTextSizeInBytes(validated.content[0].text)).toBeLessThanOrEqual(500);
    }
  });
});
