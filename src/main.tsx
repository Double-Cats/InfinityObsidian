import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

// GitHub Pages 是静态托管、没有服务端路由回退，所以用 HashRouter：
// 所有路由都在 # 之后（如 #/post/xxx），任何路径直接访问都不会 404。
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
