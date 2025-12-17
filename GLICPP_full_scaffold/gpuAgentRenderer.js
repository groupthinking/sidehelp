export async function initGPUCanvas(canvas){
  if(!navigator.gpu){
    console.warn('WebGPU not supported');
    return;
  }
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const ctx = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({device, format});
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments:[{
      view: ctx.getCurrentTexture().createView(),
      loadOp:'clear',
      storeOp:'store',
      clearValue:{r:0.05,g:0.05,b:0.1,a:1}
    }]
  });
  pass.end();
  device.queue.submit([encoder.finish()]);
}
