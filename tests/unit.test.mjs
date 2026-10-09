import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../build/server.js';
import { readConfig } from '../build/config.js';
import { body } from '../build/files.js';
import { query } from '../build/registry.js';
import { ClientResponseError } from 'pocketbase';
const config={url:'http://127.0.0.1:8090',email:'test@example.com',password:'fixture-password'};
test('config validates base URL and paired credentials',()=>{
 assert.throws(()=>readConfig({}),/required/);
 assert.throws(()=>readConfig({POCKETBASE_URL:'file:///tmp'}),/HTTP/);
 assert.throws(()=>readConfig({POCKETBASE_URL:config.url,POCKETBASE_ADMIN_EMAIL:'x'}),/both/);
 assert.equal(readConfig({POCKETBASE_URL:config.url}).url,config.url);
});
test('every advertised tool dispatches and validates required inputs',async()=>{
 const app=createServer(config);
 for(const definition of app.registry.tools){
  let called=false;const original=definition.run;definition.run=()=>{called=true;return {ok:true};};
  const args={};for(const key of definition.inputSchema.required){const property=definition.inputSchema.properties[key];args[key]=property.enum?.[0]??(property.type==='array'?[{collection:'posts',operation:'create'}]:property.type==='object'?{}:property.type==='integer'?1:'value');}
  await app.registry.call(definition.name,args);assert.equal(called,true,definition.name);definition.run=original;
  if(definition.inputSchema.required.length)await assert.rejects(()=>app.registry.call(definition.name,{}),/Invalid arguments/);
 }
 await assert.rejects(()=>app.registry.call('missing'),/Unknown tool/);
 await assert.rejects(()=>app.registry.call('list_records',{collection:'posts',page:0}),/Invalid arguments/);
 await assert.rejects(()=>app.registry.call('health_check',{bogus:true}),/Invalid arguments/);
 await app.close();
});
test('parallel superuser initialization logs in once and never changes user session',async()=>{
 const app=createServer(config);let count=0;
 app.context.admin.collection=()=>({authWithPassword:async()=>{count++;await new Promise(r=>setTimeout(r,10));app.context.admin.authStore.save('header.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.sig');}});
 await Promise.all([app.context.client(true),app.context.client(true),app.context.client(true)]);
 assert.equal(count,1);assert.equal(app.context.user.authStore.token,'');await app.close();
});
test('collection fields and null rules pass through without injecting dates',async()=>{
 const app=createServer(config);let received, receivedOptions;app.context.client=async()=>({collections:{create:async (data,opts)=>{received=data;receivedOptions=opts;return data;}}});
 await app.registry.call('create_collection',{name:'posts',fields:[{name:'title',type:'text',max:120}],listRule:null,data:{customOption:1}});
 assert.deepEqual(received,{customOption:1,name:'posts',fields:[{name:'title',type:'text',max:120}],listRule:null});assert.deepEqual(receivedOptions,{query:{}});await app.close();
});
test('OTP authentication calls authWithOTP, request is separate',async()=>{
 const app=createServer(config);let received;app.context.user.collection=()=>({authWithOTP:async(...args)=>{received=args;return {};},requestOTP:async email=>({otpId:email})});
 await app.registry.call('authenticate_with_otp',{otpId:'otp',password:'123',options:{mfaId:'mfa'}});
 assert.deepEqual(received,['otp','123',{query:{mfaId:'mfa'}}]);assert.equal(JSON.parse((await app.registry.call('request_otp',{email:'a@example.com'})).content[0].text).otpId,'a@example.com');await app.close();
});
test('multipart retains JSON values and binary bytes; rejects corrupt base64',async()=>{
 const form=body({data:{tags:['a','b'],count:0},files:[{field:'image+',filename:'a.bin',base64:'AAEC'}]});
 assert.equal(form.get('tags'),'["a","b"]');assert.equal(form.get('count'),'0');assert.deepEqual(Buffer.from(await form.get('image+').arrayBuffer()),Buffer.from([0,1,2]));
 assert.throws(()=>body({data:{},files:[{field:'x',filename:'x',base64:'!'}]}),/base64/);
});
test('query and custom routes cannot override transport or escape instance',async()=>{
 assert.throws(()=>query({options:{headers:{Authorization:'bad'}}}),/Unsupported/);
 const app=createServer(config);
 for(const path of ['https://evil.test/api/x','//evil.test/api/x','/api/../x','/api/%2e%2e/x','/api/%2f%2fevil','/api/x?token=x'])assert.equal((await app.registry.call('api_request',{path,method:'GET'})).isError,true,path);
 await app.close();
});
test('SDK errors preserve status and safe validation details without request credentials',async()=>{
 const app=createServer(config);app.registry.tools.find(t=>t.name==='health_check').run=()=>{throw new ClientResponseError({url:'http://x?token=secret',status:400,response:{message:'Validation failed',data:{title:{code:'required',message:'Title required'},password:{message:'secret'}}},originalError:new Error('secret')});};
 const result=await app.registry.call('health_check',{});assert.equal(result.isError,true);assert.match(result.content[0].text,/Title required/);assert.doesNotMatch(result.content[0].text,/secret|http/);await app.close();
});
test('MFA challenge remains available for second authentication step',async()=>{
 const app=createServer(config);app.context.user.collection=()=>({authWithPassword:async()=>{throw new ClientResponseError({status:401,response:{message:'MFA required',mfaId:'challenge-id'}});}});
 const result=await app.registry.call('authenticate_user',{email:'a@example.com',password:'fixture-password'});assert.equal(result.isError,true);assert.equal(JSON.parse(result.content[0].text).mfaId,'challenge-id');await app.close();
});
test('all email and external auth tools invoke correct SDK methods and arguments',async()=>{
 const app=createServer(config);
 for(const [name,method,keys] of [
 ['request_verification','requestVerification',['email']],['confirm_verification','confirmVerification',['token']],
 ['request_password_reset','requestPasswordReset',['email']],['confirm_password_reset','confirmPasswordReset',['token','password','passwordConfirm']],
 ['request_email_change','requestEmailChange',['newEmail']],['confirm_email_change','confirmEmailChange',['token','password']],
 ['list_external_auths','listExternalAuths',['id']],['unlink_external_auth','unlinkExternalAuth',['id','provider']]]){
  let received;app.context.client=async()=>({collection:collection=>{assert.equal(collection,'members');return {[method]:async(...args)=>{received=args;return true;}};}});
  const args={collection:'members',...Object.fromEntries(keys.map(k=>[k,k+'-value']))};const result=await app.registry.call(name,args);
  assert.ok(!result.isError,name);assert.deepEqual(received,[...keys.map(k=>k+'-value'),{query:{}}]);
 }
 await app.close();
});
test('realtime buffers are bounded and reports overflow',async()=>{
 const app=createServer(config);let emit;let stopped=false;
 app.context.client=async()=>({realtime:{subscribe:async(_topic,callback)=>{emit=callback;return async()=>{stopped=true;};}}});
 const created=await app.registry.call('subscribe_realtime',{topic:'custom'});const args=JSON.parse(created.content[0].text);
 for(let i=0;i<1005;i++)emit({i});
 const drained=JSON.parse((await app.registry.call('read_realtime_events',args)).content[0].text);assert.equal(drained.events.length,1000);assert.equal(drained.dropped,5);assert.equal(drained.events[0].i,5);
 await app.registry.call('unsubscribe_realtime',args);assert.equal(stopped,true);assert.equal((await app.registry.call('read_realtime_events',args)).isError,true);await app.close();
});
