import api from './client'

function unwrap(res) {
  if (res == null) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.data)) return res.data
  return res
}

export const chatApi = {
  conversations: () => api.get('/chat/conversations').then(unwrap),
  messages: (id) => api.get(`/chat/conversations/${id}/messages`).then(unwrap),
  sendMessage: (id, body) => api.post(`/chat/conversations/${id}/messages`, body),
  markRead: (id) => api.post(`/chat/conversations/${id}/read`),
  createConversation: (body) => api.post('/chat/conversations', body),
}

export const usersApi = {
  list: () => api.get('/users').then(unwrap),
}

export const tasksApi = {
  list: (params = {}) => api.get('/tasks', { params }).then(unwrap),
  get: (id) => api.get(`/tasks/${id}`),
  complete: (id, body) => api.post(`/tasks/${id}/complete`, body),
}

export const scheduleApi = {
  shifts: (params) => api.get('/schedule/shifts', { params }).then(unwrap),
  createShift: (body) => api.post('/schedule/shifts', body),
  updateShift: (id, body) => api.patch(`/schedule/shifts/${id}`, body),
  deleteShift: (id) => api.delete(`/schedule/shifts/${id}`),
  timeOffRequests: (params) => api.get('/schedule/time-off', { params }).then(unwrap),
  requestTimeOff: (body) => api.post('/schedule/time-off', body),
  approveTimeOff: (id) => api.post(`/schedule/time-off/${id}/approve`),
  denyTimeOff: (id) => api.post(`/schedule/time-off/${id}/deny`),
}

export const teamApi = {
  directory: () => api.get('/team/directory').then(unwrap),
  feed: () => api.get('/team/feed').then(unwrap),
  postRecognition: (body) => api.post('/team/recognition', body),
  react: (postId) => api.post(`/team/posts/${postId}/react`),
  rewardsBalance: () => api.get('/team/rewards/balance'),
  rewardsCatalog: () => api.get('/team/rewards/catalog').then(unwrap),
  redeemReward: (id) => api.post(`/team/rewards/${id}/redeem`),
  createAnnouncement: (body) => api.post('/team/announcements', body),
  grantPoints: (body) => api.post('/team/rewards/grant', body),
  updateProfile: (id, body) => api.patch(`/users/${id}`, body),
  onboardingStepsAdmin: () => api.get('/onboarding/steps').then(unwrap),
  createOnboardingStep: (body) => api.post('/onboarding/steps', body),
  deleteOnboardingStep: (id) => api.delete(`/onboarding/steps/${id}`),
}

export const documentsApi = {
  list: (params) => api.get('/documents', { params }).then(unwrap),
  get: (id) => api.get(`/documents/${id}`),
  create: (body) => api.post('/documents', body),
  update: (id, body) => api.patch(`/documents/${id}`, body),
  remove: (id) => api.delete(`/documents/${id}`),
  acknowledge: (id) => api.post(`/documents/${id}/acknowledge`),
  myDocs: () => api.get('/employee-documents/mine').then(unwrap),
  upload: (formData) => api.post('/employee-documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  onboardingSteps: () => api.get('/onboarding/steps').then(unwrap),
  onboardingProgress: () => api.get('/onboarding/progress').then(unwrap),
  completeStep: (id) => api.post(`/onboarding/steps/${id}/complete`),
  aiImport: (body) => api.post('/documents/ai-import', body),
}

export const formsApi = {
  assignments: () => api.get('/forms/assignments').then(unwrap),
  submissions: () => api.get('/forms/submissions').then(unwrap),
  get: (id) => api.get(`/forms/${id}`),
  submit: (id, body) => api.post(`/forms/${id}/submit`, body),
}

export const assistantApi = {
  ask: (question) => api.post('/assistant/ask', { question }),
}

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
}
