

self.addEventListener("message", async (e: MessageEvent) => {
  const { file } = e.data;
  
  try {
    // Escaping strict TS validation due to complex webassembly interop
    const imglyPkg = await import("@imgly/background-removal");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const removeBackground: any = (imglyPkg as any).removeBackground || (imglyPkg as any).default || imglyPkg;
    
    // Explicitly configure zero progress messages for maximum throughput
    const config = {};
    
    // Physical Wasm execution block occurs entirely off the Main Thread
    const blob = await removeBackground(file, config);
    
    self.postMessage({ type: "success", blob });
  } catch (error: unknown) {
    self.postMessage({ type: "error", error: (error as Error).message || "Worker Thread Native Segfault" });
  }
});
