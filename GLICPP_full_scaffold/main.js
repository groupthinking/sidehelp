import { checkFirstRun, markFREComplete } from './fre.js';
import { agentState } from './agentState.js';
import { initGPUCanvas } from './gpuAgentRenderer.js';
import { mcp } from './mcpClient.js';

const onboardingPanel = document.getElementById('onboardingPanel');
const guestPanel = document.getElementById('guestPanel');
const greetingEl = document.getElementById('greeting');

function showPanel(panel){
  [onboardingPanel,guestPanel].forEach(p=>p.classList.add('hidden'));
  panel.classList.remove('hidden');
}

window.addEventListener('DOMContentLoaded', async ()=> {
  if(checkFirstRun()){
    showPanel(onboardingPanel);
    document.getElementById('continueBtn').addEventListener('click', ()=>{
      markFREComplete();
      boot();
    });
  } else {
    boot();
  }
});

async function boot(){
  showPanel(guestPanel);
  greetingEl.textContent = `Hello, ${navigator.language || 'friend'}!`;
  initGPUCanvas(document.getElementById('gpuCanvas'));
  attachPromptHandler();
}

function attachPromptHandler(){
  const input = document.getElementById('promptInput');
  const btn = document.getElementById('sendBtn');
  const send = async ()=> {
    const text = input.value.trim();
    if(!text) return;
    input.value='';
    agentState.addUserMessage(text);
    const pageContent = await mcp.invoke('page.getContent').catch(()=>null);
    const response = await agentState.queryLLM(text, pageContent);
    agentState.addAgentMessage(response);
  };
  btn.addEventListener('click', send);
  input.addEventListener('keydown', e=>{ if(e.key==='Enter') send(); });
}
