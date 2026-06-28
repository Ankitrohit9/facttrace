import { pgTable, serial, text, integer, doublePrecision, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define the 'users' (citizens) table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Citizen uuid
  nickname: text('nickname').notNull(),
  points: integer('points').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'issues' table
export const issues = pgTable('issues', {
  id: serial('id').primaryKey(),
  description: text('description').notNull(),
  imageUrl: text('image_url'),
  category: text('category').notNull(),
  severity: integer('severity').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  status: text('status').notNull(),
  summary: text('summary'),
  verificationCount: integer('verification_count').notNull().default(0),
  flagCount: integer('flag_count').notNull().default(0),
  reporterUuid: text('reporter_uuid'),
  assignedDepartment: text('assigned_department'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  issues: many(issues),
}));

export const issuesRelations = relations(issues, ({ one }) => ({
  reporter: one(users, {
    fields: [issues.reporterUuid],
    references: [users.uid],
  }),
}));
