import http from "@/lib/http";

// ── Auth ──
export const auth = {
  session: () => http.get("/auth/session"),
  login: (email, password) => http.post("/auth/login", { email, password }),
  register: (name, email, password) => http.post("/auth/register", { name, email, password }),
  logout: () => http.post("/auth/logout"),
  forgotPassword: (email) => http.post("/auth/forgot-password", { email }),
};

// ── User ──
export const user = {
  profile: () => http.get("/user/profile"),
  updateProfile: (data) => http.patch("/user/profile", data),
  stats: () => http.get("/user/stats"),
  changePassword: (currentPassword, newPassword) =>
    http.post("/user/change-password", { currentPassword, newPassword }),
  testHistory: () => http.get("/user/test-history"),
  getStudent: (userId) => http.get(`/user/student/${userId}`),
};

// ── Arena ──
export const arena = {
  submit: (challengeId, selectedIndex) =>
    http.post("/arena/submit", { challengeId, selectedIndex }),
  history: () => http.get("/arena/history"),
  stats: () => http.get("/arena/stats"),
};

// ── Challenges ──
export const challenges = {
  current: () => http.get("/challenge/current"),
  next: (difficulty) => http.get("/challenge/next", { params: { difficulty } }),
  all: () => http.get("/challenge/all"),
  get: (id) => http.get(`/challenge/${id}`),
  create: (data) => http.post("/challenge", data),
  update: (id, data) => http.patch(`/challenge/${id}`, data),
  remove: (id) => http.delete(`/challenge/${id}`),
  toggle: (id) => http.patch(`/challenge/${id}/toggle`),
};

// ── Leaderboard ──
export const leaderboard = {
  weekly: () => http.get("/leaderboard"),
  allTime: () => http.get("/leaderboard/alltime"),
  winners: () => http.get("/leaderboard/winners"),
  weekInfo: () => http.get("/leaderboard/week-info"),
};

// ── Events ──
// `id` arguments are validated before the request — a callsite with
// `undefined`/`null` used to produce `/api/events/undefined`, routed to
// the `/:id` handler whose UUID check then 400'd. Throwing early makes
// the bug show up at the call site (as a clear Error) instead of a
// mysterious "Invalid event ID" network error.
function requireId(id, fn) {
  if (!id) throw new Error(`events.${fn}: id is required (got ${id})`);
  return id;
}
export const events = {
  list: () => http.get("/events"),
  get: (id) => http.get(`/events/${requireId(id, "get")}`),
  create: (data) => http.post("/events", data),
  update: (id, data) => http.patch(`/events/${id}`, data),
  remove: (id) => http.delete(`/events/${id}`),
  toggleReg: (id) => http.patch(`/events/${id}/toggle-reg`),
  settings: () => http.get("/events/settings"),
  updateSetting: (key, value) => http.patch(`/events/settings/${key}`, { value }),
  // Registration
  register: (id, data) => http.post(`/events/${id}/register`, data || {}),
  cancelReg: (id) => http.delete(`/events/${id}/register`),
  registrations: (id) => http.get(`/events/${id}/registrations`),
  // Attendance
  checkin: (id, data) => http.post(`/events/${id}/checkin`, data || {}),
  manualCheckin: (id, data) => http.post(`/events/${id}/checkin-manual`, data),
  scanQr: (id, qr_token, session_label) => http.post(`/events/${id}/scan-qr`, { qr_token, session_label }),
  attendance: (id) => http.get(`/events/${id}/attendance`),
  // Event Leaderboard
  leaderboard: (id) => http.get(`/events/${id}/leaderboard`),
  updateScore: (id, data) => http.post(`/events/${id}/leaderboard`, data),
  publishResults: (id) => http.post(`/events/${id}/leaderboard/publish`),
  // Paid-event reconciliation (migration 19)
  submitPayment: (id, regId, paymentRef) =>
    http.post(`/events/${id}/registrations/${regId}/pay`, { paymentRef }),
  // Razorpay auto-verify flow (migration 23). The manual UPI-ref flow
  // above is still used as a fallback when RAZORPAY_KEY_ID isn't set
  // or the student hits "pay manually instead".
  createRazorpayOrder: (id, regId) =>
    http.post(`/events/${id}/registrations/${regId}/razorpay-order`),
  listPayments: (id) => http.get(`/events/${id}/payments`),
  markPaid: (id, regId) =>
    http.post(`/events/${id}/registrations/${regId}/mark-paid`, {}),
  rejectPayment: (id, regId, reason) =>
    http.post(`/events/${id}/registrations/${regId}/reject`, { reason }),
};

