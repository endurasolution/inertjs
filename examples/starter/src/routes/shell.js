import { vec, raw, img } from 'inertjs-vector';

export function render({ children, data, scope }) {
  const nonce = scope?.nonce || '';
  
  return vec`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title || 'InertJS Premium'}</title>
  
  <!-- Tailwind CDN with strict CSP nonce -->
  <script src="https://cdn.tailwindcss.com" nonce="${nonce}"></script>
  
  <!-- Lottie Animation Web Player -->
  <script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" nonce="${nonce}"></script>
  
  <!-- Custom Tailwind Config and Global Styles -->
  <script nonce="${nonce}">
    /* Dark mode initialization to prevent FOUC */
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    window.toggleTheme = function() {
      if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.theme = 'light';
      } else {
        document.documentElement.classList.add('dark');
        localStorage.theme = 'dark';
      }
    };
    
    document.addEventListener('DOMContentLoaded', function() {
      const btn = document.getElementById('theme-toggle-btn');
      if (btn) btn.addEventListener('click', window.toggleTheme);
    });
  </script>
  
  <script nonce="${nonce}">
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'system-ui', 'sans-serif'],
            mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
          },
          animation: {
            'fade-in': 'fadeIn 0.5s ease-out',
            'slide-up': 'slideUp 0.5s ease-out forwards',
          },
          keyframes: {
            fadeIn: {
              '0%': { opacity: '0' },
              '100%': { opacity: '1' },
            },
            slideUp: {
              '0%': { opacity: '0', transform: 'translateY(20px)' },
              '100%': { opacity: '1', transform: 'translateY(0)' },
            }
          }
        }
      }
    }
  </script>
  <style nonce="${nonce}">
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    body {
      font-family: 'Inter', sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    
    /* Glassmorphism utilities */
    .glass {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }
    
    .dark .glass {
      background: rgba(15, 23, 42, 0.85);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    /* Custom Scrollbar for Debug Panel */
    .debug-scroll::-webkit-scrollbar {
      width: 6px;
    }
    .debug-scroll::-webkit-scrollbar-track {
      background: rgba(15, 23, 42, 0.5);
    }
    .debug-scroll::-webkit-scrollbar-thumb {
      background: rgba(71, 85, 105, 0.8);
      border-radius: 4px;
    }
  </style>

  <!-- Developer Debug Panel Logic -->
  <script nonce="${nonce}">
    (function() {
      /* Setup arrays to hold logs */
      window.__inertLogs = [];
      const MAX_LOGS = 100;
      
      const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error
      };
      
      function formatArgs(args) {
        return Array.from(args).map(arg => {
          if (typeof arg === 'object') {
            try { return JSON.stringify(arg, null, 2); } 
            catch(e) { return String(arg); }
          }
          return String(arg);
        }).join(' ');
      }
      
      function addLog(type, args, isInternal = false) {
        if (!isInternal) originalConsole[type].apply(console, args);
        
        const message = formatArgs(args);
        window.__inertLogs.push({ type, message, time: new Date().toLocaleTimeString() });
        if (window.__inertLogs.length > MAX_LOGS) window.__inertLogs.shift();
        
        updateDebugPanel();
      }
      
      console.log = function() { addLog('log', arguments); };
      console.warn = function() { addLog('warn', arguments); };
      console.error = function() { addLog('error', arguments); };
      
      window.addEventListener('error', function(e) {
        addLog('error', [e.message + ' at ' + e.filename + ':' + e.lineno], true);
      });
      
      window.addEventListener('unhandledrejection', function(e) {
        addLog('error', ['Unhandled Promise Rejection: ', e.reason], true);
      });
      
      function updateDebugPanel() {
        const container = document.getElementById('inert-debug-logs');
        const counter = document.getElementById('inert-debug-counter');
        const dot = document.getElementById('inert-debug-fab-dot');
        const panel = document.getElementById('inert-debug-panel');
        
        if (!container) return;
        
        const errorLogs = window.__inertLogs.filter(l => l.type === 'error');
        const errorCount = errorLogs.length;
        
        if (counter) {
          counter.textContent = errorCount > 0 ? errorCount : '';
          counter.className = errorCount > 0 
            ? 'ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold bg-red-500 text-white'
            : 'hidden';
        }
        
        if (dot && panel) {
          if (errorCount > 0 && panel.classList.contains('translate-y-full')) {
            dot.classList.remove('hidden');
          } else {
            dot.classList.add('hidden');
          }
        }
        
        container.innerHTML = window.__inertLogs.map(log => {
          let colors = 'text-slate-300';
          let icon = '<span class="text-blue-400 mr-2">ℹ</span>';
          
          if (log.type === 'error') {
            colors = 'text-red-400 bg-red-900/20 border-l-2 border-red-500 pl-2';
            icon = '<span class="text-red-500 mr-2">✖</span>';
          } else if (log.type === 'warn') {
            colors = 'text-yellow-300 bg-yellow-900/20 border-l-2 border-yellow-500 pl-2';
            icon = '<span class="text-yellow-500 mr-2">⚠</span>';
          }
          
          return '<div class="py-1 border-b border-slate-700/50 ' + colors + ' font-mono text-xs break-words whitespace-pre-wrap flex items-start">'
            + '<span class="text-slate-500 shrink-0 mr-2">[' + log.time + ']</span>'
            + icon
            + '<span class="flex-1">' + log.message.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>'
            + '</div>';
        }).join('');
        
        /* Auto scroll to bottom */
        container.scrollTop = container.scrollHeight;
      }
      
      window.toggleInertDebug = function() {
        const panel = document.getElementById('inert-debug-panel');
        if (panel.classList.contains('translate-y-full')) {
          panel.classList.remove('translate-y-full');
          panel.classList.add('translate-y-0');
          document.getElementById('inert-debug-toggle-icon').style.transform = 'rotate(180deg)';
        } else {
          panel.classList.add('translate-y-full');
          panel.classList.remove('translate-y-0');
          document.getElementById('inert-debug-toggle-icon').style.transform = 'rotate(0deg)';
        }
      };
      
      window.clearInertDebug = function() {
        window.__inertLogs = [];
        updateDebugPanel();
      };
      
      /* Initialize after DOM load */
      document.addEventListener('DOMContentLoaded', function() {
        updateDebugPanel();
        
        const header = document.getElementById('inert-debug-header');
        if (header) header.addEventListener('click', window.toggleInertDebug);
        
        const fab = document.getElementById('inert-debug-fab');
        if (fab) fab.addEventListener('click', window.toggleInertDebug);
        
        const clearBtn = document.getElementById('inert-debug-clear');
        if (clearBtn) clearBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          window.clearInertDebug();
        });
      });
    })();
  </script>

  <!-- Live Reloading System -->
  <script nonce="${nonce}">
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      const sse = new EventSource('/_inert/dev/stream');
      sse.onerror = () => {
        sse.close();
        console.warn('[InertJS] Connection lost, waiting for dev server restart...');
        let isReconnecting = false;
        setInterval(() => {
          if (isReconnecting) return;
          isReconnecting = true;
          fetch('/').then(() => location.reload()).catch(() => {
            isReconnecting = false;
          });
        }, 750);
      };
    }
  </script>

  <!-- Pulse runtime for zero-reload navigation -->
  <script type="module" src="/_inert/pulse/runtime.js" nonce="${nonce}"></script>
</head>
<body class="min-h-screen flex flex-col antialiased selection:bg-cyan-500 selection:text-white pb-12 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 transition-colors duration-300">
  
  <!-- Premium Glassmorphism Header -->
  <header class="glass sticky top-0 z-40 w-full transition-colors duration-300">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-28">
        
        <!-- Logo (Switching based on dark mode) -->
        <a href="/" class="flex items-center text-2xl font-black tracking-tight" aria-label="InertJS Home">
          ${img({ src: '/public/logo.png', alt: 'InertJS Logo', class: 'h-16 w-auto block dark:hidden transition-opacity', width: 200 })}
          ${img({ src: '/public/logolight.png', alt: 'InertJS Logo Light', class: 'h-16 w-auto hidden dark:block transition-opacity', width: 200 })}
        </a>
        
        <!-- Navigation -->
        <nav class="hidden md:flex space-x-1">
          <a href="/" class="px-3 py-2 rounded-md text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all duration-200">Home</a>
        </nav>
        
        <!-- CTA & Theme Toggle -->
        <div class="flex items-center space-x-4">
          <button id="theme-toggle-btn" class="p-2 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500" aria-label="Toggle Dark Mode">
            <!-- Sun Icon (shows in dark mode) -->
            <svg class="w-5 h-5 hidden dark:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <!-- Moon Icon (shows in light mode) -->
            <svg class="w-5 h-5 block dark:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>
        </div>
        
      </div>
    </div>
  </header>
  
  <!-- Main Content Area -->
  <main id="inert-view" class="flex-grow flex flex-col w-full animate-fade-in relative overflow-hidden">
    <!-- Subtle Background Glow Effects -->
    <div class="absolute top-0 left-1/4 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl -z-10 transform -translate-y-1/2"></div>
    <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-slate-400/10 dark:bg-slate-500/10 rounded-full blur-3xl -z-10 transform translate-y-1/2"></div>
    
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      ${children}
    </div>
  </main>
  
  <footer class="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-8 mb-8 mt-12 transition-colors duration-300">
    <div class="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500 dark:text-slate-400">
      <p>&copy; 2026 InertJS Framework. Built for speed and elegance.</p>
    </div>
  </footer>

  <!-- Developer Debug Panel UI -->
  <div class="fixed bottom-0 left-0 w-full z-50 flex flex-col items-end pointer-events-none">
    
    <!-- Panel Content -->
    <div id="inert-debug-panel" class="w-full md:w-[600px] bg-slate-900/95 backdrop-blur-md border-t border-l border-slate-700 rounded-tl-xl shadow-2xl transform translate-y-full transition-transform duration-300 pointer-events-auto flex flex-col h-72 mr-0 md:mr-4">
      
      <!-- Panel Header -->
      <div id="inert-debug-header" class="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800/80 rounded-tl-xl cursor-pointer">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-indigo-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <span class="font-semibold text-sm text-white">Developer Inspector</span>
          <span id="inert-debug-counter" class="hidden"></span>
        </div>
        
        <div class="flex items-center space-x-3">
          <!-- Hard Reload -->
          <button title="Hard Reload (Clear Cache)" onclick="event.stopPropagation(); window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now()" class="text-xs text-slate-400 hover:text-cyan-400 flex items-center transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </button>
          
          <!-- Soft Reload -->
          <button title="Soft Reload" onclick="event.stopPropagation(); location.reload()" class="text-xs text-slate-400 hover:text-cyan-400 flex items-center transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>

          <button id="inert-debug-clear" class="text-xs text-slate-400 hover:text-cyan-400 flex items-center transition-colors">
            <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Clear
          </button>
          <svg id="inert-debug-toggle-icon" class="w-5 h-5 text-slate-400 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
        </div>
      </div>
      
      <!-- Panel Logs Area -->
      <div id="inert-debug-logs" class="flex-1 p-2 overflow-y-auto debug-scroll bg-black/40">
        <!-- Logs injected here -->
      </div>
    </div>
    
    <!-- Floating Action Button (when closed) -->
    <div class="fixed bottom-4 right-4 pointer-events-auto">
      <button id="inert-debug-fab" class="w-12 h-12 rounded-full bg-slate-800 border border-slate-600 shadow-lg flex items-center justify-center text-white hover:bg-slate-700 hover:border-indigo-500 transition-all duration-300 hover:scale-110 relative group">
        <svg class="w-6 h-6 text-indigo-400 group-hover:text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <!-- Notification Dot -->
        <span class="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-800 animate-pulse hidden" id="inert-debug-fab-dot"></span>
      </button>
    </div>

  </div>
  
</body>
</html>`;
}
