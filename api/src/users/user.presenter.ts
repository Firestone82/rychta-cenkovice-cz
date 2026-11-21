import type { User } from './user.entity.js';

export const presentUser = (user: User) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  created_at: user.createdAt.toISOString(),
  last_login_at: user.lastLoginAt?.toISOString() ?? null,
});
