import { eq } from 'drizzle-orm';
import { db } from './db/index.ts';
import { users, issues } from './db/schema.ts';
import { Citizen, Issue, DashboardStats, CivicInsight } from './types.js';

// Haversine formula distance calculation in meters
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

class DBManager {
  private useInMemoryFallback = false;

  private inMemoryUsers: any[] = [
    { id: 1, uid: 'user-1', nickname: 'Aarav Patel', points: 120 },
    { id: 2, uid: 'user-2', nickname: 'Pooja Sharma', points: 95 },
    { id: 3, uid: 'user-3', nickname: 'Aniket Mehta', points: 80 },
    { id: 4, uid: 'user-4', nickname: 'Diya Shah', points: 65 },
    { id: 5, uid: 'user-5', nickname: 'Kabir Varma', points: 40 },
  ];

  private inMemoryIssues: any[] = [
    {
      id: 1,
      description: 'Deep pothole on the middle lane near the main market square crossing.',
      imageUrl: '',
      category: 'Street Infrastructure',
      severity: 4,
      latitude: 37.7749,
      longitude: -122.4194,
      status: 'reported',
      summary: 'Major Pothole near Market Square',
      verificationCount: 3,
      flagCount: 0,
      reporterUuid: 'user-1',
      assignedDepartment: 'Department of Transportation',
      createdAt: new Date(Date.now() - 3600000 * 24 * 2) // 2 days ago
    },
    {
      id: 2,
      description: 'Water leaking from the main municipal supply valve causing minor flooding on the footpath.',
      imageUrl: '',
      category: 'Water Utility',
      severity: 3,
      latitude: 37.7794,
      longitude: -122.4174,
      status: 'in_progress',
      summary: 'Water Pipe Leak on footpath',
      verificationCount: 11,
      flagCount: 1,
      reporterUuid: 'user-2',
      assignedDepartment: 'Water Supply Board',
      createdAt: new Date(Date.now() - 3600000 * 12) // 12 hours ago
    },
    {
      id: 3,
      description: 'Unregulated trash pile blocking pedestrian access near central park gate.',
      imageUrl: '',
      category: 'Sanitation',
      severity: 2,
      latitude: 37.7764,
      longitude: -122.4224,
      status: 'community resolved',
      summary: 'Garbage accumulation blocking walkway',
      verificationCount: 16,
      flagCount: 0,
      reporterUuid: 'user-3',
      assignedDepartment: 'Sanitation Department',
      createdAt: new Date(Date.now() - 3600000 * 48) // 48 hours ago
    }
  ];

  private mapRowToIssue(row: any): Issue {
    const issue: Issue = {
      id: row.id,
      description: row.description,
      image_url: row.imageUrl,
      category: row.category,
      severity: row.severity,
      latitude: row.latitude,
      longitude: row.longitude,
      status: row.status as any,
      summary: row.summary,
      verification_count: row.verificationCount,
      flag_count: row.flagCount,
      reporter_uuid: row.reporterUuid,
      assigned_department: row.assignedDepartment,
      created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    };
    issue.ai_advice = this.calculateAiAdvice(issue);
    return issue;
  }

  // Citizens (Users) API
  async getCitizens(): Promise<Citizen[]> {
    if (this.useInMemoryFallback) {
      return this.inMemoryUsers.map(u => ({ id: u.id, uuid: u.uid, nickname: u.nickname, points: u.points }));
    }
    try {
      const rows = await db.select().from(users);
      this.inMemoryUsers = rows.map(r => ({ id: r.id, uid: r.uid, nickname: r.nickname, points: r.points }));
      return rows.map(r => ({
        id: r.id,
        uuid: r.uid,
        nickname: r.nickname,
        points: r.points
      }));
    } catch (error) {
      console.warn("PostgreSQL connection error in getCitizens, switching to safe in-memory fallback:", error);
      this.useInMemoryFallback = true;
      return this.inMemoryUsers.map(u => ({ id: u.id, uuid: u.uid, nickname: u.nickname, points: u.points }));
    }
  }

