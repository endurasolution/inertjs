<div align="center">
  <img src="https://github.com/user-attachments/assets/2f6f4af9-cce8-40a6-bc46-e1bd19175d67" alt="InertJS Logo" width="300" />
  <h1>InertJS Framework</h1>
  <p><strong>The Lightning Fast, Zero-Build-Step Web Framework for Node.js</strong></p>

  <p>
    <a href="https://www.npmjs.com/package/create-inert"><img src="https://img.shields.io/npm/v/create-inert?style=flat-square&color=cyan" alt="NPM Version"></a>
    <a href="https://github.com/endurasolution/inertjs/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/create-inert?style=flat-square&color=blue" alt="License"></a>
    <a href="https://inertjs.org"><img src="https://img.shields.io/badge/docs-inertjs.org-cyan?style=flat-square" alt="Documentation"></a>
  </p>
</div>

---

## 🚀 Welcome to InertJS

InertJS is an ultra-fast, modern JavaScript web framework that eliminates the complexity of build pipelines like Webpack and Vite. It runs natively on Node.js using ES Modules, allowing you to build dynamic, high-performance web applications instantly.

With built-in out-of-order HTML streaming, an encrypted zero-trust Vault, and a blazing-fast file-system router, InertJS gives you the power to ship faster without sacrificing developer experience.

## ✨ Core Features

- ⚡️ **Zero Build Step:** Write native ES Modules and HTML. No bundling, transpilation, or waiting. Just save and refresh.
- 🌊 **Vector Engine:** The first natively streaming tagged-template HTML engine. Slow database queries won't block the UI—skeletons are sent immediately, and data streams into the DOM asynchronously.
- 🛡️ **Vault Security:** A proprietary zero-trust secrets manager replacing insecure `.env` files. Keys are encrypted at rest and only decrypted in-memory.
- 🛣️ **Radix Router:** Ultra-fast, intuitive file-based routing.
- ⚡️ **Pulse SPA:** Get Single-Page Application (SPA) navigation out of the box with a tiny 1KB runtime that seamlessly intercepts links and patches the DOM.
- 🔒 **Shield:** Built-in CSRF protection, CSP (Content Security Policy) nonce generation, rate-limiting, and payload obfuscation.

## 📦 Ecosystem

InertJS is a modular framework. You can use the entire monolith or pick just the packages you need:

| Package | Description |
|---|---|
| `create-inert` | The official scaffolding tool to start new projects instantly. |
| `inertjs-cli` | Development server, hot-reloading, and build CLI. |
| `inertjs-core` | The high-performance Node.js server and pipeline. |
| `inertjs-vector` | Tagged-template async HTML streaming engine. |
| `inertjs-router` | The blazing-fast Radix router and manifest compiler. |
| `inertjs-vault` | Zero-trust secrets and configuration manager. |
| `inertjs-pulse` | 1KB client-side SPA morphing engine. |
| `inertjs-shield` | Built-in application security and middleware. |
| `inertjs-lens` | Real-time browser developer tools and logging. |

## 🛠️ Quick Start

Getting started is as simple as running one command in your terminal:

```bash
npx create-inert@latest my-app
cd my-app
npm install
npm run dev
```

That's it. No build configuration. No waiting. Open `http://localhost:3000` to see your new application.

## 📖 Documentation

Ready to dive deeper? Check out our official documentation at [inertjs.dev/documentation](https://inertjs.org/documentation).

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for more details on how to get started. If you find a bug or have a feature request, please [open an issue](https://github.com/endurasolution/inertjs/issues).

## 📄 License

InertJS is open-source software licensed under the [MIT License](LICENSE).
