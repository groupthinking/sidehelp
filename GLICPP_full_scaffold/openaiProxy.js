export async function openaiChat(prompt){
  const resp = await fetch('https://api.openai.com/v1/chat/completions',{ 
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer YOUR_OPENAI_KEY'
    },
    body: JSON.stringify({
      model:'gpt-4o',
      messages:[{role:'user',content:prompt}],
      max_tokens:256
    })
  });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || 'No response';
}
