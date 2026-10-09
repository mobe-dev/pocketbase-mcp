import { tool,s,obj,options,positive,query,type Tool } from '../registry.js';
import { body } from '../files.js';
export const admin:Tool[]=[
 tool('health_check','Check PocketBase health.',options,[],async(c,a)=>c.user.health.check(query(a))),
 tool('get_settings','Read application settings (superuser).',options,[],async(c,a)=>(await c.client(true)).settings.getAll(query(a))),
 tool('update_settings','Update application settings including mail, storage, rate limits, batch, backups and auth.',{...options,data:obj},['data'],async(c,a)=>(await c.client(true)).settings.update(a.data,query(a))),
 tool('test_s3','Test configured S3 storage.',{...options,filesystem:{enum:['storage','backups']}},[],async(c,a)=>(await c.client(true)).settings.testS3(a.filesystem??'storage',query(a))),
 tool('test_email','Send a test auth email template.',{...options,collection:s,email:s,template:s},['collection','email','template'],async(c,a)=>(await c.client(true)).settings.testEmail(a.collection,a.email,a.template,query(a))),
 tool('generate_apple_client_secret','Generate Apple OAuth2 client secret.',{...options,clientId:s,teamId:s,keyId:s,privateKey:s,duration:positive},['clientId','teamId','keyId','privateKey','duration'],async(c,a)=>(await c.client(true)).settings.generateAppleClientSecret(a.clientId,a.teamId,a.keyId,a.privateKey,a.duration,query(a))),
 tool('list_logs','List request logs with pagination and filters.',{...options,page:positive,perPage:positive,filter:s,sort:s},[],async(c,a)=>(await c.client(true)).logs.getList(a.page??1,a.perPage??50,query(a))),
 tool('get_log','Get one request log.',{...options,id:s},['id'],async(c,a)=>(await c.client(true)).logs.getOne(a.id,query(a))),
 tool('get_log_stats','Get hourly log statistics, with options.filter.',options,[],async(c,a)=>(await c.client(true)).logs.getStats(query(a))),
 tool('truncate_logs','Delete all logs.',options,[],async(c,a)=>(await c.client(true)).logs.truncate(query(a))),
 tool('list_backups','List backups.',options,[],async(c,a)=>(await c.client(true)).backups.getFullList(query(a))),
 tool('backup_database','Create backup; omitted name lets PocketBase generate a name.',{...options,name:s},[],async(c,a)=>(await c.client(true)).backups.create(a.name??'',query(a))),
 tool('upload_backup','Upload backup ZIP encoded as base64.',{...options,filename:s,base64:{type:'string',maxLength:14000000}},['filename','base64'],async(c,a)=>(await c.client(true)).backups.upload(body({data:{},files:[{field:'file',filename:a.filename,base64:a.base64,contentType:'application/zip'}]}) as FormData,query(a))),
 tool('delete_backup','Delete a backup.',{...options,key:s},['key'],async(c,a)=>(await c.client(true)).backups.delete(a.key,query(a))),
 tool('restore_backup','Restore backup. PocketBase may restart and disconnect; verify health afterwards.',{...options,key:s},['key'],async(c,a)=>(await c.client(true)).backups.restore(a.key,query(a))),
 tool('get_backup_download_url','Generate a short-lived authorized backup download URL.',{...options,key:s},['key'],async(c,a)=>{const pb=await c.client(true);return {url:pb.backups.getDownloadURL(await pb.files.getToken(),a.key)};}),
 tool('list_crons','List registered scheduled jobs.',options,[],async(c,a)=>(await c.client(true)).crons.getFullList(query(a))),
 tool('run_cron','Trigger a registered scheduled job.',{...options,id:s},['id'],async(c,a)=>(await c.client(true)).crons.run(a.id,query(a))),
 tool('run_sql','Execute raw SQL (PocketBase 0.39+). Can bypass record validation and hooks; use for administration.',{...options,query:s},['query'],async(c,a)=>(await c.client(true)).sql.run(a.query,query(a))),
 tool('api_request','Call custom or future PocketBase API routes on the configured instance. Relative /api/ paths only; no transport/auth overrides.',{...options,path:s,method:{enum:['GET','POST','PUT','PATCH','DELETE']},data:obj},['path','method'],async(c,a)=>{
   if(!/^\/api\//.test(a.path)||/[?#\\]/.test(a.path)||a.path.split('/').some((segment:string)=>{const decoded=decodeURIComponent(segment);return decoded==='.'||decoded==='..'||/[\\/]/.test(decoded);}))throw new Error('path must be a relative /api/ route without traversal, query or fragment');
   return(await c.client(a.asAdmin)).send(a.path,{...query(a),method:a.method,body:a.data});
 })
];
