import type { DocumentSnapshot, QuerySnapshot, Unsubscribe } from 'firebase/firestore';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config';
import type { AppStats } from '../types';
import ContactsService from './ContactsService';
import RelationshipsService from './RelationshipsService';
import RemindersService from './RemindersService';

export interface ContactsStats {
  total: number;
  withInteractions: number;
  withoutInteractions: number;
}

export interface RelationshipsStats {
  total: number;
  byTag: Record<string, number>;
  needingFollowUp: number;
  withReminders: number;
}

export interface RemindersStats {
  total: number;
  overdue: number;
  thisWeek: number;
  upcoming: number;
  byTag: Record<string, number>;
}

export interface InteractionsStats {
  total: number;
  byType: Record<string, number>;
  recent: number;
}

export interface DashboardStats {
  totalContacts: number;
  totalRelationships: number;
  totalReminders: number;
  overdueReminders: number;
  relationshipsNeedingFollowUp: number;
  recentInteractions: number;
}

export interface ComprehensiveStats {
  overview: AppStats;
  contacts: ContactsStats;
  relationships: RelationshipsStats;
  reminders: RemindersStats;
  interactions: InteractionsStats;
}

class StatsService {
  private static instance: StatsService;
  private readonly COLLECTION_NAME = 'app_stats';
  
  private contactsService: ContactsService;
  private relationshipsService: RelationshipsService;
  private remindersService: RemindersService;

  private constructor() {
    this.contactsService = ContactsService.getInstance();
    this.relationshipsService = RelationshipsService.getInstance();
    this.remindersService = RemindersService.getInstance();
  }

  public static getInstance(): StatsService {
    if (!StatsService.instance) {
      StatsService.instance = new StatsService();
    }
    return StatsService.instance;
  }

