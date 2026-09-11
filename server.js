const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const COOKIE = "yaoguang_session";

function now() {
  return new Date().toISOString();
}

function initialDb() {
  const welcomeId = crypto.randomUUID();
  return {
    users: [],
    sessions: {},
    posts: [
      {
        id: welcomeId,
        title: "欢迎来到新月百合会：在这里分享你的故事与灵感",
        body: "这是一个给阅读、创作和交流留出的温柔角落。你可以发布书影音感想、原创故事、生活记录，也可以在评论区认识志趣相投的人。\n\n请一起维护友善、尊重、清晰的讨论氛围。",
        category: "公告",
        authorId: "system",
        authorName: "新月百合会编辑部",
        createdAt: now(),
        views: 128,
        favorites: [],
        comments: [
          {
            id: crypto.randomUUID(),
            body: "终于找到一个适合慢慢交流的地方了，期待认识大家。",
            authorId: "system",
            authorName: "小满",
            createdAt: now()
          }
        ]
      },
      {
        id: crypto.randomUUID(),
        title: "最近读完的一本书，想和大家聊聊结尾",
        body: "没有剧透标题。读到最后一章的时候我停了很久，感觉作者把人物留在了一个很有余韵的位置。欢迎大家分享最近让你印象深刻的作品。",
        category: "书影音",
        authorId: "system",
        authorName: "南风",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        views: 82,
        favorites: [],
        comments: []
      },
      {
        id: crypto.randomUUID(),
        title: "周末创作接龙：给下一位留一句话",
        body: "从“雨停之后，街角的灯还亮着”开始，下一位可以接一句。轻松玩，不限题材。",
        category: "创作",
        authorId: "system",
        authorName: "纸飞机",
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        views: 54,
        favorites: [],
        comments: []
      },
      ...recommendationPosts()
    ]
  };
}

function recommendationPosts() {
  const base = Date.now();
  return [
    {
      id: crypto.randomUUID(),
      title: "百合漫画入门推荐：从细腻关系开始读",
      body: "如果刚开始接触百合漫画，可以先从关系描写比较细腻、节奏不太急的作品入手。\n\n推荐方向：校园成长、日常相处、双向试探、创作型短篇集。阅读时可以关注人物为什么靠近彼此，而不是只看告白节点。\n\n欢迎大家在评论里补充自己心中的入门作，也请尽量支持正版渠道。",
      category: "书影音",
      authorId: "system",
      authorName: "xyuri 推荐组",
      createdAt: new Date(base - 3 * 86400000).toISOString(),
      views: 96,
      favorites: [],
      comments: []
    },
    {
      id: crypto.randomUUID(),
      title: "推荐讨论：温柔日常系百合漫画为什么耐看",
      body: "日常系百合的魅力常常不在强剧情，而在细小变化：一次绕路回家、一句没说出口的话、两个人逐渐形成的默契。\n\n这类作品很适合在新月百合会慢慢聊。你可以分享一个喜欢的场景：它不用惊天动地，只要让你觉得“这两个人确实在靠近”。",
      category: "书影音",
      authorId: "system",
      authorName: "新月百合会编辑部",
      createdAt: new Date(base - 4 * 86400000).toISOString(),
      views: 74,
      favorites: [],
      comments: []
    },
    {
      id: crypto.randomUUID(),
      title: "GL 创作参考：漫画里的分镜、留白和眼神",
      body: "很多优秀 GL 漫画会用留白表现情绪，比如停在门口的脚步、没有立刻回应的对话、视线偏开的那一格。\n\n如果你也在写百合故事，可以试着把这种方法转成文字：少解释一点，多让动作和场景替人物说话。欢迎把练习片段发到创作区。",
      category: "创作",
      authorId: "system",
      authorName: "纸飞机",
      createdAt: new Date(base - 5 * 86400000).toISOString(),
      views: 61,
      favorites: [],
      comments: []
    },
    {
      id: crypto.randomUUID(),
      title: "求推荐帖模板：想找一部怎样的百合漫画？",
      body: "发求推荐帖时可以带上这些信息，大家会更容易帮你：\n\n1. 想看校园、职场、奇幻、悬疑还是日常。\n2. 能不能接受虐、误会、开放结局。\n3. 偏好长篇还是短篇。\n4. 最近喜欢过哪部作品。\n\n也欢迎直接复制这个模板发帖。",
      category: "求助",
      authorId: "system",
      authorName: "小满",
      createdAt: new Date(base - 6 * 86400000).toISOString(),
      views: 52,
      favorites: [],
      comments: []
    }
  ];
}

function readDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(initialDb(), null, 2));
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

let db = readDb();

function normalizeDb() {
  db.users ||= [];
  db.sessions ||= {};
  db.posts ||= [];
  db.users.forEach((user, index) => {
    if (!user.role) user.role = index === 0 ? "admin" : "member";
  });
  db.posts.forEach((post) => {
    post.favorites ||= [];
    post.comments ||= [];
    post.views ||= 0;
    post.pinned = Boolean(post.pinned);
  });
  const existingTitles = new Set(db.posts.map((post) => post.title));
  recommendationPosts().forEach((post) => {
    if (!existingTitles.has(post.title)) db.posts.push(post);
  });
  saveDb();
}

normalizeDb();

function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function json(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function cookieValue(req, name) {
  const raw = req.headers.cookie || "";
  const match = raw.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function currentUser(req) {
  const token = cookieValue(req, COOKIE);
  const userId = token && db.sessions[token];
  return userId ? db.users.find((user) => user.id === userId) || null : null;
}

function publicUser(user) {
  return user ? { id: user.id, username: user.username, displayName: user.displayName, joinedAt: user.joinedAt, role: user.role || "member", isAdmin: user.role === "admin" } : null;
}

function safePost(post, user) {
  return {
    ...post,
    favoritesCount: post.favorites.length,
    isFavorited: Boolean(user && post.favorites.includes(user.id)),
    commentsCount: post.comments.length
  };
}

function body(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1024 * 1024) {
        reject(new Error("请求内容过大"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("请求格式不正确"));
      }
    });
    req.on("error", reject);
  });
}

function requireUser(req, res) {
  const user = currentUser(req);
  if (!user) {
    json(res, 401, { error: "请先登录" });
    return null;
  }
  return user;
}

function validateText(value, label, min, max) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) {
    throw new Error(`${label}需要为 ${min}-${max} 个字符`);
  }
  return value.trim();
}

