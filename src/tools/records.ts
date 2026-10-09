import { tool, s, obj, options, positive, query, type Tool } from '../registry.js';
import { body, fileSchema } from '../files.js';
const base = { collection: s, ...options };
const list = { ...base, filter: s, sort: s, expand: s, fields: s, page: positive, perPage: { ...positive, maximum: 500 }, skipTotal: { type: 'boolean' } };
export const records: Tool[] = [
  tool('list_records', 'List a page of records; supports filters, sorting, relations and field selection.', list, ['collection'], async (c,a) => (await c.client(a.asAdmin)).collection(a.collection).getList(a.page ?? 1,a.perPage ?? 50,query(a))),
  tool('get_record', 'Get one record with optional relation expansion.', { ...base, id:s, expand:s, fields:s }, ['collection','id'], async(c,a)=>(await c.client(a.asAdmin)).collection(a.collection).getOne(a.id,query(a))),
  tool('get_first_record', 'Get the first record matching a filter.', {...base,filter:s},['collection','filter'],async(c,a)=>(await c.client(a.asAdmin)).collection(a.collection).getFirstListItem(a.filter,query(a))),
  ...(['create','update','delete'] as const).map(op=>tool(`${op}_record`, `${op} a record. File uploads use base64 files; field modifiers are passed through.`, {...base,...(op!=='create'?{id:s}:{}),...(op!=='delete'?{data:obj,files:fileSchema}:{})}, ['collection',...(op!=='create'?['id']:[]),...(op!=='delete'?['data']:[])], async(c,a)=>{
    const service=(await c.client(a.asAdmin)).collection(a.collection);
    if(op==='create') return service.create(body(a),query(a));
    if(op==='update') return service.update(a.id,body(a),query(a));
    return service.delete(a.id,query(a));
  })),
  tool('batch_records','Transactional create/update/upsert/delete across collections. Enable batch API in PocketBase settings.', {...options,requests:{type:'array',minItems:1,maxItems:1000,items:{type:'object',properties:{collection:s,operation:{enum:['create','update','upsert','delete']},id:s,data:obj,files:fileSchema},required:['collection','operation'],additionalProperties:false}}},['requests'],async(c,a)=>{
    const batch=(await c.client(a.asAdmin)).createBatch();
    for(const r of a.requests){const service=batch.collection(r.collection);if(['update','delete'].includes(r.operation)&&!r.id)throw new Error('Batch update/delete requires id');if(r.operation!=='delete'&&!r.data)throw new Error('Batch write requires data');if(r.operation==='delete')service.delete(r.id);else if(r.operation==='update')service.update(r.id,body(r));else if(r.operation==='upsert')service.upsert(body(r));else service.create(body(r));}return batch.send(query(a));
  }),
  tool('import_data','Import records transactionally. Update requires id; upsert uses PocketBase batch upsert.', {...base,data:{type:'array',minItems:1,items:obj},mode:{enum:['create','update','upsert']}},['collection','data'],async(c,a)=>{
    const batch=(await c.client(a.asAdmin)).createBatch();const service=batch.collection(a.collection);
    for(const data of a.data){if(a.mode==='update'){if(!data.id)throw new Error('Update import requires id');service.update(data.id,data);}else if(a.mode==='upsert')service.upsert(data);else service.create(data);}return batch.send(query(a));
  })
];