// ── Achievements ──
export const achievements = {
  list: () => http.get("/achievements"),
  mine: () => http.get("/achievements/me"),
  user: (userId) => http.get(`/achievements/user/${userId}`),
  grant: (data) => http.post("/achievements/grant", data),
};

// ── Insights ──
export const insights = {
  recommendations: () => http.get("/insights/recommendations"),
  eventHealth: (id) => http.get(`/insights/event/${id}/health`),
  admin: () => http.get("/insights/admin"),
};

// ── Admin ──
export const admin = {
  stats: () => http.get("/admin/stats"),
  activeUsers: () => http.get("/admin/active-users"),
  users: (page, limit) => http.get("/admin/users", { params: { page, limit } }),
  exportUsers: () => http.get("/admin/users/export", { responseType: "blob" }),
  createUser: (data) => http.post("/admin/users/create", data),
  deleteUser: (id) => http.delete(`/admin/users/${id}`),
  resetPassword: (id, newPassword) => http.post(`/admin/users/${id}/reset-password`, { newPassword }),
  updateRole: (id, role) => http.patch(`/admin/users/${id}/role`, { role }),
  resetWeek: () => http.post("/admin/reset-week"),
  generate: (topic, difficulty) => http.get("/admin/generate", { params: { topic, difficulty } }),
  saveQuestion: (data) => http.post("/admin/save", data),
  // Data ops
  teams: () => http.get("/admin/data/teams"),
  deleteTeam: (id) => http.delete(`/admin/data/teams/${id}`),
  deleteProject: (id) => http.delete(`/admin/data/projects/${id}`),
  tests: () => http.get("/admin/data/tests"),
  deleteTest: (id) => http.delete(`/admin/data/tests/${id}`),
  clearAttempts: (userId) => http.delete(`/admin/data/attempts/${userId}`),
  resetXp: (userId) => http.patch(`/admin/data/reset-xp/${userId}`),
  clearAllAttempts: () => http.delete("/admin/data/all-attempts"),
  exportAll: () => http.get("/admin/export", { responseType: "blob" }),
};

// ── Teacher ──
export const teacher = {
  profile: () => http.get("/teacher/profile"),
  stats: () => http.get("/teacher/stats"),
  students: () => http.get("/teacher/students"),
  performance: () => http.get("/teacher/performance"),
  activity: () => http.get("/teacher/activity"),
  generate: (topic, difficulty) => http.get("/teacher/generate", { params: { topic, difficulty } }),
  saveQuestion: (data) => http.post("/teacher/save-question", data),
  challenges: () => http.get("/teacher/challenges"),
  toggleChallenge: (id) => http.patch(`/teacher/challenges/${id}/toggle`),
  leaderboard: () => http.get("/teacher/leaderboard"),
};

// ── Certificates ──
export const certificates = {
  uploadAsset: (file, type) => {
    const fd = new FormData();
    fd.append("asset", file);
    return http.post(`/certificates/upload-asset?type=${type}`, fd);
  },
  preview: (data) => http.post("/certificates/preview", data, { responseType: "blob" }),
  matchStudents: (recipients) => http.post("/certificates/match-students", { recipients }),
  create: (data) => http.post("/certificates/create", data),
  batches: () => http.get("/certificates/batches"),
  deleteBatch: (id) => http.delete(`/certificates/batches/${id}`),
  downloadZip: (batchId) => http.get(`/certificates/batch/${batchId}/zip`, { responseType: "blob" }),
  download: (id) => http.get(`/certificates/download/${id}`, { responseType: "blob" }),
  mine: () => http.get("/certificates/mine"),
};

// ── Projects ──
export const projects = {
  list: () => http.get("/projects"),
  categories: () => http.get("/projects/categories"),
  myTeam: () => http.get("/projects/my-team"),
  createTeam: (data) => http.post("/projects/teams", data),
  submit: (data) => http.post("/projects", data),
  vote: (id) => http.post(`/projects/${id}/vote`),
  approve: (id) => http.patch(`/projects/${id}/approve`),
  pending: () => http.get("/projects/pending"),
  createCategory: (data) => http.post("/projects/categories", data),
  deleteCategory: (id) => http.delete(`/projects/categories/${id}`),
};