async function api(req, res, url) {
  const user = currentUser(req);
  try {
    if (req.method === "GET" && url.pathname === "/api/me") return json(res, 200, { user: publicUser(user) });
    if (req.method === "GET" && url.pathname === "/api/stats") return json(res, 200, { posts: db.posts.length, users: db.users.length });

    if (req.method === "POST" && url.pathname === "/api/register") {
      const input = await body(req);
      const username = validateText(input.username, "用户名", 3, 24).toLowerCase();
      const displayName = validateText(input.displayName || input.username, "昵称", 2, 24);
      const password = validateText(input.password, "密码", 8, 72);
      if (!/^[a-z0-9_]+$/.test(username)) throw new Error("用户名只能包含小写字母、数字和下划线");
      if (db.users.some((item) => item.username === username)) throw new Error("这个用户名已经被使用");
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.scryptSync(password, salt, 64).toString("hex");
      const newUser = { id: crypto.randomUUID(), username, displayName, salt, hash, joinedAt: now(), role: db.users.length === 0 ? "admin" : "member" };
      db.users.push(newUser);
      const token = crypto.randomBytes(32).toString("hex");
      db.sessions[token] = newUser.id;
      saveDb();
      res.setHeader("Set-Cookie", `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`);
      return json(res, 201, { user: publicUser(newUser) });
    }

    if (req.method === "POST" && url.pathname === "/api/login") {
      const input = await body(req);
      const username = validateText(input.username, "用户名", 3, 24).toLowerCase();
      const password = validateText(input.password, "密码", 8, 72);
      const found = db.users.find((item) => item.username === username);
      if (!found) throw new Error("用户名或密码不正确");
      const hash = crypto.scryptSync(password, found.salt, 64).toString("hex");
      if (!crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(found.hash, "hex"))) throw new Error("用户名或密码不正确");
      const token = crypto.randomBytes(32).toString("hex");
      db.sessions[token] = found.id;
      saveDb();
      res.setHeader("Set-Cookie", `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`);
      return json(res, 200, { user: publicUser(found) });
    }

    if (req.method === "POST" && url.pathname === "/api/logout") {
      const token = cookieValue(req, COOKIE);
      if (token) delete db.sessions[token];
      res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
      saveDb();
      return json(res, 200, { ok: true });
    }

    if (req.method === "GET" && url.pathname === "/api/posts") {
      const category = url.searchParams.get("category");
      const query = (url.searchParams.get("q") || "").trim().toLowerCase();
      let posts = db.posts.filter((post) => !category || category === "全部" || post.category === category);
      if (query) posts = posts.filter((post) => `${post.title} ${post.body} ${post.authorName}`.toLowerCase().includes(query));
      posts.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.createdAt) - new Date(a.createdAt));
      return json(res, 200, { posts: posts.map((post) => safePost(post, user)) });
    }

    if (req.method === "GET" && url.pathname === "/api/admin/summary") {
      const admin = requireUser(req, res);
      if (!admin) return;
      if (admin.role !== "admin") return json(res, 403, { error: "需要管理员权限" });
      const comments = db.posts.reduce((sum, post) => sum + post.comments.length, 0);
      const favorites = db.posts.reduce((sum, post) => sum + post.favorites.length, 0);
      return json(res, 200, {
        users: db.users.map(publicUser),
        posts: db.posts.map((post) => safePost(post, admin)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        stats: { posts: db.posts.length, users: db.users.length, comments, favorites }
      });
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/posts/")) {
      const post = db.posts.find((item) => item.id === url.pathname.split("/")[3]);
      if (!post) return json(res, 404, { error: "帖子不存在" });
      post.views += 1;
      saveDb();
      return json(res, 200, { post: safePost(post, user) });
    }

    if (req.method === "POST" && url.pathname === "/api/posts") {
      const author = requireUser(req, res);
      if (!author) return;
      const input = await body(req);
      const post = {
        id: crypto.randomUUID(),
        title: validateText(input.title, "标题", 4, 100),
        body: validateText(input.body, "正文", 10, 10000),
        category: validateText(input.category || "日常", "分类", 2, 12),
        authorId: author.id,
        authorName: author.displayName,
        createdAt: now(),
        views: 0,
        favorites: [],
        comments: []
      };
      db.posts.push(post);
      saveDb();
      return json(res, 201, { post: safePost(post, author) });
    }

    const commentMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/comments$/);
    if (req.method === "POST" && commentMatch) {
      const author = requireUser(req, res);
      if (!author) return;
      const post = db.posts.find((item) => item.id === commentMatch[1]);
      if (!post) return json(res, 404, { error: "帖子不存在" });
      const input = await body(req);
      const comment = { id: crypto.randomUUID(), body: validateText(input.body, "评论", 2, 2000), authorId: author.id, authorName: author.displayName, createdAt: now() };
      post.comments.push(comment);
      saveDb();
      return json(res, 201, { comment });
    }

    const favoriteMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/favorite$/);
    if (req.method === "POST" && favoriteMatch) {
      const author = requireUser(req, res);
      if (!author) return;
      const post = db.posts.find((item) => item.id === favoriteMatch[1]);
      if (!post) return json(res, 404, { error: "帖子不存在" });
      const index = post.favorites.indexOf(author.id);
      if (index >= 0) post.favorites.splice(index, 1);
      else post.favorites.push(author.id);
      saveDb();
      return json(res, 200, { isFavorited: index < 0, favoritesCount: post.favorites.length });
    }

    const deletePostMatch = url.pathname.match(/^\/api\/admin\/posts\/([^/]+)$/);
    if (req.method === "DELETE" && deletePostMatch) {
      const admin = requireUser(req, res);
      if (!admin) return;
      if (admin.role !== "admin") return json(res, 403, { error: "需要管理员权限" });
      const index = db.posts.findIndex((item) => item.id === deletePostMatch[1]);
      if (index < 0) return json(res, 404, { error: "帖子不存在" });
      db.posts.splice(index, 1);
      saveDb();
      return json(res, 200, { ok: true });
    }

    return json(res, 404, { error: "接口不存在" });
  } catch (error) {
    return json(res, 400, { error: error.message || "操作失败" });
  }
}

function serveStatic(req, res, url) {
  let requested = url.pathname === "/" ? "/index.html" : url.pathname;
  requested = path.normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const file = path.join(PUBLIC, requested);
  if (!file.startsWith(PUBLIC)) return json(res, 403, { error: "禁止访问" });
  fs.readFile(file, (error, data) => {
    if (error) {
      const fallback = path.join(PUBLIC, "index.html");
      return fs.readFile(fallback, (fallbackError, html) => {
        if (fallbackError) return json(res, 404, { error: "页面不存在" });
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
      });
    }
    const ext = path.extname(file);
    const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg" };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) return api(req, res, url);
  serveStatic(req, res, url);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`新月百合会论坛运行在 http://0.0.0.0:${PORT}`);
});