  async getCitizenByUuid(uuid: string): Promise<Citizen | undefined> {
    if (this.useInMemoryFallback) {
      const u = this.inMemoryUsers.find(user => user.uid === uuid);
      if (!u) return undefined;
      return { id: u.id, uuid: u.uid, nickname: u.nickname, points: u.points };
    }
    try {
      const rows = await db.select().from(users).where(eq(users.uid, uuid)).limit(1);
      if (rows.length === 0) return undefined;
      const r = rows[0];
      return {
        id: r.id,
        uuid: r.uid,
        nickname: r.nickname,
        points: r.points
      };
    } catch (error) {
      console.warn(`PostgreSQL connection error in getCitizenByUuid(${uuid}), switching to safe in-memory fallback:`, error);
      this.useInMemoryFallback = true;
      const u = this.inMemoryUsers.find(user => user.uid === uuid);
      if (!u) return undefined;
      return { id: u.id, uuid: u.uid, nickname: u.nickname, points: u.points };
    }
  }

  async registerCitizen(uuid: string, nickname: string): Promise<Citizen> {
    if (this.useInMemoryFallback) {
      let u = this.inMemoryUsers.find(user => user.uid === uuid);
      if (u) {
        u.nickname = nickname;
      } else {
        const nextId = this.inMemoryUsers.reduce((max, user) => Math.max(max, user.id), 0) + 1;
        u = { id: nextId, uid: uuid, nickname, points: 0 };
        this.inMemoryUsers.push(u);
      }
      return { id: u.id, uuid: u.uid, nickname: u.nickname, points: u.points };
    }
    try {
      const result = await db.insert(users)
        .values({
          uid: uuid,
          nickname,
          points: 0
        })
         .onConflictDoUpdate({
           target: users.uid,
           set: { nickname }
         })
        .returning();

      const r = result[0];
      return {
        id: r.id,
        uuid: r.uid,
        nickname: r.nickname,
        points: r.points
      };
    } catch (error) {
      console.warn("PostgreSQL connection error in registerCitizen, switching to safe in-memory fallback:", error);
      this.useInMemoryFallback = true;
      let u = this.inMemoryUsers.find(user => user.uid === uuid);
      if (u) {
        u.nickname = nickname;
      } else {
        const nextId = this.inMemoryUsers.reduce((max, user) => Math.max(max, user.id), 0) + 1;
        u = { id: nextId, uid: uuid, nickname, points: 0 };
        this.inMemoryUsers.push(u);
      }
      return { id: u.id, uuid: u.uid, nickname: u.nickname, points: u.points };
    }
  }

  async awardPoints(uuid: string, amount: number): Promise<void> {
    if (this.useInMemoryFallback) {
      const u = this.inMemoryUsers.find(user => user.uid === uuid);
      if (u) {
        u.points = Math.max(0, u.points + amount);
      }
      return;
    }
    try {
      const citizen = await this.getCitizenByUuid(uuid);
      if (citizen) {
        await db.update(users)
          .set({ points: Math.max(0, citizen.points + amount) })
          .where(eq(users.uid, uuid));
      }
    } catch (error) {
      console.warn("PostgreSQL connection error in awardPoints, switching to safe in-memory fallback:", error);
      this.useInMemoryFallback = true;
      const u = this.inMemoryUsers.find(user => user.uid === uuid);
      if (u) {
        u.points = Math.max(0, u.points + amount);
      }
    }
  }

  // Issues API
  async getIssues(): Promise<Issue[]> {
    if (this.useInMemoryFallback) {
      return this.inMemoryIssues.map(r => ({
        id: r.id,
        description: r.description,
        image_url: r.imageUrl,
        category: r.category,
        severity: r.severity,
        latitude: r.latitude,
        longitude: r.longitude,
        status: r.status as any,
        summary: r.summary,
        verification_count: r.verificationCount,
        flag_count: r.flagCount,
        reporter_uuid: r.reporterUuid,
        assigned_department: r.assignedDepartment,
        created_at: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
        ai_advice: this.calculateAiAdvice({
          id: r.id,
          description: r.description,
          image_url: r.imageUrl,
          category: r.category,
          severity: r.severity,
          latitude: r.latitude,
          longitude: r.longitude,
          status: r.status as any,
          summary: r.summary,
          verification_count: r.verificationCount,
          flag_count: r.flagCount,
          reporter_uuid: r.reporterUuid,
          assigned_department: r.assignedDepartment,
          created_at: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
        } as Issue)
      }));
    }
    try {
      const rows = await db.select().from(issues);
      this.inMemoryIssues = rows.map(r => ({
        id: r.id,
        description: r.description,
        imageUrl: r.imageUrl,
        category: r.category,
        severity: r.severity,
        latitude: r.latitude,
        longitude: r.longitude,
        status: r.status,
        summary: r.summary,
        verificationCount: r.verificationCount,
        flagCount: r.flagCount,
        reporterUuid: r.reporterUuid,
        assignedDepartment: r.assignedDepartment,
        createdAt: r.createdAt
      }));
      return rows.map(r => this.mapRowToIssue(r));
    } catch (error) {
      console.warn("PostgreSQL connection error in getIssues, switching to safe in-memory fallback:", error);
      this.useInMemoryFallback = true;
      return this.getIssues();
    }
  }

