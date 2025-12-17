class MCPClient{
  constructor({tools}){
    this.tools = Object.fromEntries(tools.map(t=>[t.id,t]));
  }
  async invoke(id, params={}){
    const tool=this.tools[id];
    if(!tool) throw new Error('Unknown tool '+id);
    const allowed = await this.askConsent(tool.description);
    if(!allowed) throw new Error('User denied '+id);
    switch(id){
      case 'page.getContent':
        return document.documentElement.innerText.slice(0,5000);
      default:
        throw new Error('Not implemented');
    }
  }
  askConsent(text){
    return new Promise(res=>{
      const ok = confirm(text + '\nAllow?');
      res(ok);
    });
  }
}

export const mcp = new MCPClient({
  tools:[{
    id:'page.getContent',
    description:'Read webpage text for context'
  }]
});