// ── Notifications ──
export const notifications = {
  list: () => http.get("/notifications"),
  markRead: (id) => http.patch(`/notifications/${id}/read`),
  markAllRead: () => http.patch("/notifications/read-all"),
  clear: () => http.delete("/notifications/clear"),
  broadcast: (title, message) => http.post("/notifications/broadcast", { title, message }),
};

// ── Announcements ──
export const announcements = {
  list: () => http.get("/announcements"),
  create: (data) => http.post("/announcements", data),
  remove: (id) => http.delete(`/announcements/${id}`),
};

// ── Gallery ──
export const gallery = {
  list: () => http.get("/gallery"),
  upload: (file) => {
    const fd = new FormData();
    fd.append("image", file);
    return http.post("/gallery/upload", fd);
  },
  remove: (imageId) => http.delete("/gallery", { data: { imageId } }),
  createCategory: (data) => http.post("/gallery/category", data),
};

// ── Quiz ──
export const quiz = {
  challenges: () => http.get("/quiz/challenges"),
  aiBulk: (data) => http.post("/quiz/ai-generate-bulk", data),
  uploadCsv: (file, save) => {
    const fd = new FormData();
    fd.append("csv", file);
    return http.post(`/quiz/upload-csv?save=${save}`, fd);
  },
  createTest: (data) => http.post("/quiz/scheduled", data),
  listTests: () => http.get("/quiz/scheduled"),
  activeTests: () => http.get("/quiz/active"),
  getTest: (id) => http.get(`/quiz/scheduled/${id}`),
  submitTest: (id, answers) => http.post(`/quiz/scheduled/${id}/submit`, { answers }),
  deleteTest: (id) => http.delete(`/quiz/scheduled/${id}`),
};

// ── Payments ──
export const payments = {
  plans: () => http.get("/payment/plans"),
  createOrder: (planId) => http.post("/payment/create-order", { planId }),
  verify: (data) => http.post("/payment/verify", data),
  history: () => http.get("/payment/history"),
};

// ── Super Admin ──
export const superAdmin = {
  analytics: () => http.get("/super-admin/analytics"),
  leaderboard: () => http.get("/super-admin/leaderboard"),
  auditLogs: () => http.get("/super-admin/audit-logs"),
  orgs: () => http.get("/super-admin/organisations"),
  createOrg: (data) => http.post("/super-admin/organisations", data),
  updateOrg: (id, data) => http.patch(`/super-admin/organisations/${id}`, data),
  deleteOrg: (id) => http.delete(`/super-admin/organisations/${id}`),
  suspendOrg: (id) => http.post(`/super-admin/organisations/${id}/suspend`),
  activateOrg: (id) => http.post(`/super-admin/organisations/${id}/activate`),
  assignPlan: (id, planName) => http.post(`/super-admin/organisations/${id}/plan`, { planName }),
  setFeatures: (id, features) => http.put(`/super-admin/organisations/${id}/features`, { flags: features }),
  orgStats: (id) => http.get(`/super-admin/organisations/${id}/stats`),
  forceSuspendUsers: (id) => http.post(`/super-admin/organisations/${id}/force-suspend-users`),
  impersonate: (orgId) => http.post(`/super-admin/impersonate/${orgId}`),
  stopImpersonate: () => http.delete("/super-admin/impersonate"),
  plans: () => http.get("/super-admin/plans"),
  payments: () => http.get("/super-admin/payments"),
};

// ── Org Admin ──
export const orgAdmin = {
  stats: () => http.get("/org-admin/org-stats"),
  analytics: () => http.get("/org-admin/analytics"),
  users: (params) => http.get("/org-admin/users", { params }),
  updateRole: (id, role) => http.patch(`/org-admin/users/${id}/role`, { role }),
  suspendUser: (id) => http.post(`/org-admin/users/${id}/suspend`),
  activateUser: (id) => http.post(`/org-admin/users/${id}/activate`),
  invite: (email, role) => http.post("/org-admin/invite", { email, role }),
  branding: () => http.get("/org-admin/branding"),
  updateBranding: (data) => http.patch("/org-admin/branding", data),
  features: () => http.get("/org-admin/features"),
  toggleFeature: (feature, enabled) => http.patch("/org-admin/features", { feature, enabled }),
};

// ── Contact ──
export const contact = {
  send: (data) => http.post("/contact/send", data),
};

// ── Bot ──
export const bot = {
  chat: (messages, challengeContext) => http.post("/bot/chat", { messages, challengeContext }),
};

