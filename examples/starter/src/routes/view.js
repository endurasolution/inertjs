import { vec } from 'inertjs-vector';

export function render() {
  return vec`
    <div class="flex flex-col items-center justify-center min-h-[70vh] text-center animate-slide-up">
      <div class="inline-flex items-center px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm mb-6 border border-slate-200 dark:border-slate-700 shadow-sm backdrop-blur-sm transition-colors">
        <span class="flex w-2 h-2 rounded-full bg-cyan-500 mr-2 animate-pulse"></span>
        v1.0.0 Now Available
      </div>
      
      <!-- Lottie Animation -->
      <lottie-player 
        src="/public/hero-animation.json" 
        background="transparent" 
        speed="1" 
        style="width: 250px; height: 250px; margin-bottom: -20px;" 
        loop 
        autoplay>
      </lottie-player>
      
      <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-8 mt-4 relative z-10 transition-colors">
        Build with <span class="text-transparent bg-clip-text bg-gradient-to-r from-slate-800 dark:from-slate-100 to-cyan-500">InertJS</span>
      </h1>
      
      <p class="mt-4 text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed mb-12 transition-colors">
        The ultimate zero-build, vector-streaming web framework. Experience the speed of native HTTP/2 and Pulse SPA navigation out of the box.
      </p>
      
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="https://inertjs.org/documentation" target="_blank" class="px-8 py-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-all duration-300 transform hover:-translate-y-1 shadow-lg shadow-slate-900/20 dark:shadow-white/10 flex items-center space-x-2 justify-center">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          <span>Documentation</span>
        </a>
        <a href="https://github.com/endurasolution/inertjs" target="_blank" class="px-8 py-4 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all duration-300 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md flex items-center space-x-2 justify-center">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"/></svg>
          <span>GitHub</span>
        </a>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24 text-left w-full">
        <div class="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all group">
          <div class="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
          </div>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2 transition-colors">Zero-Build Tooling</h3>
          <p class="text-slate-600 dark:text-slate-400 text-sm transition-colors">No bundlers, no waiting. Native ESM support right out of the box for instant startup.</p>
        </div>
        
        <div class="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all group">
          <div class="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>
          </div>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2 transition-colors">Vector Streaming</h3>
          <p class="text-slate-600 dark:text-slate-400 text-sm transition-colors">Lightning-fast template engine that streams directly to the client without buffering.</p>
        </div>
        
        <div class="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all group">
          <div class="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2 transition-colors">Pulse SPA</h3>
          <p class="text-slate-600 dark:text-slate-400 text-sm transition-colors">Zero-reload navigation that feels like magic. Keep your application state intact.</p>
        </div>
        
        <div class="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all group">
          <div class="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
          </div>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2 transition-colors">Native HTTP/2</h3>
          <p class="text-slate-600 dark:text-slate-400 text-sm transition-colors">Multiplexing and server push capabilities baked directly into the core.</p>
        </div>

        <div class="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all group">
          <div class="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 19 22 12 13 5 13 19"/><polygon points="2 19 11 12 2 5 2 19"/></svg>
          </div>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2 transition-colors">Dynamic Streaming</h3>
          <p class="text-slate-600 dark:text-slate-400 text-sm transition-colors">Out-of-order HTML streaming. Simply await promises and let the engine patch the DOM seamlessly.</p>
        </div>

        <div class="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all group">
          <div class="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2-1 4-2 7-2 2.5 0 4.5 1.2 7 2a1 1 0 0 1 1 1v7z"/></svg>
          </div>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2 transition-colors">Secure Proxies</h3>
          <p class="text-slate-600 dark:text-slate-400 text-sm transition-colors">Native server-side data fetching. Bypass CORS and keep your API keys completely hidden from the browser.</p>
        </div>

        <div class="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all group">
          <div class="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          </div>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2 transition-colors">Auto Optimization</h3>
          <p class="text-slate-600 dark:text-slate-400 text-sm transition-colors">Built-in esbuild and sharp. Scripts, HTML, and images are minified and optimized to WebP on the fly.</p>
        </div>

        <div class="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all group">
          <div class="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
          </div>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2 transition-colors">Scraper Protection</h3>
          <p class="text-slate-600 dark:text-slate-400 text-sm transition-colors">Dynamic CSS pool obfuscation. Automatically randomize class names and IDs on every render.</p>
        </div>
      </div>
    </div>
  `;
}
