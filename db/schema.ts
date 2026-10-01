import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const scores = sqliteTable('scores', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull(),
  mode: text('mode').notNull(),
  name: text('name').notNull(),
  score: integer('score').notNull(),
  wave: integer('wave').notNull(),
  createdAt: integer('created_at').notNull(),
}, table => [index('idx_scores_mode_rank').on(table.mode, table.score, table.createdAt, table.id)]);
