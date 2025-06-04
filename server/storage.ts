import { MongoClient, Db, Collection, ObjectId } from "mongodb";
import { 
  channels, 
  tokens, 
  channelTokens,
  type Channel, 
  type Token, 
  type ChannelToken,
  type InsertChannel, 
  type InsertToken, 
  type InsertChannelToken,
  type TokenWithChannels,
  type ChannelWithTokens
} from "@shared/schema";
import "dotenv/config";

// MongoDB document interface matching your existing data structure
interface MongoTokenDocument {
  _id?: ObjectId;
  channel: string;
  channels?: string[];
  contract: string;
  date: Date;
  marketCapCall?: number | null;
  messageId?: string | null;
  updatedAt: Date;
  ath?: number | null;
  ath_at?: Date | null;
  low?: number | null;
  lowCapCount?: number | null;
  low_at?: Date | null;
  marketCap?: number | null;
  name: string;
  symbol: string;
  isFavorite?: boolean;
}

export interface IStorage {
  // Channel operations
  getChannels(): Promise<Channel[]>;
  getChannel(id: number): Promise<Channel | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  
  // Token operations
  getTokens(): Promise<Token[]>;
  getToken(id: number): Promise<Token | undefined>;
  getTokenByAddress(address: string): Promise<Token | undefined>;
  createToken(token: InsertToken): Promise<Token>;
  updateToken(id: number, token: Partial<InsertToken>): Promise<Token | undefined>;
  deleteToken(id: number): Promise<boolean>;
  
  // Channel-Token relationships
  getChannelTokens(channelId: number): Promise<ChannelWithTokens>;
  getTokenChannels(tokenId: number): Promise<TokenWithChannels>;
  addTokenToChannel(channelToken: InsertChannelToken): Promise<ChannelToken>;
  getCommonTokens(minChannels?: number): Promise<TokenWithChannels[]>;
  
  // Dashboard queries
  getChannelsWithTokens(): Promise<ChannelWithTokens[]>;
  searchTokens(query: string, channelId?: number): Promise<Token[]>;
}

export class MongoStorage implements IStorage {
  private client: MongoClient;
  private db: Db;
  private tokensCollection: Collection<MongoTokenDocument>;

