import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema,ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Context } from './context.js';
import type { Config } from './config.js';
import { Registry } from './registry.js';
import { records } from './tools/records.js';
import { collections } from './tools/collections.js';
import { auth } from './tools/auth.js';
import { admin } from './tools/admin.js';
import { files } from './tools/files.js';
import { realtimeTools } from './tools/realtime.js';
export function createServer(config:Config) {
 const context=new Context(config);const realtime=realtimeTools(context);
 const registry=new Registry(context,[...records,...collections,...auth,...admin,...files,...realtime.tools]);
 const server=new Server({name:'pocketbase-server',version:'1.0.0'},{capabilities:{tools:{}}});
 server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:registry.list()}));
 server.setRequestHandler(CallToolRequestSchema,async request=>registry.call(request.params.name,request.params.arguments));
 return {server,registry,context,close:async()=>{await realtime.close();await context.close();await server.close();}};
}
