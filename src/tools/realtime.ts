import { randomUUID } from 'node:crypto';
import { tool,s,obj,options,query,type Tool } from '../registry.js';
import type { Context } from '../context.js';
interface Subscription { unsubscribe:()=>Promise<void>; events:unknown[]; dropped:number }
export function realtimeTools(ctx:Context):{tools:Tool[];close:()=>Promise<void>} {
 const subscriptions=new Map<string,Subscription>();
 return {tools:[
  tool('subscribe_realtime','Subscribe to collection records or custom realtime topic. Events are buffered (1000 max) until read_realtime_events.',{...options,collection:s,topic:s},['topic'],async(c,a)=>{
   if(subscriptions.size>=100)throw new Error('Subscription limit reached');
   const pb=await c.client(a.asAdmin);const id=randomUUID();const state:Subscription={unsubscribe:async()=>{},events:[],dropped:0};
   const callback=(event:unknown)=>{if(state.events.length>=1000){state.events.shift();state.dropped++;}state.events.push(event);};
   state.unsubscribe=a.collection?await pb.collection(a.collection).subscribe(a.topic,callback,query(a)):await pb.realtime.subscribe(a.topic,callback,query(a));
   subscriptions.set(id,state);return {subscriptionId:id};
  }),
  tool('read_realtime_events','Drain buffered realtime events and report dropped events.',{subscriptionId:s},['subscriptionId'],(_c,a)=>{const state=subscriptions.get(a.subscriptionId);if(!state)throw new Error('Unknown subscription');const events=state.events.splice(0);const dropped=state.dropped;state.dropped=0;return {events,dropped,connected:ctx.user.realtime.isConnected||ctx.admin.realtime.isConnected};}),
  tool('unsubscribe_realtime','Stop subscription and discard buffered events.',{subscriptionId:s},['subscriptionId'],async(_c,a)=>{const state=subscriptions.get(a.subscriptionId);if(!state)throw new Error('Unknown subscription');await state.unsubscribe();subscriptions.delete(a.subscriptionId);return {success:true};})
 ],close:async()=>{await Promise.all([...subscriptions.values()].map(s=>s.unsubscribe()));subscriptions.clear();}};
}
