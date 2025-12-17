import { openaiChat } from './openaiProxy.js';

class AgentState{
  constructor(){
    this.conversation=[];
  }
  addUserMessage(content){
    this.conversation.push({role:'user',content});
    console.log('USER:',content);
  }
  addAgentMessage(content){
    this.conversation.push({role:'assistant',content});
    console.log('AGENT:',content);
  }
  async queryLLM(prompt, pageContext){
    const ctx = pageContext? `Context: ${pageContext}\nPrompt: ${prompt}`: prompt;
    const completion = await openaiChat(ctx);
    return completion;
  }
}
export const agentState = new AgentState();
