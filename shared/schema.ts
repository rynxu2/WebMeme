import { pgTable, text, serial, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  telegramId: text("telegram_id").notNull().unique(),
  color: text("color").notNull().default("#1565C0"),
  isActive: integer("is_active").notNull().default(1),
});

export const tokens = pgTable("tokens", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  marketcap: decimal("marketcap", { precision: 20, scale: 2 }),
  marketcapCall: decimal("marketcap_call", { precision: 20, scale: 2 }),
  ath: decimal("ath", { precision: 20, scale: 8 }),
  low: decimal("low", { precision: 20, scale: 8 }),
  athAt: timestamp("ath_at"),
  lowAt: timestamp("low_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isFavorite: boolean("is_favorite").notNull().default(false),
});

export const channelTokens = pgTable("channel_tokens", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull(),
  tokenId: integer("token_id").notNull(),
  discoveredAt: timestamp("discovered_at").defaultNow(),
});

export const insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
});

export const insertTokenSchema = createInsertSchema(tokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChannelTokenSchema = createInsertSchema(channelTokens).omit({
  id: true,
  discoveredAt: true,
});

export type Channel = typeof channels.$inferSelect;
export type Token = typeof tokens.$inferSelect;
export type ChannelToken = typeof channelTokens.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type InsertToken = z.infer<typeof insertTokenSchema>;
export type InsertChannelToken = z.infer<typeof insertChannelTokenSchema>;

export type TokenWithChannels = Token & {
  channels: (Channel & { discoveredAt: Date })[];
};

export type ChannelWithTokens = Channel & {
  tokens: (Token)[];
  tokenCount: number;
};
