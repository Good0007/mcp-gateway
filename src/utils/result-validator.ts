/**
 * Result Validator Utility
 * Validates and truncates tool call results to meet size limits
 */

import { CallToolResult } from '../types/mcp.js';
import { ErrorCode, ToolError } from '../types/errors.js';
import { logger } from './logger.js';

/**
 * Default result size limit (bytes)
 */
export const DEFAULT_RESULT_LIMIT = 1024;

/**
 * Truncation warning message
 */
const TRUNCATION_WARNING = '\n\n[警告: 结果已被截断，原始内容超过大小限制]';

/**
 * Calculate size of text in bytes (UTF-8)
 */
export function getTextSizeInBytes(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}

/**
 * Truncate text to fit within size limit
 */
export function truncateText(text: string, maxBytes: number): string {
  if (getTextSizeInBytes(text) <= maxBytes) {
    return text;
  }

  // Reserve space for warning message
  const warningSize = getTextSizeInBytes(TRUNCATION_WARNING);
  const availableSize = maxBytes - warningSize;

  if (availableSize <= 0) {
    return TRUNCATION_WARNING.slice(0, maxBytes);
  }

  // Binary search for maximum length that fits
  let low = 0;
  let high = text.length;
  let result = '';

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = text.slice(0, mid);
    const size = getTextSizeInBytes(candidate);

    if (size <= availableSize) {
      result = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result + TRUNCATION_WARNING;
}

/**
 * Validate and truncate tool call result
 */
export function validateToolResult(
  result: CallToolResult,
  limit: number = DEFAULT_RESULT_LIMIT,
  toolName?: string
): CallToolResult {
  // Calculate total size of all content
  let totalSize = 0;
  for (const content of result.content) {
    if (content.type === 'text') {
      totalSize += getTextSizeInBytes(content.text);
    }
  }

  // If within limit, return as-is
  if (totalSize <= limit) {
    return result;
  }

  // Log warning
  logger.warn('Tool result exceeds size limit', {
    toolName,
    actualSize: totalSize,
    limit,
  });

  // Truncate content
  const truncatedContent = result.content.map((content) => {
    if (content.type === 'text') {
      return {
        type: 'text' as const,
        text: truncateText(content.text, limit),
      };
    }
    return content;
  });

  return {
    ...result,
    content: truncatedContent,
  };
}

/**
 * Validate result size before returning to client
 * Throws error if result is too large and cannot be truncated safely
 */
export function enforceResultLimit(
  result: CallToolResult,
  limit: number,
  toolName: string
): CallToolResult {
  const validated = validateToolResult(result, limit, toolName);

  // Double-check the result is actually within limit
  let totalSize = 0;
  for (const content of validated.content) {
    if (content.type === 'text') {
      totalSize += getTextSizeInBytes(content.text);
    }
  }

  if (totalSize > limit) {
    throw new ToolError(
      ErrorCode.TOOL_RESULT_TOO_LARGE,
      toolName,
      `Tool result exceeds maximum size limit of ${limit} bytes`,
      { actualSize: totalSize, limit }
    );
  }

  return validated;
}