  async getIssueById(id: number): Promise<Issue | undefined> {
    if (this.useInMemoryFallback) {
      const r = this.inMemoryIssues.find(i => i.id === id);
      if (!r) return undefined;
      const issue: Issue = {
        id: r.id,
        description: r.description,
        image_url: r.imageUrl,
        category: r.category,
        severity: r.severity,
        latitude: r.latitude,
        longitude: r.longitude,
        status: r.status as any,
        summary: r.summary,
        verification_count: r.verificationCount,
        flag_count: r.flagCount,
        reporter_uuid: r.reporterUuid,
        assigned_department: r.assignedDepartment,
        created_at: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      };
      issue.ai_advice = this.calculateAiAdvice(issue);
      return issue;
    }
    try {
      const rows = await db.select().from(issues).where(eq(issues.id, id)).limit(1);
      if (rows.length === 0) return undefined;
      return this.mapRowToIssue(rows[0]);
    } catch (error) {
      console.warn(`PostgreSQL connection error in getIssueById(${id}), switching to safe in-memory fallback:`, error);
      this.useInMemoryFallback = true;
      return this.getIssueById(id);
    }
  }

  async createIssue(issueData: Omit<Issue, 'id' | 'created_at' | 'verification_count' | 'flag_count'>): Promise<Issue> {
    if (this.useInMemoryFallback) {
      const nextId = this.inMemoryIssues.reduce((max, i) => Math.max(max, i.id), 0) + 1;
      const r = {
        id: nextId,
        description: issueData.description,
        imageUrl: issueData.image_url,
        category: issueData.category,
        severity: issueData.severity,
        latitude: issueData.latitude,
        longitude: issueData.longitude,
        status: issueData.status,
        summary: issueData.summary,
        verificationCount: 0,
        flagCount: 0,
        reporterUuid: issueData.reporter_uuid,
        assignedDepartment: issueData.assigned_department,
        createdAt: new Date()
      };
      this.inMemoryIssues.push(r);
      const newIssue: Issue = {
        id: r.id,
        description: r.description,
        image_url: r.imageUrl,
        category: r.category,
        severity: r.severity,
        latitude: r.latitude,
        longitude: r.longitude,
        status: r.status as any,
        summary: r.summary,
        verification_count: r.verificationCount,
        flag_count: r.flagCount,
        reporter_uuid: r.reporterUuid,
        assigned_department: r.assignedDepartment,
        created_at: r.createdAt.toISOString()
      };
      newIssue.ai_advice = this.calculateAiAdvice(newIssue);

      if (newIssue.reporter_uuid) {
        await this.awardPoints(newIssue.reporter_uuid, 10);
      }
      return newIssue;
    }
    try {
      const result = await db.insert(issues)
        .values({
          description: issueData.description,
          imageUrl: issueData.image_url,
          category: issueData.category,
          severity: issueData.severity,
          latitude: issueData.latitude,
          longitude: issueData.longitude,
          status: issueData.status,
          summary: issueData.summary,
          verificationCount: 0,
          flagCount: 0,
          reporterUuid: issueData.reporter_uuid,
          assignedDepartment: issueData.assigned_department,
        })
        .returning();

      const newIssue = this.mapRowToIssue(result[0]);

      if (newIssue.reporter_uuid) {
        await this.awardPoints(newIssue.reporter_uuid, 10);
      }

      return newIssue;
    } catch (error) {
      console.warn("PostgreSQL connection error in createIssue, switching to safe in-memory fallback:", error);
      this.useInMemoryFallback = true;
      return this.createIssue(issueData);
    }
  }

