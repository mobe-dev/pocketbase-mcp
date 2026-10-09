#!/usr/bin/env node
import 'dotenv/config';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readConfig } from './config.js';
import { createServer } from './server.js';
async function main() {
 const app=createServer(readConfig());
 const shutdown=()=>{app.close().then(()=>process.exit(0)).catch(()=>process.exit(1));};
 process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);
 app.server.onerror=()=>console.error('MCP transport error');
 await app.server.connect(new StdioServerTransport());
 console.error('PocketBase MCP server running on stdio');
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Startup failed');process.exitCode=1;});
