const state = { user: null, posts: [], category: "全部", query: "", stats: { posts: 0, users: 0 }, admin: null };
const categories = ["全部", "公告", "书影音", "创作", "日常", "求助"];
const $ = (selector) => document.querySelector(selector);
const app = () => $("#app");

const toast = (message) => {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2400);
};

const api = async (url, options = {}) => {
  const res = await fetch(url, { headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "请求失败");
  return data;
};

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const formatDate = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return new Date(date).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
};

function navigate(path) {
  history.pushState({}, "", path);
  renderRoute();
}

function setActiveNav() {
  const path = location.pathname;
  document.querySelectorAll(".topnav a").forEach((link) => {
    const href = link.getAttribute("href");
    link.classList.toggle("active", href === path || (href === "/boards" && path.startsWith("/post/")));
  });
  document.querySelector("[data-admin-link]")?.classList.toggle("hidden", !state.user?.isAdmin);
}

function renderAccount() {
  $("#account-actions").innerHTML = state.user
    ? `<a class="user-chip" href="/account" data-link><span class="avatar">${escapeHtml(state.user.displayName.slice(0, 1))}</span><span>${escapeHtml(state.user.displayName)}</span></a><button class="button button-outline" data-action="logout">退出</button>`
    : `<button class="button button-outline" data-action="open-login">登录</button><button class="button button-primary" data-action="open-register">加入社区</button>`;
  setActiveNav();
}

function showModal(content) {
  $("#modal-content").innerHTML = content;
  $("#modal-backdrop").classList.remove("hidden");
}

function closeModal() {
  $("#modal-backdrop").classList.add("hidden");
}

function authForm(mode = "login") {
  const register = mode === "register";
  showModal(`<p class="eyebrow">${register ? "JOIN XYURI" : "WELCOME BACK"}</p><h2>${register ? "加入新月百合会" : "登录新月百合会"}</h2><p class="modal-subtitle">${register ? "创建账号后可以发帖、评论、收藏，把你的同好坐标留在这里。" : "回来继续你的收藏与讨论。"}</p>
    <form id="auth-form">
      <div class="form-field"><label>用户名</label><input name="username" autocomplete="username" placeholder="3-24 位小写字母、数字或下划线" required /></div>
      ${register ? '<div class="form-field"><label>昵称</label><input name="displayName" placeholder="比如 xyuri、月见、南风" required /></div>' : ""}
      <div class="form-field"><label>密码</label><input type="password" name="password" autocomplete="${register ? "new-password" : "current-password"}" placeholder="至少 8 位" required /></div>
      <button class="button button-primary form-submit">${register ? "创建账号" : "登录"}</button>
    </form>
    <p class="form-switch">${register ? "已经有账号？" : "还没有账号？"} <button type="button" data-action="${register ? "open-login" : "open-register"}">${register ? "去登录" : "立即加入"}</button></p>`);
  $("#auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const data = await api(register ? "/api/register" : "/api/login", { method: "POST", body: JSON.stringify(Object.fromEntries(form)) });
      state.user = data.user;
      closeModal();
      renderAccount();
      await loadStats();
      await loadPosts();
      toast(register ? "欢迎加入新月百合会" : "登录成功");
      renderRoute();
    } catch (error) {
      toast(error.message);
    }
  });
}

async function loadPosts() {
  const data = await api(`/api/posts?category=${encodeURIComponent(state.category)}&q=${encodeURIComponent(state.query)}`);
  state.posts = data.posts;
}

async function loadStats() {
  state.stats = await api("/api/stats");
}

function postCard(post) {
  return `<article class="post-card">
    <div class="post-main">
      <div class="post-meta"><span class="post-category">${escapeHtml(post.category)}</span><span>${escapeHtml(post.authorName)}</span><span>${formatDate(post.createdAt)}</span></div>
      <a class="post-title" href="/post/${post.id}">${escapeHtml(post.title)}</a>
      <p class="post-excerpt">${escapeHtml(post.body)}</p>
    </div>
    <div class="post-stats">
      <span>浏览 ${post.views}</span><span>评论 ${post.commentsCount}</span>
      <button class="favorite-button ${post.isFavorited ? "active" : ""}" data-favorite="${post.id}" title="收藏">♡</button>
    </div>
  </article>`;
}