  constructor() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is required");
    }
    
    this.client = new MongoClient(uri);
    this.db = this.client.db("telegram_data");
    this.tokensCollection = this.db.collection<MongoTokenDocument>("tokens");
    
    // Initialize connection
    this.initialize();
  }

  private async initialize() {
    try {
      await this.client.connect();
      console.log("Connected to MongoDB telegram_data database");
      
      // Create indexes for better performance on existing tokens collection
      await this.tokensCollection.createIndex({ channel: 1 });
      await this.tokensCollection.createIndex({ contract: 1 });
      await this.tokensCollection.createIndex({ symbol: 1 });
      
      console.log("MongoDB indexes created");
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      throw error;
    }
  }

  // Map MongoDB document to our Token interface with additional data
  private mapTokenDocument(doc: any): Token & { channel?: string; messageId?: string } {
    const id = doc._id?.toString() || Math.random().toString();
    return {
      id: parseInt(id.slice(-8), 16) || Math.floor(Math.random() * 1000000),
      symbol: doc.symbol || '',
      name: doc.name || '',
      address: doc.contract || '',
      marketcap: doc.marketCap?.toString() || null,
      marketcapCall: doc.marketCapCall?.toString() || null,
      ath: doc.ath?.toString() || null,
      low: doc.low?.toString() || null,
      athAt: doc.ath_at ? new Date(doc.ath_at) : null,
      lowAt: doc.low_at ? new Date(doc.low_at) : null,
      createdAt: doc.date ? new Date(doc.date) : null,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : null,
      channel: doc.channel,
      messageId: doc.messageId,
      isFavorite: doc.isFavorite || 0
    };
  }

  // Get unique channels from token data
  private async getUniqueChannels(): Promise<string[]> {
    const channels = await this.tokensCollection.distinct("channel");
    return channels.filter(Boolean);
  }

  async getChannels(): Promise<Channel[]> {
    const uniqueChannels = await this.getUniqueChannels();
    const channelColors = [
      "#00C853", "#FF9800", "#F44336", "#9C27B0", 
      "#3F51B5", "#E91E63", "#009688", "#795548"
    ];
    
    return uniqueChannels.map((channelName, index) => ({
      id: index + 1,
      name: channelName,
      telegramId: channelName.toLowerCase().replace(/\s+/g, '_'),
      color: channelColors[index % channelColors.length],
      isActive: 1
    }));
  }

  async getChannel(id: number): Promise<Channel | undefined> {
    const channels = await this.getChannels();
    return channels.find(channel => channel.id === id);
  }

  async createChannel(insertChannel: InsertChannel): Promise<Channel> {
    // For this implementation, channels are derived from token data
    // This method would not typically be used
    throw new Error("Channels are derived from token data");
  }

  async getTokens(): Promise<Token[]> {
    const docs = await this.tokensCollection.find({}).toArray();
    return docs.map(doc => this.mapTokenDocument(doc));
  }

  async getToken(id: number): Promise<Token | undefined> {
    const doc = await this.tokensCollection.findOne({ _id: ObjectId.createFromHexString(id.toString()) });
    return doc ? this.mapTokenDocument(doc) : undefined;
  }

  async getTokenByAddress(address: string): Promise<Token | undefined> {
    const doc = await this.tokensCollection.findOne({ contract: address });
    return doc ? this.mapTokenDocument(doc) : undefined;
  }

  async getTokensByAddress(address: string): Promise<Token[] | undefined> {
    const docs = await this.tokensCollection.find({ contract: address }).toArray();
    return docs.length > 0 ? docs.map(this.mapTokenDocument) : undefined;
  }

  async createToken(insertToken: InsertToken): Promise<Token> {
    const now = new Date();
    const mongoDoc = {
      symbol: insertToken.symbol,
      name: insertToken.name,
      contract: insertToken.address,
      marketCap: insertToken.marketcap ? parseFloat(insertToken.marketcap) : null,
      marketCapCall: insertToken.marketcapCall ? parseFloat(insertToken.marketcapCall) : null,
      ath: insertToken.ath ? parseFloat(insertToken.ath) : null,
      low: insertToken.low ? parseFloat(insertToken.low) : null,
      ath_at: insertToken.athAt,
      low_at: insertToken.lowAt,
      date: now,
      updatedAt: now,
      channel: "API"
    };
    
    const result = await this.tokensCollection.insertOne(mongoDoc);
    return this.mapTokenDocument({ ...mongoDoc, _id: result.insertedId });
  }

  async updateToken(id: Number, updateData: Partial<InsertToken>): Promise<Token | undefined> {
    const mongoUpdate: any = {
      updatedAt: new Date()
    };
    
    if (updateData.symbol) mongoUpdate.symbol = updateData.symbol;
    if (updateData.name) mongoUpdate.name = updateData.name;
    if (updateData.address) mongoUpdate.contract = updateData.address;
    if (updateData.marketcap) mongoUpdate.marketCap = parseFloat(updateData.marketcap);
    if (updateData.marketcapCall) mongoUpdate.marketCapCall = parseFloat(updateData.marketcapCall);
    if (updateData.ath) mongoUpdate.ath = parseFloat(updateData.ath);
    if (updateData.low) mongoUpdate.low = parseFloat(updateData.low);
    if (updateData.athAt) mongoUpdate.ath_at = updateData.athAt;
    if (updateData.lowAt) mongoUpdate.low_at = updateData.lowAt;

    const result = await this.tokensCollection.findOneAndUpdate(
      { _id: id },
      { $set: mongoUpdate },
      { returnDocument: 'after' }
    );
    
    return result ? this.mapTokenDocument(result) : undefined;
  }

  async updateFavoriteByAddress(address: string, favorite: boolean): Promise<Number | undefined> {
    const result = await this.tokensCollection.updateMany(
      { contract: address },
      { $set: { isFavorite: favorite } }
    );
    return result.modifiedCount > 0 ? result.matchedCount : undefined;
  }

  async deleteToken(id: number): Promise<boolean> {
    // Convert the numeric ID back to the MongoDB format for deletion
    // Since we're working with ObjectIds, we need to find by the mapped ID
    const docs = await this.tokensCollection.find({}).toArray();
    const tokenDoc = docs.find(doc => {
      const mappedId = parseInt(doc._id?.toString().slice(-8), 16) || Math.floor(Math.random() * 1000000);
      return mappedId === id;
    });

    if (!tokenDoc) {
      return false;
    }

    const result = await this.tokensCollection.deleteOne({ _id: tokenDoc._id });
    return result.deletedCount > 0;
  }

  async getChannelTokens(channelId: number): Promise<ChannelWithTokens> {
    const channels = await this.getChannels();
    const channel = channels.find(c => c.id === channelId);
    
    if (!channel) {
      throw new Error(`Channel with id ${channelId} not found`);
    }

    // Get tokens for this specific channel
    const docs = await this.tokensCollection.find({ channel: channel.name }).toArray();
    const tokens = docs.map(doc => ({
      ...this.mapTokenDocument(doc),
      discoveredAt: doc.date ? new Date(doc.date) : new Date()
    }));

    return {
      ...channel,
      tokens,
      tokenCount: tokens.length
    };
  }

  async getTokenChannels(tokenId: Number): Promise<TokenWithChannels> {
    const doc = await this.tokensCollection.findOne({ _id: ObjectId.createFromHexString(tokenId.toString()) });
    if (!doc) {
      throw new Error(`Token with id ${tokenId} not found`);
    }

    const token = this.mapTokenDocument(doc);
    const channels = await this.getChannels();
    
    // Find which channel this token belongs to
    const tokenChannel = channels.find(c => c.name === doc.channel);
    const tokenChannels = tokenChannel ? [{
      ...tokenChannel,
      discoveredAt: doc.date ? new Date(doc.date) : new Date()
    }] : [];

    return {
      ...token,
      channels: tokenChannels
    };
  }

  async addTokenToChannel(insertChannelToken: InsertChannelToken): Promise<ChannelToken> {
    // In this implementation, tokens are already associated with channels
    // This method is for compatibility but not typically used
    throw new Error("Tokens are already associated with channels in the source data");
  }

  async getCommonTokens(minChannels: number = 2): Promise<TokenWithChannels[]> {
    // Group tokens by contract address to find duplicates across channels
    const pipeline = [
      {
        $group: {
          _id: "$contract",
          channels: { $addToSet: "$channel" },
          docs: { $push: "$$ROOT" },
          channelCount: { $addToSet: "$channel" }
        }
      },
      {
        $match: {
          $expr: { $gte: [{ $size: "$channelCount" }, minChannels] }
        }
      }
    ];

    const aggregation = await this.tokensCollection.aggregate(pipeline).toArray();
    const channels = await this.getChannels();
    
    const commonTokens: TokenWithChannels[] = [];
    for (const result of aggregation) {
      // Use the most recent document for this contract
      const latestDoc = result.docs.sort((a: any, b: any) => 
        new Date(b.updatedAt || b.date).getTime() - new Date(a.updatedAt || a.date).getTime()
      )[0];
      
      const token = this.mapTokenDocument(latestDoc);
      const tokenChannels = result.channels.map((channelName: string) => {
        const channel = channels.find(c => c.name === channelName);
        return channel ? {
          ...channel,
          discoveredAt: latestDoc.date ? new Date(latestDoc.date) : new Date()
        } : null;
      }).filter(Boolean);

      commonTokens.push({
        ...token,
        channels: tokenChannels
      });
    }

    return commonTokens;
  }

  async getChannelsWithTokens(): Promise<ChannelWithTokens[]> {
    const channels = await this.getChannels();
    const channelsWithTokens: ChannelWithTokens[] = [];

    for (const channel of channels) {
      const channelWithTokens = await this.getChannelTokens(channel.id);
      channelsWithTokens.push(channelWithTokens);
    }

    return channelsWithTokens;
  }

  // async getTokensFavorite(): Promise<Token[]> {
  //   const docs = await this.tokensCollection.find({ isFavorite: true }).toArray();

  //   // Gộp theo address
  //   const mergedTokensMap = new Map<string, any>();

  //   for (const doc of docs) {
  //     const address = doc.contract || doc.contract;
  //     if (!mergedTokensMap.has(address)) {
  //       // Clone object để tránh ghi đè
  //       mergedTokensMap.set(address, {
  //         ...doc,
  //         channels: [doc.channel],
  //       });
  //     } else {
  //       const existing = mergedTokensMap.get(address);
  //       // Thêm channel nếu chưa có
  //       if (!existing.channels.includes(doc.channel)) {
  //         existing.channels.push(doc.channel);
  //       }
  //     }
  //   }

  //   // Trả về danh sách tokens sau khi gộp và map thành Token[]
  //   const mergedTokens = Array.from(mergedTokensMap.values());
  //   console.log("Merged favorite tokens:", mergedTokens[0]);
  //   return mergedTokens.map(doc => this.mapTokenDocument(doc));
  // }

  async getFavoriteTokensGrouped(minChannels: number = 1): Promise<TokenWithChannels[]> {
    const pipeline = [
      {
        $match: {
          isFavorite: true
        }
      },
      {
        $group: {
          _id: "$contract",
          channels: { $addToSet: "$channel" },
          docs: { $push: "$$ROOT" },
          channelCount: { $addToSet: "$channel" }
        }
      },
      {
        $match: {
          $expr: { $gte: [{ $size: "$channelCount" }, minChannels] }
        }
      }
    ];

    const aggregation = await this.tokensCollection.aggregate(pipeline).toArray();
    const channels = await this.getChannels();

    const favoriteTokens: TokenWithChannels[] = [];
    for (const result of aggregation) {
      const latestDoc = result.docs.sort((a: any, b: any) => 
        new Date(b.updatedAt || b.date).getTime() - new Date(a.updatedAt || a.date).getTime()
      )[0];
      
      const token = this.mapTokenDocument(latestDoc);
      const tokenChannels = result.channels.map((channelName: string) => {
        const channel = channels.find(c => c.name === channelName);
        return channel ? {
          ...channel,
          discoveredAt: latestDoc.date ? new Date(latestDoc.date) : new Date()
        } : null;
      }).filter(Boolean);

      favoriteTokens.push({
        ...token,
        channels: tokenChannels
      });
    }

    return favoriteTokens;
  }

  async searchTokens(query: string, channelId?: number): Promise<Token[]> {
    const searchRegex = new RegExp(query, 'i');
    let matchQuery: any = {
      $or: [
        { symbol: searchRegex },
        { name: searchRegex },
        { contract: searchRegex }
      ]
    };

    if (channelId) {
      const channels = await this.getChannels();
      const channel = channels.find(c => c.id === channelId);
      if (channel) {
        matchQuery.channel = channel.name;
      }
    }

    const docs = await this.tokensCollection.find(matchQuery).toArray();
    return docs.map(doc => this.mapTokenDocument(doc));
  }

  async searchTokensByContract(contract: string, channelName?: string): Promise<Token[]> {
    if (!contract || typeof contract !== 'string') {
      throw new Error("Query parameter 'contract' is required and must be a string");
    }
    const doc = await this.tokensCollection.findOne({ contract: contract, channel: channelName });
    return doc ? [this.mapTokenDocument(doc)] : [];
  }

  async getTokenFavoritesStatus(address: string): Promise<boolean> {
    const doc = await this.tokensCollection.findOne({ contract: address });
    return doc ? !!doc.isFavorite : false;
  }
}

export const storage = new MongoStorage();