// ── Comments ──
export const comments = {
  list: (challengeId) => http.get(`/comments/${challengeId}`),
  post: (challengeId, content) => http.post(`/comments/${challengeId}`, { content }),
  askAi: (challengeId, question, challengeTitle) => http.post(`/comments/${challengeId}/ask-ai`, { question, challengeTitle }),
};

// ── Referrals ──
export const referral = {
  getCode: () => http.get("/referral/code"),
  apply: (code) => http.post("/referral/apply", { code }),
  stats: () => http.get("/referral/stats"),
  leaderboard: () => http.get("/referral/leaderboard"),
  validate: (code) => http.get(`/referral/validate/${code}`),
};

// ── Chat / Messaging (E2EE) ──
export const chat = {
  // Keys
  registerKey: (publicKey) => http.post("/chat/keys/register", { publicKey }),
  getKey: (userId) => http.get(`/chat/keys/${userId}`),
  // Friends
  sendRequest: (recipientId) => http.post("/chat/friends/request", { recipientId }),
  respondRequest: (requestId, accept) => http.post("/chat/friends/respond", { requestId, accept }),
  cancelRequest: (recipientId) => http.post("/chat/friends/request/cancel", { recipientId }),
  unfriend: (friendshipId) => http.delete(`/chat/friends/${friendshipId}`),
  getFriends: () => http.get("/chat/friends"),
  getPending: () => http.get("/chat/friends/pending"),
  // Relationship state (Phase 15 — powers FriendButton / UserHoverCard)
  getRelationship: (userId) => http.get(`/chat/relationship/${userId}`),
  getRelationshipsBatch: (userIds) => http.post("/chat/relationships/batch", { userIds }),
  // Conversations
  getOrCreateConversation: (otherUserId) => http.post("/chat/conversations", { otherUserId }),
  getConversations: () => http.get("/chat/conversations"),
  // Messages
  sendMessage: (conversationId, encryptedContent, iv, messageType) =>
    http.post("/chat/messages", { conversationId, encryptedContent, iv, messageType }),
  getMessages: (conversationId, page) => http.get(`/chat/messages/${conversationId}?page=${page || 1}`),
  markAsRead: (conversationId) => http.post("/chat/messages/read", { conversationId }),
  // Discovery
  searchUsers: (q) => http.get(`/chat/search?q=${encodeURIComponent(q)}`),
  // Block/Report
  blockUser: (blockedId) => http.post("/chat/block", { blockedId }),
  reportMessage: (messageId, reason) => http.post("/chat/report", { messageId, reason }),
  // Settings
  getSettings: () => http.get("/chat/settings"),
  updateSettings: (settings) => http.patch("/chat/settings", settings),
};

// ── Core Team portal ──
export const core = {
  me:           () => http.get("/core/me"),
  redeem:       (code) => http.post("/core/redeem", { code }),
  // Roster
  teams:        () => http.get("/core/teams"),
  leaderboard:  () => http.get("/core/leaderboard"),
  createTeam:   (data) => http.post("/core/teams", data),
  addMember:    (data) => http.post("/core/members", data),
  // Tasks
  tasks:        () => http.get("/core/tasks"),
  createTask:   (data) => http.post("/core/tasks", data),
  claimTask:    (id) => http.post(`/core/tasks/${id}/claim`),
  submitTask:   (id, submission) => http.post(`/core/tasks/${id}/submit`, { submission }),
  confirmTask:  (id) => http.post(`/core/tasks/${id}/confirm`),
  deleteTask:   (id) => http.delete(`/core/tasks/${id}`),
  // Feedback (anonymous)
  feedback:           () => http.get("/core/feedback"),
  createFeedback:     (data) => http.post("/core/feedback", data),
  setFeedbackStatus:  (id, status) => http.patch(`/core/feedback/${id}/status`, { status }),
  revealAuthor:       (id) => http.get(`/core/feedback/${id}/author`),
  // Ideas
  ideas:        (field) => http.get("/core/ideas", { params: field ? { field } : {} }),
  createIdea:   (data) => http.post("/core/ideas", data),
  voteIdea:     (id) => http.post(`/core/ideas/${id}/vote`),
  deleteIdea:   (id) => http.delete(`/core/ideas/${id}`),
  // Trends
  trends:       (category) => http.get("/core/trends", { params: category ? { category } : {} }),
  refreshTrends: () => http.post("/core/trends/refresh"),
  // Meetings
  meetings:      () => http.get("/core/meetings"),
  createMeeting: (data) => http.post("/core/meetings", data),
  rsvpMeeting:   (id, status) => http.post(`/core/meetings/${id}/rsvp`, { status }),
  deleteMeeting: (id) => http.delete(`/core/meetings/${id}`),
  // Core badge for a user (main-site profile pages)
  badge:         (userId) => http.get(`/core/badge/${userId}`),
  // Anonymous chat. chatMessages takes an optional axios config so
  // callers can attach an AbortController signal — the chat polls
  // every 5s and a navigate-away mid-poll should cancel the in-flight
  // request (saves a wasted Supabase round-trip + the React "set
  // state after unmount" warning).
  chatMessages:      (config = {}) => http.get("/core/chat", config),
  sendChatMessage:   (body) => http.post("/core/chat", { body }),
  deleteChatMessage: (id) => http.delete(`/core/chat/${id}`),
};