  async updateIssue(id: number, updates: Partial<Issue>): Promise<Issue | undefined> {
    if (this.useInMemoryFallback) {
      const r = this.inMemoryIssues.find(i => i.id === id);
      if (!r) return undefined;
      if (updates.description !== undefined) r.description = updates.description;
      if (updates.image_url !== undefined) r.imageUrl = updates.image_url;
      if (updates.category !== undefined) r.category = updates.category;
      if (updates.severity !== undefined) r.severity = updates.severity;
      if (updates.latitude !== undefined) r.latitude = updates.latitude;
      if (updates.longitude !== undefined) r.longitude = updates.longitude;
      if (updates.status !== undefined) r.status = updates.status;
      if (updates.summary !== undefined) r.summary = updates.summary;
      if (updates.verification_count !== undefined) r.verificationCount = updates.verification_count;
      if (updates.flag_count !== undefined) r.flagCount = updates.flag_count;
      if (updates.reporter_uuid !== undefined) r.reporterUuid = updates.reporter_uuid;
      if (updates.assigned_department !== undefined) r.assignedDepartment = updates.assigned_department;

      const issue: Issue = {
        id: r.id,
        description: r.description,
        image_url: r.imageUrl,
        category: r.category,
        severity: r.severity,
        latitude: r.latitude,
        longitude: r.longitude,
        status: r.status as any,
        summary: r.summary,
        verification_count: r.verificationCount,
        flag_count: r.flagCount,
        reporter_uuid: r.reporterUuid,
        assigned_department: r.assignedDepartment,
        created_at: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      };
      issue.ai_advice = this.calculateAiAdvice(issue);
      return issue;
    }
    try {
      const dbUpdates: any = {};
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.image_url !== undefined) dbUpdates.imageUrl = updates.image_url;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.severity !== undefined) dbUpdates.severity = updates.severity;
      if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
      if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.summary !== undefined) dbUpdates.summary = updates.summary;
      if (updates.verification_count !== undefined) dbUpdates.verificationCount = updates.verification_count;
      if (updates.flag_count !== undefined) dbUpdates.flagCount = updates.flag_count;
      if (updates.reporter_uuid !== undefined) dbUpdates.reporterUuid = updates.reporter_uuid;
      if (updates.assigned_department !== undefined) dbUpdates.assignedDepartment = updates.assigned_department;

      const result = await db.update(issues)
        .set(dbUpdates)
        .where(eq(issues.id, id))
        .returning();

      if (result.length === 0) return undefined;
      return this.mapRowToIssue(result[0]);
    } catch (error) {
      console.warn(`PostgreSQL connection error in updateIssue(${id}), switching to safe in-memory fallback:`, error);
      this.useInMemoryFallback = true;
      return this.updateIssue(id, updates);
    }
  }

  async verifyIssue(id: number, voterUuid: string): Promise<{ success: boolean; issue?: Issue; pointsAwarded?: boolean }> {
    try {
      const issueObj = await this.getIssueById(id);
      if (!issueObj) return { success: false };

      const newVerificationCount = issueObj.verification_count + 1;
      let newStatus = issueObj.status;
      if (newVerificationCount >= 10 && issueObj.status === 'reported') {
        newStatus = 'in_progress';
      }

      let pointsAwarded = false;
      if (issueObj.reporter_uuid && issueObj.reporter_uuid !== voterUuid) {
        const reporter = await this.getCitizenByUuid(issueObj.reporter_uuid);
        if (reporter) {
          await this.awardPoints(issueObj.reporter_uuid, 2);
          pointsAwarded = true;
        }
      }

      const updated = await this.updateIssue(id, {
        verification_count: newVerificationCount,
        status: newStatus
      });

      return {
        success: true,
        issue: updated,
        pointsAwarded
      };
    } catch (error) {
      console.error("Failed to verify issue:", error);
      throw new Error("Database transaction failed. Please try again later.", { cause: error });
    }
  }

  async adjustVote(
    id: number,
    voterUuid: string,
    oldVote: 'verify' | 'flag' | null,
    newVote: 'verify' | 'flag' | null
  ): Promise<{ success: boolean; issue?: Issue; pointsAwarded?: boolean }> {
    try {
      const issueObj = await this.getIssueById(id);
      if (!issueObj) return { success: false };

      let verificationCount = issueObj.verification_count;
      let flagCount = issueObj.flag_count;
      let pointsAwarded = false;

      // 1. Revert previous vote
      if (oldVote === 'verify') {
        verificationCount = Math.max(0, verificationCount - 1);
        if (issueObj.reporter_uuid && issueObj.reporter_uuid !== voterUuid) {
          const reporter = await this.getCitizenByUuid(issueObj.reporter_uuid);
          if (reporter) {
            await this.awardPoints(issueObj.reporter_uuid, -2);
          }
        }
      } else if (oldVote === 'flag') {
        flagCount = Math.max(0, flagCount - 1);
      }

      // 2. Apply new vote
      if (newVote === 'verify') {
        verificationCount += 1;
        if (issueObj.reporter_uuid && issueObj.reporter_uuid !== voterUuid) {
          const reporter = await this.getCitizenByUuid(issueObj.reporter_uuid);
          if (reporter) {
            await this.awardPoints(issueObj.reporter_uuid, 2);
            pointsAwarded = true;
          }
        }
      } else if (newVote === 'flag') {
        flagCount += 1;
      }

      // 3. Automated State Machine transitions based on updated counters
      let status = issueObj.status;
      if (status === 'reported' || status === 'ai recommended review' || status === 'in_progress') {
        if (verificationCount >= 10) {
          status = 'in_progress';
        } else if (flagCount >= 5) {
          status = 'ai recommended review';
        } else {
          status = 'reported';
        }
      }

      const updated = await this.updateIssue(id, {
        verification_count: verificationCount,
        flag_count: flagCount,
        status
      });

      return {
        success: true,
        issue: updated,
        pointsAwarded
      };
    } catch (error) {
      console.error("Failed to adjust vote:", error);
      throw new Error("Database transaction failed. Please try again later.", { cause: error });
    }
  }

  async flagIssue(id: number): Promise<Issue | undefined> {
    try {
      const issueObj = await this.getIssueById(id);
      if (!issueObj) return undefined;

      const newFlagCount = issueObj.flag_count + 1;
      let status = issueObj.status;
      if (newFlagCount >= 5 && issueObj.status === 'reported') {
        status = 'ai recommended review';
      }

      return await this.updateIssue(id, {
        flag_count: newFlagCount,
        status
      });
    } catch (error) {
      console.error("Failed to flag issue:", error);
      throw new Error("Database transaction failed. Please try again later.", { cause: error });
    }
  }

  // Dashboard Aggregations
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const issuesList = (await this.getIssues()).filter(i => i.status !== 'duplicate');
      const total_reports = issuesList.length;
      const open_reports = issuesList.filter(i => i.status !== 'community resolved').length;
      const resolved_reports = issuesList.filter(i => i.status === 'community resolved').length;

      let average_severity = "0.0";
      if (total_reports > 0) {
        const sum = issuesList.reduce((acc, curr) => acc + curr.severity, 0);
        average_severity = (sum / total_reports).toFixed(1);
      }

      const categories: Record<string, number> = {};
      issuesList.forEach(i => {
        categories[i.category] = (categories[i.category] || 0) + 1;
      });

      let top_category = "N/A";
      let maxCount = -1;
      Object.entries(categories).forEach(([cat, count]) => {
        if (count > maxCount) {
          maxCount = count;
          top_category = cat;
        }
      });

      return {
        total_reports,
        open_reports,
        resolved_reports,
        average_severity,
        top_category
      };
    } catch (error) {
      console.error("Failed to compile dashboard stats:", error);
      throw new Error("Database aggregation failed. Please try again later.", { cause: error });
    }
  }

  async getDashboardInsights(): Promise<CivicInsight[]> {
    try {
      const stats = await this.getDashboardStats();
      const issuesList = await this.getIssues();

      const insights: CivicInsight[] = [];

      // 1. Trend Insight
      if (stats.total_reports > 0) {
        insights.push({
          type: 'trend',
          title: 'Active Hotspots Identified',
          description: `Our GIS model detected concentrated reports in the '${stats.top_category}' category, accounting for ${Math.round((issuesList.filter(i => i.category === stats.top_category).length / Math.max(1, stats.total_reports)) * 100)}% of total issues.`,
          iconName: 'TrendingUp'
        });
      } else {
        insights.push({
          type: 'trend',
          title: 'Civic Activity Stable',
          description: 'No active hot spots detected. Community infrastructure report volumes are currently nominal.',
          iconName: 'Activity'
        });
      }

      // 2. Urgency Insight
      const highSeverity = issuesList.filter(i => i.severity >= 4 && i.status !== 'community resolved');
      if (highSeverity.length > 0) {
        insights.push({
          type: 'urgency',
          title: 'Critical Dispatches Required',
          description: `${highSeverity.length} highly severe issues (Severity 4+) are active. Dispatches to assigned departments are urgently queued.`,
          iconName: 'AlertTriangle'
        });
      } else {
        insights.push({
          type: 'urgency',
          title: 'Severity Levels Low',
          description: 'All current active issues are classified as moderate or low severity. Municipal service limits are stable.',
          iconName: 'ShieldAlert'
        });
      }

      // 3. Verification Insight
      const highlyVerified = issuesList.filter(i => i.verification_count >= 5 && i.status === 'reported');
      if (highlyVerified.length > 0) {
        insights.push({
          type: 'verification',
          title: 'Community Verification Spikes',
          description: `${highlyVerified.length} reports have high community alignment. These are fast-tracking toward automatic 'In Progress' status.`,
          iconName: 'CheckCircle'
        });
      } else {
        insights.push({
          type: 'verification',
          title: 'Sustained Citizen Consensus',
          description: 'Citizen verification streams are active. Community consensus checks are actively filtering out infrastructure duplicates.',
          iconName: 'Users'
        });
      }

      return insights;
    } catch (error) {
      console.error("Failed to compile dashboard insights:", error);
      throw new Error("Database aggregation failed. Please try again later.", { cause: error });
    }
  }

  private calculateAiAdvice(issue: Issue): { recommended_status: string; confidence: number; explanation: string } {
    const { status, verification_count, flag_count } = issue;

    if (status === 'processing') {
      return {
        recommended_status: 'reported',
        confidence: 95,
        explanation: 'AI model is compiling municipal classifications. Standby for standard routing.'
      };
    }

    if (status === 'reported') {
      if (flag_count >= 3) {
        return {
          recommended_status: 'ai recommended review',
          confidence: 90,
          explanation: 'Multiple community flags indicate a potential duplicate, invalid, or fake report.'
        };
      } else if (verification_count >= 5) {
        return {
          recommended_status: 'in_progress',
          confidence: 85,
          explanation: 'Growing community consensus verified. Dispatches highly recommended.'
        };
      } else {
        return {
          recommended_status: 'reported',
          confidence: 70,
          explanation: 'Awaiting more community verifications before municipal work order draft triggers.'
        };
      }
    }

    if (status === 'ai recommended review') {
      return {
        recommended_status: 'community resolved',
        confidence: 80,
        explanation: 'Flags exceed thresholds. Subject to administrative archive or manual deletion.'
      };
    }

    if (status === 'in_progress') {
      if (verification_count >= 15) {
        return {
          recommended_status: 'community resolved',
          confidence: 90,
          explanation: 'Sustained citizen engagement indicates issues have been fully resolved on-site.'
        };
      } else {
        return {
          recommended_status: 'in_progress',
          confidence: 75,
          explanation: 'Active municipal handover. Draft work order generated and ready to send.'
        };
      }
    }

    if (status === 'community resolved') {
      return {
        recommended_status: 'community resolved',
        confidence: 95,
        explanation: 'Successfully resolved and closed. Citizen rewards have been fully distributed.'
      };
    }

    if (status === 'duplicate') {
      return {
        recommended_status: 'community resolved',
        confidence: 99,
        explanation: 'Duplicate of an existing active issue. Archived to conserve city resources.'
      };
    }

    return {
      recommended_status: 'reported',
      confidence: 50,
      explanation: 'Continuous telemetry scan running.'
    };
  }
}

export const dbManager = new DBManager();
