import { tool,s,obj,options,query,type Tool } from '../registry.js';
export const files:Tool[]=[
 tool('get_file_token','Get short-lived token for protected file downloads.',options,[],async(c,a)=>({token:await(await c.client(a.asAdmin)).files.getToken(query(a))})),
 tool('get_file_url','Build a file URL with optional thumbnail, download flag and protected file token.',{...options,record:obj,filename:s,thumb:s,download:{type:'boolean'},protected:{type:'boolean'}},['record','filename'],async(c,a)=>{const pb=await c.client(a.asAdmin);if(!a.record.id||!(a.record.collectionId||a.record.collectionName))throw new Error('record requires id and collectionId or collectionName');return {url:pb.files.getURL(a.record,a.filename,{thumb:a.thumb,download:a.download,token:a.protected?await pb.files.getToken():undefined})};})
];