// ── Problem Statements — SIH / GSoC / Kaggle / MLH catalogue ──
// Auth-gated READ for any logged-in student. WRITE is teacher-only
// (the importer + admin curation flow). Optional axios config for
// AbortController cancellation.
export const problems = {
  list:    (params = {}, config = {}) => http.get("/problems",          { ...config, params }),
  facets:  (config = {})              => http.get("/problems/facets",   config),
  get:     (slugOrId, config = {})    => http.get(`/problems/${encodeURIComponent(slugOrId)}`, config),
  create:  (body)  => http.post("/problems", body),
  update:  (id, body) => http.patch(`/problems/${id}`, body),
  remove:  (id)    => http.delete(`/problems/${id}`),
  // ── Engagement (interest beacons + writeups + votes) ──
  engagement:      (slugOrId, config = {}) => http.get(`/problems/${encodeURIComponent(slugOrId)}/engagement`, config),
  toggleInterest:  (slugOrId)              => http.post(`/problems/${encodeURIComponent(slugOrId)}/interest`),
  postWriteup:     (slugOrId, body)        => http.post(`/problems/${encodeURIComponent(slugOrId)}/writeups`, body),
  deleteWriteup:   (slugOrId, writeupId)   => http.delete(`/problems/${encodeURIComponent(slugOrId)}/writeups/${writeupId}`),
  voteWriteup:     (writeupId)             => http.post(`/problems/writeups/${writeupId}/vote`),
  // AI study companion — Socratic Q&A scoped to one problem. Shared
  // 20/hr/user budget with /bot/chat. Returns { reply }.
  aiAsk:           (slugOrId, question)    => http.post(`/problems/${encodeURIComponent(slugOrId)}/ai-ask`, { question }),
  // Daily problem-of-the-day. `daily()` returns today's pick + the
  // viewer's streak; `dailyCheckin()` bumps the streak.
  daily:           (config = {})           => http.get("/problems/daily", config),
  dailyCheckin:    ()                       => http.post("/problems/daily/checkin"),
};

// ── Roadmaps — sequenced learning bundles ──
// Auth-gated like /problems. `list()` returns each roadmap with the
// viewer's done/total counts; `get(slug)` returns the full step list
// with per-step completion + the referenced problem metadata.
export const roadmaps = {
  list:       (params = {}, config = {}) => http.get("/roadmaps", { ...config, params }),
  get:        (slug, config = {})        => http.get(`/roadmaps/${encodeURIComponent(slug)}`, config),
  toggleStep: (stepId)                   => http.post(`/roadmaps/steps/${stepId}/toggle`),
  // ── Authoring ──
  create:     (body)                     => http.post("/roadmaps", body),
  update:     (id, body)                 => http.patch(`/roadmaps/${id}`, body),
  remove:     (id)                       => http.delete(`/roadmaps/${id}`),
  addStep:    (roadmapId, body)          => http.post(`/roadmaps/${roadmapId}/steps`, body),
  updateStep: (stepId, body)             => http.patch(`/roadmaps/steps/${stepId}`, body),
  removeStep: (stepId)                   => http.delete(`/roadmaps/steps/${stepId}`),
  reorderSteps: (roadmapId, stepIds)     => http.post(`/roadmaps/${roadmapId}/reorder`, { step_ids: stepIds }),
  submit:     (id)                       => http.post(`/roadmaps/${id}/submit`),
  withdraw:   (id)                       => http.post(`/roadmaps/${id}/withdraw`),
  // ── Moderation ──
  queue:      (config = {})              => http.get("/roadmaps/admin/queue", config),
  approve:    (id, isFeatured = false)   => http.post(`/roadmaps/${id}/approve`, { is_featured: isFeatured }),
  reject:     (id, reason)               => http.post(`/roadmaps/${id}/reject`, { reason }),
};