function filteredPosts(collectionsOnly = false) {
  const query = state.query.toLowerCase();
  return state.posts.filter((post) => (!collectionsOnly || post.isFavorited) && (!query || `${post.title} ${post.body} ${post.authorName}`.toLowerCase().includes(query)) && (state.category === "全部" || post.category === state.category));
}

function boardMarkup({ collectionsOnly = false } = {}) {
  const posts = filteredPosts(collectionsOnly);
  return `<section class="content-grid">
    <div class="feed-column">
      <div class="section-heading">
        <div><p class="eyebrow">CRESCENT BOARD</p><h2>${collectionsOnly ? "我的收藏" : "版块讨论"}</h2></div>
        <div class="feed-tools"><button class="icon-button" data-action="refresh" title="刷新帖子">↻</button><a class="button button-quiet" href="/compose">发新帖</a></div>
      </div>
      <div class="category-tabs">${categories.map((category) => `<button class="${state.category === category ? "active" : ""}" data-category="${category}">${category}</button>`).join("")}</div>
      <div class="search-row"><label class="search-box"><span>⌕</span><input id="search-input" value="${escapeHtml(state.query)}" placeholder="搜索标题、正文或作者" /></label><span class="muted">${posts.length} 篇</span></div>
      <div class="post-list">${posts.length ? posts.map(postCard).join("") : `<div class="empty-state">${collectionsOnly ? "这里会收起你收藏过的帖子。" : "还没有找到相关讨论。换个关键词，或者写下第一帖。"}</div>`}</div>
    </div>
    <aside class="side-column">${sidePanels()}</aside>
  </section>`;
}

function sidePanels() {
  return `<section class="side-panel welcome-panel">
    <div class="side-panel-head"><span class="tiny-label">XYURI NOTE</span><span class="spark">☾</span></div>
    <h3>新月升起时，<br />把故事留给同好。</h3>
    <p>这里偏爱清晰的标题、真诚的表达、友善的分歧。百合、阅读、创作、日常，都可以慢慢说。</p>
  </section>
  <section class="side-panel">
    <div class="side-panel-head"><h3>快速入口</h3></div>
    <div class="topic-list">
      <a href="/rules" data-link><span class="topic-number">01</span><span>社区规则</span><b>必读</b></a>
      <a href="/help" data-link><span class="topic-number">02</span><span>发帖帮助</span><b>指南</b></a>
      <a href="/about" data-link><span class="topic-number">03</span><span>关于新月</span><b>xyuri</b></a>
    </div>
  </section>
  <section class="side-panel mini-stats"><div><b>${state.stats.posts}</b><span>篇讨论</span></div><div><b>${state.stats.users}</b><span>位成员</span></div><div><b>xy</b><span>新月坐标</span></div></section>`;
}

function renderHome() {
  const latest = state.posts.slice(0, 5);
  app().innerHTML = `<section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">XYURI CRESCENT FORUM</p>
      <h1>新月之下，<br /><em>认真分享百合与喜欢。</em></h1>
      <p class="hero-text">新月百合会是给 xyuri 与同好准备的轻论坛：读书、追番、写作、安利、求助和日常碎片，都能被整理成可继续讨论的帖子。</p>
      <div class="hero-actions"><a class="button button-primary" href="/compose">发新帖</a><a class="text-link" href="/boards" data-link>浏览版块 <span>→</span></a></div>
    </div>
    <div class="hero-art" aria-hidden="true"><div class="crescent"></div><div class="lily lily-one">百合</div><div class="lily lily-two">xyuri</div><div class="moon-card">新月百合会</div></div>
  </section>
  <section class="forum-strip">
    <a href="/boards" data-link><b>综合讨论</b><span>所有新帖与热门回复</span></a>
    <a href="/rules" data-link><b>社区规则</b><span>发帖前先看这里</span></a>
    <a href="/compose"><b>新帖发布</b><span>独立页面，更适合长文</span></a>
  </section>
  <section class="content-grid"><div class="feed-column"><div class="section-heading"><div><p class="eyebrow">LATEST POSTS</p><h2>最新讨论</h2></div><a class="button button-quiet" href="/boards" data-link>查看全部</a></div><div class="post-list">${latest.map(postCard).join("")}</div></div><aside class="side-column">${sidePanels()}</aside></section>`;
}

