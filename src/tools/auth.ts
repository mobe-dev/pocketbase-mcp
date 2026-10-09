import { tool,s,obj,options,positive,query,type Tool } from '../registry.js';
const base={collection:s,...options};
export const auth: Tool[]=[
 tool('authenticate_user','Authenticate by password. isAdmin selects an isolated superuser session; returns the authentication token.',{...base,email:s,identity:s,password:s,isAdmin:{type:'boolean'}},['password'],async(c,a)=>{if(!a.identity&&!a.email)throw new Error('identity or email is required');return (a.isAdmin?c.admin:c.user).collection(a.isAdmin?'_superusers':a.collection??'users').authWithPassword(a.identity??a.email,a.password,query(a));}),
 tool('authenticate_with_oauth2','Complete OAuth2 authorization code + PKCE flow. Initiate using list_auth_methods.',{...base,provider:s,code:s,codeVerifier:s,redirectUrl:s,createData:obj},['provider','code','codeVerifier','redirectUrl'],async(c,a)=>c.user.collection(a.collection??'users').authWithOAuth2Code(a.provider,a.code,a.codeVerifier,a.redirectUrl,a.createData,query(a))),
 tool('request_otp','Request OTP email; returns otpId used by authenticate_with_otp.',{...base,email:s},['email'],async(c,a)=>c.user.collection(a.collection??'users').requestOTP(a.email,query(a))),
 tool('authenticate_with_otp','Authenticate using otpId and OTP password (supports MFA via options.mfaId).',{...base,otpId:s,password:s},['otpId','password'],async(c,a)=>c.user.collection(a.collection??'users').authWithOTP(a.otpId,a.password,query(a))),
 tool('list_auth_methods','List password, OAuth2, OTP and MFA configuration.',base,[],async(c,a)=>c.user.collection(a.collection??'users').listAuthMethods(query(a))),
 tool('auth_refresh','Refresh current user or superuser token.',base,[],async(c,a)=>{const pb=await c.client(a.asAdmin);return pb.collection(a.collection??pb.authStore.record?.collectionName??'users').authRefresh(query(a));}),
 tool('auth_status','Inspect session validity and record without exposing token.',{asAdmin:{type:'boolean'}},[],(c,a)=>{const store=(a.asAdmin?c.admin:c.user).authStore;return {isValid:store.isValid,isSuperuser:store.isSuperuser,record:store.record};}),
 tool('logout','Clear user or superuser authentication and subscriptions.',{asAdmin:{type:'boolean'}},[],async(c,a)=>{const pb=a.asAdmin?c.admin:c.user;await pb.realtime.unsubscribe();pb.authStore.clear();return {success:true};}),
 tool('create_user','Create auth record with custom data.',{...base,email:s,password:s,passwordConfirm:s,name:s,data:obj},['email','password','passwordConfirm'],async(c,a)=>(await c.client(a.asAdmin)).collection(a.collection??'users').create({...a.data,email:a.email,password:a.password,passwordConfirm:a.passwordConfirm,...(a.name!==undefined?{name:a.name}:{})},query(a))),
 tool('impersonate_user','Create an impersonation token and select it as the user session. Superuser session remains separate.',{collectionIdOrName:s,id:s,duration:positive,...options},['id'],async(c,a)=>{const pb=await c.client(true);const impersonated=await pb.collection(a.collectionIdOrName??'users').impersonate(a.id,a.duration??3600,query(a));await c.user.realtime.unsubscribe();c.user.authStore.save(impersonated.authStore.token,impersonated.authStore.record);return {token:c.user.authStore.token,record:c.user.authStore.record};}),
 ...[
  ['request_verification','requestVerification',['email']],
  ['confirm_verification','confirmVerification',['token']],
  ['request_password_reset','requestPasswordReset',['email']],
  ['confirm_password_reset','confirmPasswordReset',['token','password','passwordConfirm']],
  ['request_email_change','requestEmailChange',['newEmail']],
  ['confirm_email_change','confirmEmailChange',['token','password']],
  ['list_external_auths','listExternalAuths',['id']],
  ['unlink_external_auth','unlinkExternalAuth',['id','provider']]
 ].map(([name,method,keys])=>{const required=keys as string[];return tool(name as string,`Auth operation: ${method}.`,{...base,...Object.fromEntries(required.map(k=>[k,s]))},required,async(c,a)=>{
   const service=(await c.client(a.asAdmin)).collection(a.collection??'users');
   return (service[method as keyof typeof service] as (...args:any[])=>Promise<unknown>).apply(service,[...required.map(k=>a[k]),query(a)]);
 });})
];
