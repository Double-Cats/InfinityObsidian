import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router";
import SiteLayout from "./components/SiteLayout";
import Home from "./pages/Home";
import Tags from "./pages/Tags";
import Archive from "./pages/Archive";
import NotFound from "./pages/NotFound";

const Post = lazy(() => import("./pages/Post"));

export default function App() {
  return (
    <Suspense fallback={<div className="loading-line">加载中…</div>}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/post/*" element={<Post />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="/tags/:tag" element={<Tags />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