function renderCompose() {
  if (!state.user) {
    app().innerHTML = pageShell("登录后发帖", "先登录新月百合会，再写下你的第一篇讨论。", `<button class="button button-primary" data-action="open-login">登录</button><button class="button button-outline" data-action="open-register">注册</button>`);
    return;
  }
  app().innerHTML = `<section class="page-head"><p class="eyebrow">NEW TOPIC</p><h1>发布新讨论</h1><p>标题要清楚，正文可以慢慢写。这里适合安利、记录、求助、创作接龙，也适合认真聊一部作品。</p></section>
  <section class="editor-layout">
    <form id="compose-form" class="editor-panel">
      <div class="form-field"><label>标题</label><input name="title" maxlength="100" placeholder="例如：想聊聊这部作品里让我心动的一幕" required /></div>
      <div class="form-field"><label>分类</label><select name="category">${categories.filter((item) => item !== "全部").map((item) => `<option>${item}</option>`).join("")}</select></div>
      <div class="form-field"><label>正文</label><textarea name="body" maxlength="10000" placeholder="写下你的内容。可以分段，也可以留下问题邀请大家接话。" required></textarea></div>
      <button class="button button-primary form-submit">发布讨论</button>
    </form>
    <aside class="editor-tips"><h3>发帖小提示</h3><p>用具体标题，比“求推荐”更容易得到回应。</p><p>涉及剧情请在标题或正文开头标注剧透。</p><p>尊重角色、创作者和其他成员的不同理解。</p></aside>
  </section>`;
  $("#compose-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const { post } = await api("/api/posts", { method: "POST", body: JSON.stringify(Object.fromEntries(form)) });
      await loadStats();
      await loadPosts();
      toast("帖子发布成功");
      window.location.href = `/post/${post.id}`;
    } catch (error) {
      toast(error.message);
    }
  });
}

async function renderPost(id) {
  try {
    const { post } = await api(`/api/posts/${id}`);
    app().innerHTML = `<section class="detail-page">
      <a class="text-link dark" href="/boards" data-link>← 返回版块</a>
      <p class="eyebrow">${escapeHtml(post.category)}</p>
      <h1>${escapeHtml(post.title)}</h1>
      <div class="detail-meta"><span>${escapeHtml(post.authorName)}</span><span>${formatDate(post.createdAt)}</span><span>${post.views} 次阅读</span></div>
      <div class="detail-body">${escapeHtml(post.body)}</div>
      <div class="detail-actions"><button class="button button-outline" data-favorite="${post.id}">${post.isFavorited ? "♥ 已收藏" : "♡ 收藏"} <small>(${post.favoritesCount})</small></button><button class="button button-outline" data-action="share-post">分享</button></div>
      <h2 class="comments-heading">评论 ${post.comments.length}</h2>
      <div>${post.comments.map((comment) => `<div class="comment"><div class="comment-head"><b>${escapeHtml(comment.authorName)}</b><span class="comment-date">${formatDate(comment.createdAt)}</span></div><p>${escapeHtml(comment.body)}</p></div>`).join("") || '<p class="modal-subtitle">还没有评论，来留下第一句话吧。</p>'}</div>
      ${state.user ? `<form class="comment-form" id="comment-form"><div class="form-field"><label>写下评论</label><textarea name="body" maxlength="2000" placeholder="友善地说点什么..." required></textarea></div><button class="button button-primary">发表评论</button></form>` : `<p class="form-switch">登录后可以参与评论。</p>`}
    </section>`;
    const form = $("#comment-form");
    if (form) form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await api(`/api/posts/${id}/comments`, { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) });
        await loadPosts();
        await renderPost(id);
        toast("评论已发布");
      } catch (error) {
        toast(error.message);
      }
    });
  } catch (error) {
    app().innerHTML = pageShell("帖子不存在", error.message, `<a class="button button-primary" href="/boards" data-link>返回版块</a>`);
  }
}

function pageShell(title, text, actions = "") {
  return `<section class="page-head"><p class="eyebrow">CRESCENT PAGE</p><h1>${title}</h1><p>${text}</p><div class="hero-actions">${actions}</div></section>`;
}

