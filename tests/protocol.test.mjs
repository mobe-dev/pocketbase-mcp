import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
test('built CLI speaks MCP over stdio, lists tools and reports errors',async()=>{
 const transport=new StdioClientTransport({command:process.execPath,args:['build/index.js'],env:{POCKETBASE_URL:'http://127.0.0.1:1'},stderr:'inherit'});
 transport.stderr?.on('data', chunk=>process.stderr.write(chunk));
 const client=new Client({name:'test',version:'1.0.0'});try{
 await client.connect(transport);const {tools}=await client.listTools();assert.ok(tools.length>=60);
 assert.equal(new Set(tools.map(t=>t.name)).size,tools.length);
 const result=await client.callTool({name:'health_check',arguments:{}});assert.equal(result.isError,true);
 await assert.rejects(()=>client.callTool({name:'create_record',arguments:{}}),/Invalid arguments/);
 }finally{await client.close();}
});
