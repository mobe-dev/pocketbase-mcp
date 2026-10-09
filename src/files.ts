import type { Args } from './registry.js';
export const fileSchema = { type: 'array', maxItems: 100, items: { type: 'object', properties: { field: { type: 'string', minLength: 1 }, filename: { type: 'string', minLength: 1 }, base64: { type: 'string', maxLength: 14000000 }, contentType: { type: 'string' } }, required: ['field', 'filename', 'base64'], additionalProperties: false } };
export function body(a: Args): Record<string, any> | FormData {
  if (!a.files?.length) return a.data;
  const form = new FormData();
  for (const [key, value] of Object.entries(a.data || {})) form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  for (const file of a.files) {
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.base64)) throw new Error('Invalid file base64');
    form.append(file.field, new Blob([Buffer.from(file.base64, 'base64')], { type: file.contentType || 'application/octet-stream' }), file.filename);
  }
  return form;
}
