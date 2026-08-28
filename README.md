# 知辩 AI

一个纯前端的 AI 观点评估工具。它既可以进行双向辩论，也可以帮助审视创业项目、产品 idea 和商业计划：两种视角会轮流寻找成立依据、关键风险和仍需验证的假设。

## 特点

- 只有 React 前端，不包含登录、账号、数据库或应用后端。
- 浏览器直接调用用户配置的 OpenAI 兼容接口。
- 支持 Chat Completions、Responses 和自动识别模式。
- API Key 只保存在当前标签页的 `sessionStorage` 中，关闭标签后自动清除。
- 辩论上下文只保存在页面内存中，刷新页面后清除。
- 适合评估创业项目、产品想法、商业模式和公共议题；结果用于辅助思考，不替代真实调研和专业判断。

## 本地运行

```bash
cd frontend
npm install
npm run dev
```

浏览器访问 Vite 输出的本地地址，点击“模型配置”，填写 API 地址、模型名称和 API Key 后即可开始观点评估或辩论。

> 模型服务必须允许浏览器跨域请求（CORS）。如果服务商不允许浏览器直连，需要改用支持 CORS 的兼容接口；本项目不再提供服务端代理。

## 构建静态文件

```bash
cd frontend
npm run build
```

构建结果位于 `frontend/dist/`，可以部署到任意静态文件服务或子路径。资源使用相对路径，不依赖固定站点前缀。

## Docker 部署

```bash
docker compose up -d --build
```

容器仅使用 Nginx 托管静态文件，默认可通过 `http://127.0.0.1:4186` 访问，不运行任何 Python 或 API 服务。
