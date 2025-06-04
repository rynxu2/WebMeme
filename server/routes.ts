import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTokenSchema, insertChannelTokenSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all channels
  app.get("/api/channels", async (req, res) => {
    try {
      const channels = await storage.getChannels();
      res.json(channels);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch channels" });
    }
  });

  // Get channels with their tokens
  app.get("/api/channels/with-tokens", async (req, res) => {
    try {
      const channelsWithTokens = await storage.getChannelsWithTokens();
      res.json(channelsWithTokens);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch channels with tokens" });
    }
  });

  app.get("/api/tokens/favorites", async (req, res) => {
    try {
      const Tokens = await storage.getFavoriteTokensGrouped();
      res.json(Tokens);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch channels with tokens" });
    }
  });

  // Get tokens for a specific channel
  app.get("/api/channels/:id/tokens", async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      if (isNaN(channelId)) {
        return res.status(400).json({ message: "Invalid channel ID" });
      }

      const channelWithTokens = await storage.getChannelTokens(channelId);
      res.json(channelWithTokens);
    } catch (error) {
      res.status(404).json({ message: "Channel not found" });
    }
  });

  // Get all tokens
  app.get("/api/tokens", async (req, res) => {
    try {
      const tokens = await storage.getTokens();
      res.json(tokens);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tokens" });
    }
  });

  // Search tokens
  app.get("/api/tokens/search", async (req, res) => {
    try {
      const { contract, channel: channelName } = req.query;
      
      if (!contract || typeof contract !== "string") {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }

      const tokens = await storage.searchTokensByContract(contract, channelName as string | undefined);
      res.json(tokens);
    } catch (error) {
      res.status(500).json({ message: "Failed to search tokens" });
    }
  });

  // Get common tokens (appearing in 2+ channels)
  app.get("/api/tokens/common", async (req, res) => {
    try {
      const { minChannels } = req.query;
      const minChannelsNum = minChannels ? parseInt(minChannels as string) : 2;
      
      const commonTokens = await storage.getCommonTokens(minChannelsNum);
      res.json(commonTokens);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch common tokens" });
    }
  });

  // Create a new token
  app.post("/api/tokens", async (req, res) => {
    try {
      const validatedData = insertTokenSchema.parse(req.body);
      const token = await storage.createToken(validatedData);
      res.status(201).json(token);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid token data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create token" });
    }
  });

  // Update token
  app.patch("/api/tokens/:id", async (req, res) => {
    try {
      const tokenId = parseInt(req.params.id);
      if (isNaN(tokenId)) {
        return res.status(400).json({ message: "Invalid token ID" });
      }

      const validatedData = insertTokenSchema.partial().parse(req.body);
      const updatedToken = await storage.updateToken(tokenId, validatedData);
      
      if (!updatedToken) {
        return res.status(404).json({ message: "Token not found" });
      }

      res.json(updatedToken);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid token data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update token" });
    }
  });

  // Delete token
  app.delete("/api/tokens/:id", async (req, res) => {
    try {
      const tokenId = parseInt(req.params.id);
      if (isNaN(tokenId)) {
        return res.status(400).json({ message: "Invalid token ID" });
      }

      const deleted = await storage.deleteToken(tokenId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Token not found" });
      }

      res.json({ message: "Token deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete token" });
    }
  });

  // Add token to channel
  app.post("/api/channels/:channelId/tokens/:tokenId", async (req, res) => {
    try {
      const channelId = parseInt(req.params.channelId);
      const tokenId = parseInt(req.params.tokenId);
      
      if (isNaN(channelId) || isNaN(tokenId)) {
        return res.status(400).json({ message: "Invalid channel or token ID" });
      }

      const channelToken = await storage.addTokenToChannel({ channelId, tokenId });
      res.status(201).json(channelToken);
    } catch (error) {
      res.status(500).json({ message: "Failed to add token to channel" });
    }
  });

  // Webhook endpoint for receiving Telegram data
  app.post("/api/telegram/webhook", async (req, res) => {
    try {
      // This would typically handle incoming data from Telegram channels
      // For now, we'll accept token data and channel information
      const { channelTelegramId, tokenData } = req.body;
      
      if (!channelTelegramId || !tokenData) {
        return res.status(400).json({ message: "Channel ID and token data are required" });
      }

      // Find channel by telegram ID
      const channels = await storage.getChannels();
      const channel = channels.find(c => c.telegramId === channelTelegramId);
      
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      // Check if token already exists
      let token = await storage.getTokenByAddress(tokenData.address);
      
      if (!token) {
        // Create new token
        const validatedTokenData = insertTokenSchema.parse(tokenData);
        token = await storage.createToken(validatedTokenData);
      } else {
        // Update existing token with new data
        const validatedTokenData = insertTokenSchema.partial().parse(tokenData);
        token = await storage.updateToken(Number(token.id), validatedTokenData) || token;
      }

      // Add token to channel if not already associated
      await storage.addTokenToChannel({ channelId: channel.id, tokenId: Number(token.id) });

      res.json({ message: "Token data processed successfully", token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to process webhook data" });
    }
  });

  app.post("/api/tokens/:address/favorite", async (req, res) => {
    try {
      const address = req.params.address;
      const favorite = await storage.getTokenFavoritesStatus(address);
      console.log("Toggling favorite status for address:", address, "Current status:", favorite);
      if (favorite === undefined) {
        return res.status(404).json({ message: "Token not found" });
      }
      const count = await storage.updateFavoriteByAddress(address, !favorite);
      if (count === 0) {
        return res.status(404).json({ message: "Token not found or already updated" });
      }
      console.log("Favorite status updated for address:", address, "New status:", !favorite);
      res.json({ address, favorite: !favorite });
    } catch (error) {
      console.error("Failed to toggle token favorite status:", error);
      res.status(500).json({ message: "Failed to update token favorite status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}