function renderInfo(kind) {
  const pages = {
    rules: ["社区规则", "新月百合会欢迎百合相关内容、创作交流、作品安利和日常讨论。请保持友善、尊重差异，涉及剧透、争议话题或转载内容时主动说明。禁止人身攻击、骚扰、恶意引战和违法内容。"],
    help: ["使用帮助", "注册后可以发帖、评论和收藏。点击顶部“版块”浏览全部内容，点击“发新帖”进入独立发布页面。忘记密码、邮箱验证和图片上传还在后续版本里。"],
    about: ["关于新月百合会", "这是为 xyuri 和百合同好搭建的小型论坛。它不像大型社区那样喧闹，更像一张慢慢展开的书桌：可以聊作品，可以写故事，也可以安静收藏你喜欢的讨论。"]
  };
  const [title, text] = pages[kind];
  app().innerHTML = `${pageShell(title, text, `<a class="button button-primary" href="/compose">写一篇帖子</a><a class="button button-outline" href="/boards" data-link>回到版块</a>`)}
  <section class="plain-grid">
    <article><h3>百合主题</h3><p>作品讨论、角色关系、创作灵感和安利清单都可以归档在这里。</p></article>
    <article><h3>xyuri 坐标</h3><p>这是站点的精神标记：轻一点、认真一点，也给后来的人留下路径。</p></article>
    <article><h3>新月氛围</h3><p>克制但不冷淡，清晰但不僵硬。希望每一次发言都有可继续的余地。</p></article>
  </section>`;
}

async function renderAdmin() {
  if (!state.user) {
    app().innerHTML = pageShell("管理员后台", "请先登录管理员账号。第一个注册的账号会自动成为管理员。", `<button class="button button-primary" data-action="open-login">登录</button>`);
    return;
  }
  if (!state.user.isAdmin) {
    app().innerHTML = pageShell("没有权限", "后台只对管理员开放。", `<a class="button button-outline" href="/" data-link>返回首页</a>`);
    return;
  }
  try {
    state.admin = await api("/api/admin/summary");
    app().innerHTML = `<section class="page-head"><p class="eyebrow">ADMIN</p><h1>新月后台</h1><p>先做轻量管理：看数据、检查帖子、删除明显不合适的内容。</p></section>
    <section class="admin-grid">
      <div class="metric"><b>${state.admin.stats.posts}</b><span>帖子</span></div>
      <div class="metric"><b>${state.admin.stats.users}</b><span>用户</span></div>
      <div class="metric"><b>${state.admin.stats.comments}</b><span>评论</span></div>
      <div class="metric"><b>${state.admin.stats.favorites}</b><span>收藏</span></div>
    </section>
    <section class="admin-list"><h2>帖子管理</h2>${state.admin.posts.map((post) => `<article><div><b>${escapeHtml(post.title)}</b><span>${escapeHtml(post.authorName)} · ${escapeHtml(post.category)} · ${post.commentsCount} 评论</span></div><button class="button button-outline" data-delete-post="${post.id}">删除</button></article>`).join("")}</section>`;
  } catch (error) {
    toast(error.message);
  }
}