// ── Public Portfolio — /u/:handle ──
// `public(handle)` is auth-FREE — works for logged-out viewers too.
// The owner-side endpoints (`mySettings`, `updateSettings`) require
// auth and gate the public surface (toggle public_portfolio, set
// handle, set headline + socials).
export const portfolio = {
  public:          (handle, config = {}) => http.get(`/portfolio/${encodeURIComponent(handle)}`, config),
  mySettings:      (config = {})         => http.get("/portfolio/me", config),
  updateSettings:  (patch)                => http.patch("/portfolio/me", patch),
};

// ── Bookmarks — universal "save for later" across problems, writeups, roadmaps ──
// `state(type, ids)` returns { [id]: true } for the viewer's saved
// targets in this batch — used by list pages to decorate cards.
export const bookmarks = {
  list:    (params = {}, config = {}) => http.get("/bookmarks", { ...config, params }),
  toggle:  (type, id)                 => http.post(`/bookmarks/${type}/${encodeURIComponent(id)}`),
  state:   (type, ids, config = {})   => http.get("/bookmarks/state", { ...config, params: { type, ids: (ids || []).join(",") } }),
};

// ── Problem submissions (AI-assisted catalogue growth) ──
// `draftFromUrl` POSTs the URL; backend fetches it server-side,
// asks the LLM to draft, returns a JSON the student edits before
// `create()`. Queue / approve / reject are admin-only.
export const problemSubmissions = {
  draftFromUrl: (url)        => http.post("/problem-submissions/draft-from-url", { url }),
  create:       (body)       => http.post("/problem-submissions", body),
  mine:         (config = {}) => http.get("/problem-submissions/mine", config),
  queue:        (config = {}) => http.get("/problem-submissions/queue", config),
  approve:      (id)          => http.post(`/problem-submissions/${id}/approve`),
  reject:       (id, reason)  => http.post(`/problem-submissions/${id}/reject`, { reason }),
};

// ── Solution Sprints — weekly featured problem + window leaderboard ──
// `active()` returns the current sprint + its problem and a fresh
// writeup count. `leaderboard(slug?)` returns the sprint's ranked
// writeups (defaults to active). `list()` is the archive.
export const sprints = {
  active:      (config = {})            => http.get("/sprints/active", config),
  leaderboard: (slug, config = {})      => http.get("/sprints/leaderboard", { ...config, params: slug ? { slug } : {} }),
  list:        (config = {})            => http.get("/sprints", config),
  pin:         (problem_id, reason)     => http.post("/sprints/pin", { problem_id, reason }),
  unpin:       ()                       => http.delete("/sprints/pin"),
};

// ── Writeup comments — flat thread per writeup ──
// list() pulls every visible comment (oldest first, capped at 50).
// post() creates one; the server returns the row enriched with the
// viewer's display name so the client can splice it in without a
// second round-trip.
export const writeupComments = {
  list:    (writeupId, config = {})    => http.get(`/writeups/${writeupId}/comments`, config),
  post:    (writeupId, body)           => http.post(`/writeups/${writeupId}/comments`, { body }),
  edit:    (commentId, body)           => http.patch(`/writeups/comments/${commentId}`, { body }),
  remove:  (commentId)                 => http.delete(`/writeups/comments/${commentId}`),
};

// ── Search — global Ctrl+K command palette ──
// `query()` fans out parallel ilike lookups across problems, roadmaps,
// writeups, and public portfolios. Server caps per-group at 8 and
// scrubs PostgREST-special chars from the needle. AbortSignal piped
// through `config` so the palette can cancel in-flight requests when
// the user keeps typing.
export const search = {
  query: (q, types, config = {}) =>
    http.get("/search", {
      ...config,
      params: { q, ...(types ? { types: Array.isArray(types) ? types.join(",") : types } : {}) },
    }),
};

// ── Users / Rich profiles (Phase 15) ──
// Distinct from the `user` singular namespace (self-actions) above.
// `users` is plural and takes a user id as first arg — mirrors the
// backend /api/users/:id/* route tree.
export const users = {
  profile:         (id)                      => http.get(`/users/${id}/profile`),
  friends:         (id, page = 1, limit = 20) => http.get(`/users/${id}/friends`,  { params: { page, limit } }),
  activity:        (id, page = 1, limit = 20) => http.get(`/users/${id}/activity`, { params: { page, limit } }),
  mutualFriends:   (id)                      => http.get(`/users/${id}/mutual-friends`),
};
