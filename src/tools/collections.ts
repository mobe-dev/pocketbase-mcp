import { tool,s,obj,options,positive,query,type Tool } from '../registry.js';
const collection = { collectionIdOrName:s,...options };
const fields = {type:'array',items:obj};
const definition = { name:s,type:{enum:['base','auth','view']},fields,indexes:{type:'array',items:s},...Object.fromEntries(['listRule','viewRule','createRule','updateRule','deleteRule','manageRule','authRule'].map(k=>[k,{type:['string','null']}])),viewQuery:s,passwordAuth:obj,oauth2:obj,otp:obj,mfa:obj,authAlert:obj,authToken:obj,passwordResetToken:obj,emailChangeToken:obj,verificationToken:obj,fileToken:obj,verificationTemplate:obj,resetPasswordTemplate:obj,confirmEmailChangeTemplate:obj,data:obj };
export const collections: Tool[] = [
 tool('list_collections','List a page of collection schemas.',{...options,page:positive,perPage:positive,filter:s,sort:s,fields:s},[],async(c,a)=>(await c.client(true)).collections.getList(a.page??1,a.perPage??100,query(a))),
 tool('get_collection','Get a collection schema.',{...collection,fields:s},['collectionIdOrName'],async(c,a)=>(await c.client(true)).collections.getOne(a.collectionIdOrName,query(a))),
 tool('create_collection','Create base/auth/view collection. All field settings are preserved; data accepts additional version-specific collection options. No fields are injected.',{...definition,...options},['name'],async(c,a)=>{const {options:_,asAdmin:__,data,...values}=a;return(await c.client(true)).collections.create({...data,...values},query(a));}),
 tool('update_collection','Update collection schema/options. fields replaces the field list. Rules may be null (locked), empty (public), or filters.',{...definition,...collection},['collectionIdOrName'],async(c,a)=>{const {collectionIdOrName,options:_,asAdmin:__,data,...values}=a;return(await c.client(true)).collections.update(collectionIdOrName,{...data,...values},query(a));}),
 tool('delete_collection','Delete collection and its records.',collection,['collectionIdOrName'],async(c,a)=>(await c.client(true)).collections.delete(a.collectionIdOrName,query(a))),
 tool('truncate_collection','Delete all records in a collection.',collection,['collectionIdOrName'],async(c,a)=>(await c.client(true)).collections.truncate(a.collectionIdOrName,query(a))),
 tool('import_collections','Import collection schemas, optionally delete missing collections.',{...options,collections:{type:'array',items:obj},deleteMissing:{type:'boolean'}},['collections'],async(c,a)=>(await c.client(true)).collections.import(a.collections,a.deleteMissing??false,query(a))),
 tool('get_collection_scaffolds','Get default base/auth/view collection scaffolds.',options,[],async(c,a)=>(await c.client(true)).collections.getScaffolds(query(a))),
 tool('list_oauth2_providers','List configurable OAuth2 providers.',options,[],async(c,a)=>(await c.client(true)).collections.getAllOAuth2Providers(query(a))),
 tool('dry_run_view_query','Validate view SQL and infer fields.',{...options,query:s},['query'],async(c,a)=>(await c.client(true)).collections.dryRunViewQuery(a.query,query(a)))
];