function renderAccountPage() {
  if (!state.user) {
    app().innerHTML = pageShell("我的账号", "登录后可以查看账号信息、收藏入口和管理权限。", `<button class="button button-primary" data-action="open-login">登录</button><button class="button button-outline" data-action="open-register">注册</button>`);
    return;
  }
  const joined = new Date(state.user.joinedAt).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  const myPosts = state.posts.filter((post) => post.authorName === state.user.displayName);
  const favorites = state.posts.filter((post) => post.isFavorited);
  app().innerHTML = `<section class="page-head account-head">
    <p class="eyebrow">MY ACCOUNT</p>
    <h1>${escapeHtml(state.user.displayName)}</h1>
    <p>这里是你在新月百合会的账号页，可以查看身份、注册时间、自己的发帖和收藏入口。</p>
  </section>
  <section class="account-grid">
    <article class="account-card profile-card"><span class="avatar large">${escapeHtml(state.user.displayName.slice(0, 1))}</span><div><h3>${escapeHtml(state.user.displayName)}</h3><p>@${escapeHtml(state.user.username)}</p></div></article>
    <article class="account-card"><b>${state.user.isAdmin ? "管理员" : "普通成员"}</b><span>账号身份</span></article>
    <article class="account-card"><b>${joined}</b><span>加入时间</span></article>
    <article class="account-card"><b>${favorites.length}</b><span>收藏帖子</span></article>
  </section>
  <section class="content-grid account-sections">
    <div class="feed-column"><div class="section-heading"><div><p class="eyebrow">MY POSTS</p><h2>我的发帖</h2></div><a class="button button-quiet" href="/compose">发新帖</a></div><div class="post-list">${myPosts.length ? myPosts.map(postCard).join("") : '<div class="empty-state">你还没有发布帖子。写一篇推荐、记录或求助都可以。</div>'}</div></div>
    <aside class="side-column"><section class="side-panel welcome-panel"><h3>账号快捷入口</h3><p>从这里回到收藏、版块或后台。后续可以继续加入头像、签名、改密码和个人资料。</p></section><section class="side-panel"><div class="topic-list"><a href="/collections" data-link><span class="topic-number">01</span><span>我的收藏</span><b>${favorites.length}</b></a><a href="/boards" data-link><span class="topic-number">02</span><span>浏览版块</span><b>go</b></a>${state.user.isAdmin ? '<a href="/admin" data-link><span class="topic-number">03</span><span>管理后台</span><b>admin</b></a>' : ""}</div></section></aside>
  </section>`;
}

async function renderRoute() {
  setActiveNav();
  const path = location.pathname;
  if (!state.posts.length) await loadPosts();
  if (path === "/") renderHome();
  else if (path === "/boards") app().innerHTML = boardMarkup();
  else if (path === "/collections") app().innerHTML = boardMarkup({ collectionsOnly: true });
  else if (path === "/compose") renderCompose();
  else if (path.startsWith("/post/")) await renderPost(path.split("/")[2]);
  else if (path === "/account") renderAccountPage();
  else if (["/rules", "/help", "/about"].includes(path)) renderInfo(path.slice(1));
  else if (path === "/admin") await renderAdmin();
  else app().innerHTML = pageShell("页面不存在", "这个链接暂时没有内容。", `<a class="button button-primary" href="/" data-link>回到首页</a>`);
  app().focus({ preventScroll: true });
  setActiveNav();
  const search = $("#search-input");
  if (search) search.addEventListener("input", (event) => { state.query = event.target.value; renderRoute(); });
}

document.addEventListener("click", async (event) => {
  const link = event.target.closest("[data-link]");
  if (link) {
    event.preventDefault();
    navigate(new URL(link.href).pathname);
    return;
  }
  const action = event.target.closest("[data-action]")?.dataset.action;
  const category = event.target.closest("[data-category]")?.dataset.category;
  const favorite = event.target.closest("[data-favorite]")?.dataset.favorite;
  const deletePost = event.target.closest("[data-delete-post]")?.dataset.deletePost;
  if (category) { state.category = category; await loadPosts(); renderRoute(); }
  if (favorite) {
    if (!state.user) return authForm("login");
    try { await api(`/api/posts/${favorite}/favorite`, { method: "POST" }); await loadPosts(); await renderRoute(); toast("收藏状态已更新"); } catch (error) { toast(error.message); }
  }
  if (deletePost) {
    if (!confirm("确定删除这篇帖子？")) return;
    try { await api(`/api/admin/posts/${deletePost}`, { method: "DELETE" }); await loadStats(); await loadPosts(); await renderAdmin(); toast("帖子已删除"); } catch (error) { toast(error.message); }
  }
  if (action === "open-login") authForm("login");
  if (action === "open-register") authForm("register");
  if (action === "close-modal") closeModal();
  if (action === "logout") { await api("/api/logout", { method: "POST" }); state.user = null; renderAccount(); toast("已退出登录"); renderRoute(); }
  if (action === "refresh") { await loadPosts(); renderRoute(); toast("内容已刷新"); }
  if (action === "share-post") { await navigator.clipboard?.writeText(location.href); toast("链接已复制"); }
});

window.addEventListener("popstate", renderRoute);

(async function init() {
  const [me] = await Promise.all([api("/api/me"), loadStats()]);
  state.user = me.user;
  renderAccount();
  await loadPosts();
  await renderRoute();
})().catch((error) => toast(error.message));