  /**
   * Get cached stats from Firestore
   */
  async getCachedStats(userId: string): Promise<AppStats | null> {
    try {
      const statsRef = doc(db, this.COLLECTION_NAME, userId);
      const statsSnap = await getDoc(statsRef);

      if (statsSnap.exists()) {
        const data = statsSnap.data();
        return {
          totalContacts: data.totalContacts || 0,
          totalRelationships: data.totalRelationships || 0,
          totalReminders: data.totalReminders || 0,
          totalInteractions: data.totalInteractions || 0,
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting cached stats:', error);
      return null;
    }
  }

  /**
   * Get stats (cached or calculated)
   */
  async getStats(userId: string): Promise<AppStats> {
    try {
      const cachedStats = await this.getCachedStats(userId);
      if (cachedStats) {
        return cachedStats;
      }
      
      // If no cached stats, calculate and save them
      return await this.updateStats(userId);
    } catch (error) {
      console.error('Error getting stats:', error);
      return this.getDefaultStats();
    }
  }

  /**
   * Update stats by calculating from all services
   */
  async updateStats(userId: string): Promise<AppStats> {
    try {
      const [contacts, relationships, reminders, interactions] = await Promise.all([
        this.contactsService.getContacts(userId),
        this.relationshipsService.getRelationships(userId),
        this.remindersService.getReminders(userId),
        this.contactsService.getContactInteractions(userId),
      ]);

      const newStats: AppStats = {
        totalContacts: contacts.length,
        totalRelationships: relationships.length,
        totalReminders: reminders.length,
        totalInteractions: interactions.length,
      };

      // Save to Firestore
      await this.saveStats(userId, newStats);
      return newStats;
    } catch (error) {
      console.error('Error updating stats:', error);
      return this.getDefaultStats();
    }
  }

  /**
   * Save stats to Firestore
   */
  private async saveStats(userId: string, stats: AppStats): Promise<void> {
    try {
      const statsRef = doc(db, this.COLLECTION_NAME, userId);
      await setDoc(statsRef, {
        ...stats,
        userId,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error saving stats:', error);
      throw error;
    }
  }

  /**
   * Get default stats
   */
  private getDefaultStats(): AppStats {
    return {
      totalContacts: 0,
      totalRelationships: 0,
      totalReminders: 0,
      totalInteractions: 0,
    };
  }

  /**
   * Get contacts statistics
   */
  async getContactsStats(userId: string): Promise<ContactsStats> {
    try {
      const [contacts, interactions] = await Promise.all([
        this.contactsService.getContacts(userId),
        this.contactsService.getContactInteractions(userId),
      ]);

      const contactIdsWithInteractions = new Set(interactions.map(i => i.contactId));

      return {
        total: contacts.length,
        withInteractions: contactIdsWithInteractions.size,
        withoutInteractions: contacts.length - contactIdsWithInteractions.size,
      };
    } catch (error) {
      console.error('Error getting contacts stats:', error);
      return { total: 0, withInteractions: 0, withoutInteractions: 0 };
    }
  }

  /**
   * Get relationships statistics
   */
  async getRelationshipsStats(userId: string): Promise<RelationshipsStats> {
    try {
      const relationships = await this.relationshipsService.getRelationships(userId);
      const byTag: Record<string, number> = {};
      let needingFollowUp = 0;
      let withReminders = 0;

      const now = new Date();

      for (const rel of relationships) {
        rel.tags.forEach(tag => {
          byTag[tag] = (byTag[tag] || 0) + 1;
        });

        if (rel.nextReminderDate && new Date(rel.nextReminderDate) <= now) {
          needingFollowUp++;
        }
        if (rel.reminderFrequency !== 'never') {
          withReminders++;
        }
      }

      return {
        total: relationships.length,
        byTag,
        needingFollowUp,
        withReminders,
      };
    } catch (error) {
      console.error('Error getting relationships stats:', error);
      return { total: 0, byTag: {}, needingFollowUp: 0, withReminders: 0 };
    }
  }

  /**
   * Get reminders statistics
   */
  async getRemindersStats(userId: string): Promise<RemindersStats> {
    try {
      const reminders = await this.remindersService.getReminders(userId);
      const overdue = reminders.filter(r => r.isOverdue).length;
      const thisWeek = reminders.filter(r => r.isThisWeek && !r.isOverdue).length;
      const upcoming = reminders.filter(r => !r.isThisWeek && !r.isOverdue).length;
      const byTag: Record<string, number> = {};

      for (const rem of reminders) {
        rem.tags.forEach(tag => {
          byTag[tag] = (byTag[tag] || 0) + 1;
        });
      }

      return {
        total: reminders.length,
        overdue,
        thisWeek,
        upcoming,
        byTag,
      };
    } catch (error) {
      console.error('Error getting reminders stats:', error);
      return { total: 0, overdue: 0, thisWeek: 0, upcoming: 0, byTag: {} };
    }
  }

  /**
   * Get interactions statistics
   */
  async getInteractionsStats(userId: string): Promise<InteractionsStats> {
    try {
      const interactions = await this.contactsService.getContactInteractions(userId);
      const byType: Record<string, number> = {};
      let recent = 0;
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      for (const interaction of interactions) {
        byType[interaction.type] = (byType[interaction.type] || 0) + 1;
        if (new Date(interaction.date) >= oneWeekAgo) {
          recent++;
        }
      }

      return {
        total: interactions.length,
        byType,
        recent,
      };
    } catch (error) {
      console.error('Error getting interactions stats:', error);
      return { total: 0, byType: {}, recent: 0 };
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    try {
      const [contacts, relationships, reminders, interactions] = await Promise.all([
        this.contactsService.getContacts(userId),
        this.relationshipsService.getRelationships(userId),
        this.remindersService.getReminders(userId),
        this.contactsService.getContactInteractions(userId),
      ]);

      const overdueReminders = reminders.filter(r => r.isOverdue).length;
      const now = new Date();
      const relationshipsNeedingFollowUp = relationships.filter(r => 
        r.nextReminderDate && new Date(r.nextReminderDate) <= now
      ).length;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentInteractions = interactions.filter(i => 
        new Date(i.date) >= oneWeekAgo
      ).length;

      return {
        totalContacts: contacts.length,
        totalRelationships: relationships.length,
        totalReminders: reminders.length,
        overdueReminders,
        relationshipsNeedingFollowUp,
        recentInteractions,
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        totalContacts: 0,
        totalRelationships: 0,
        totalReminders: 0,
        overdueReminders: 0,
        relationshipsNeedingFollowUp: 0,
        recentInteractions: 0,
      };
    }
  }

  /**
   * Get comprehensive statistics
   */
  async getComprehensiveStats(userId: string): Promise<ComprehensiveStats> {
    try {
      const [overview, contacts, relationships, reminders, interactions] = await Promise.all([
        this.updateStats(userId), // Recalculate and get overview
        this.getContactsStats(userId),
        this.getRelationshipsStats(userId),
        this.getRemindersStats(userId),
        this.getInteractionsStats(userId),
      ]);

      return {
        overview,
        contacts,
        relationships,
        reminders,
        interactions,
      };
    } catch (error) {
      console.error('Error getting comprehensive stats:', error);
      throw error;
    }
  }

  /**
   * Clear cached stats
   */
  async clearCachedStats(userId: string): Promise<boolean> {
    try {
      const statsRef = doc(db, this.COLLECTION_NAME, userId);
      await setDoc(statsRef, {
        totalContacts: 0,
        totalRelationships: 0,
        totalReminders: 0,
        totalInteractions: 0,
        userId,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error('Error clearing cached stats:', error);
      return false;
    }
  }
}

export default StatsService;