import { Ajv } from 'ajv';
import { ClientResponseError } from 'pocketbase';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { Context } from './context.js';
export type Args = Record<string, any>;
export type Schema = Record<string, any>;
export interface Tool { name: string; description: string; inputSchema: Schema; run: (ctx: Context, args: Args) => unknown | Promise<unknown> }
export const s = { type: 'string', minLength: 1 };
export const obj = { type: 'object', additionalProperties: true };
export const bool = { type: 'boolean' };
export const positive = { type: 'integer', minimum: 1 };
export const options = { options: { ...obj, description: 'PocketBase query options (expand, fields, filter, sort, skipTotal, custom hook parameters). Transport and authorization overrides are rejected.' }, asAdmin: bool };
export function tool(name: string, description: string, properties: Schema, required: string[], run: Tool['run']): Tool {
  return { name, description, inputSchema: { type: 'object', properties, required, additionalProperties: false }, run };
}
export function query(a: Args) {
  const result = { ...a.options };
  for (const key of ['filter', 'sort', 'fields', 'expand', 'skipTotal']) if (a[key] !== undefined && (key !== 'fields' || typeof a[key] === 'string')) result[key] = a[key];
  for (const key of ['fetch','headers','method','body','signal','requestKey','$autoCancel','$cancelKey','query']) if (key in result) throw new Error(`Unsupported query option: ${key}`);
  return { query: result };
}
export class Registry {
  readonly tools: Tool[];
  private validators;
  constructor(readonly ctx: Context, tools: Tool[]) {
    this.tools = tools;
    if (new Set(tools.map(t => t.name)).size !== tools.length) throw new Error('Duplicate tool name');
    const ajv = new Ajv({ allErrors: true, strict: false });
    this.validators = new Map(tools.map(t => [t.name, ajv.compile(t.inputSchema)]));
  }
  list() { return this.tools.map(({ run, ...definition }) => definition); }
  async call(name: string, args: unknown = {}) {
    const definition = this.tools.find(t => t.name === name);
    if (!definition) throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    const validate = this.validators.get(name)!;
    if (!validate(args)) throw new McpError(ErrorCode.InvalidParams, `Invalid arguments: ${JSON.stringify(validate.errors)}`);
    try {
      const result = await definition.run(this.ctx, args as Args);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result ?? { success: true }, null, 2) }] };
    } catch (error) {
      // Never serialize the SDK error wholesale: it contains request URLs and credentials.
      const payload = error instanceof ClientResponseError ? { status: error.status, message: error.response.message || 'PocketBase request failed', data: sanitize(error.response.data), ...(typeof error.response.mfaId === 'string' ? { mfaId: error.response.mfaId } : {}) } : { message: error instanceof Error ? error.message : 'Operation failed' };
      return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify(payload) }] };
    }
  }
}
function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !/password|token|secret|authorization/i.test(key)).map(([key, v]) => [key, sanitize(v)]));
  return value;
}
