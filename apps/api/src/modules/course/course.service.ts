import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parseJson, stringifyJson } from '../../common/utils/json';

const TURING_KEY = 'course.turing.active';
const TURING_BANK_KEY = 'course.turing.bank';
export const TURING_MAX_ANSWER_LEN = 15;
export const TURING_PENDING_COUNT = 3;
const CLASSROOM_KEY = 'course.classroom.active';
const CANCEL_SUB_KEY = 'course.cancel-sub.active';
const GROUP_GRAB_KEY = 'course.group-grab.active';
const GAME_PROGRESS_KEY = 'course.game-progress.active';
const SUMMARY_KEY = 'course.detective-summary.active';
const VIDEO_RECOGNITION_KEY = 'course.video-recognition.active';

const GROUP_EMOJIS = ['🕵️', '🌟', '🚀', '🎨', '🔍', '💡', '🎯', '👯', '🌈', '🦄'];

export interface TuringAnswer {
  id: string;
  text: string;
  isAI: boolean;
}
export interface TuringSession {
  id: string;
  question: string;
  answers: TuringAnswer[];
  createdAt: number;
  /** 来自哪道待定题 */
  slotId?: string;
}

export interface TuringPendingSlot {
  id: string;
  question: string;
  human1: string;
  human2: string;
  ai1: string;
  ai2: string;
}

export interface TuringQuestionBank {
  slots: TuringPendingSlot[];
  updatedAt: number;
}

const DEFAULT_TURING_BANK: TuringQuestionBank = {
  updatedAt: 0,
  slots: [
    { id: 'q1', question: '你最喜欢的一种动物是什么？', human1: '', human2: '', ai1: '', ai2: '' },
    { id: 'q2', question: '今天午餐吃了什么？', human1: '', human2: '', ai1: '', ai2: '' },
    { id: 'q3', question: '周末你最想做什么？', human1: '', human2: '', ai1: '', ai2: '' },
  ],
};

/**
 * 课程模式的现场对局数据（目前是图灵测试）。
 * 用通用的 SystemConfig 表做存储，老师写入、学生读取，无需新增数据表。
 *
 * 并发说明（单实例部署）：
 * - 所有「读-改-写」通过 runExclusive 按 key 串行，避免学生并发上报互相覆盖；
 * - GET 轮询走短 TTL 内存缓存，几十个客户端 3s 轮询不会把每次请求都打到数据库。
 */
@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

  /** key → 上一个未完成的写操作，形成串行链 */
  private readonly locks = new Map<string, Promise<unknown>>();
  /** key → 短 TTL 读缓存（写入/删除时同步更新，单实例内保证一致） */
  private readonly cache = new Map<string, { value: unknown; expires: number }>();
  private static readonly CACHE_TTL_MS = 1500;

  /** 同一 key 的读-改-写串行执行，防止并发上报丢数据 */
  private runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(key) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    this.locks.set(
      key,
      next.catch(() => undefined),
    );
    return next;
  }

  private async readState<T>(key: string, opts?: { fresh?: boolean }): Promise<T | null> {
    if (!opts?.fresh) {
      const hit = this.cache.get(key);
      if (hit && hit.expires > Date.now()) return hit.value as T | null;
    }
    const row = await this.prisma.systemConfig.findUnique({ where: { key } });
    const value = row?.value ? parseJson<T | null>(row.value, null) : null;
    this.cache.set(key, { value, expires: Date.now() + CourseService.CACHE_TTL_MS });
    return value;
  }

  private async writeState<T>(key: string, value: T): Promise<T> {
    const str = stringifyJson(value);
    await this.prisma.systemConfig.upsert({
      where: { key },
      create: { key, value: str },
      update: { value: str },
    });
    this.cache.set(key, { value, expires: Date.now() + CourseService.CACHE_TTL_MS });
    return value;
  }

  private async clearState(key: string): Promise<{ ok: true }> {
    await this.runExclusive(key, async () => {
      await this.prisma.systemConfig.deleteMany({ where: { key } });
      this.cache.set(key, { value: null, expires: Date.now() + CourseService.CACHE_TTL_MS });
    });
    return { ok: true };
  }

  // ---- 教师中控台聚合状态（一次轮询替代 5+ 个请求） ----

  async getConsoleState(games?: string[]): Promise<ConsoleState> {
    const [classroom, cancelSub, groupGrab, gameProgress, summary, videoRecognition] = await Promise.all([
      this.getClassroom(),
      this.getCancelSub(),
      this.getGroupGrab(),
      this.getGameProgress(games),
      this.getSummary(),
      this.getVideoRecognition(),
    ]);
    return { classroom, cancelSub, groupGrab, gameProgress, summary, videoRecognition, now: Date.now() };
  }

  async getTuring(): Promise<TuringSession | null> {
    return this.readState<TuringSession>(TURING_KEY);
  }

  async setTuring(input: { question: string; answers: TuringAnswer[]; slotId?: string }): Promise<TuringSession> {
    const answers = input.answers.map((a) => ({
      ...a,
      text: a.text.trim().slice(0, TURING_MAX_ANSWER_LEN),
    }));
    const session: TuringSession = {
      id: `t${Date.now()}`,
      question: input.question.trim(),
      answers,
      slotId: input.slotId,
      createdAt: Date.now(),
    };
    return this.runExclusive(TURING_KEY, () => this.writeState(TURING_KEY, session));
  }

  async clearTuring(): Promise<{ ok: true }> {
    return this.clearState(TURING_KEY);
  }

  async getTuringBank(): Promise<TuringQuestionBank> {
    const bank = await this.readState<TuringQuestionBank>(TURING_BANK_KEY);
    if (!bank?.slots?.length) return { ...DEFAULT_TURING_BANK, updatedAt: Date.now() };
    return this.normalizeTuringBank(bank);
  }

  async setTuringBank(slots: TuringPendingSlot[]): Promise<TuringQuestionBank> {
    if (slots.length !== TURING_PENDING_COUNT) {
      throw new BadRequestException(`请提供 ${TURING_PENDING_COUNT} 道待定题`);
    }
    const bank: TuringQuestionBank = {
      slots: slots.map((s, i) => this.normalizeTuringSlot(s, i)),
      updatedAt: Date.now(),
    };
    return this.runExclusive(TURING_BANK_KEY, () => this.writeState(TURING_BANK_KEY, bank));
  }

  async publishTuringFromSlot(slotId: string): Promise<TuringSession> {
    const bank = await this.getTuringBank();
    const slot = bank.slots.find((s) => s.id === slotId);
    if (!slot) throw new NotFoundException('找不到这道待定题');

    const { question, human1, human2, ai1, ai2 } = slot;
    if (!question.trim() || !human1.trim() || !human2.trim() || !ai1.trim() || !ai2.trim()) {
      throw new BadRequestException('请先填好问题、两个小朋友回答和两个 AI 回答');
    }

    const answers: TuringAnswer[] = this.shuffleTuringAnswers([
      { id: 'h1', text: human1, isAI: false },
      { id: 'h2', text: human2, isAI: false },
      { id: 'a1', text: ai1, isAI: true },
      { id: 'a2', text: ai2, isAI: true },
    ]);

    return this.setTuring({ question, answers, slotId });
  }

  private normalizeTuringBank(bank: TuringQuestionBank): TuringQuestionBank {
    const slots = DEFAULT_TURING_BANK.slots.map((def, i) => {
      const found = bank.slots.find((s) => s.id === def.id) ?? bank.slots[i];
      return this.normalizeTuringSlot(found ?? def, i);
    });
    return { slots, updatedAt: bank.updatedAt || Date.now() };
  }

  private normalizeTuringSlot(slot: TuringPendingSlot, index: number): TuringPendingSlot {
    const clip = (s: string) => s.trim().slice(0, TURING_MAX_ANSWER_LEN);
    return {
      id: slot.id || DEFAULT_TURING_BANK.slots[index]?.id || `q${index + 1}`,
      question: (slot.question || '').trim(),
      human1: clip(slot.human1 || ''),
      human2: clip(slot.human2 || ''),
      ai1: clip(slot.ai1 || ''),
      ai2: clip(slot.ai2 || ''),
    };
  }

  private shuffleTuringAnswers(answers: TuringAnswer[]): TuringAnswer[] {
    const a = [...answers];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---- 课堂控屏：老师推送当前游戏到学生屏幕 ----

  async getClassroom(): Promise<ClassroomState | null> {
    return this.readState<ClassroomState>(CLASSROOM_KEY);
  }

  async setClassroom(
    teacherId: string,
    patch: {
      active?: boolean;
      currentGame?: string | null;
      students?: string[];
      mode?: ClassroomMode;
      slides?: SlidesState | null;
      showcase?: ClassroomShowcase | null;
    },
  ): Promise<ClassroomState> {
    return this.runExclusive(CLASSROOM_KEY, async () => {
      const prev = await this.readState<ClassroomState>(CLASSROOM_KEY, { fresh: true });
      const now = Date.now();

      const clearingShowcase =
        patch.showcase === null ||
        patch.currentGame !== undefined ||
        patch.slides !== undefined ||
        patch.mode === 'game' ||
        patch.mode === 'slides';

      const showcase = patch.showcase !== undefined
        ? patch.showcase
        : clearingShowcase
          ? null
          : prev?.showcase ?? null;

      let mode: ClassroomMode;
      if (patch.showcase) {
        mode = 'showcase';
      } else if (patch.mode) {
        mode = patch.mode;
      } else if (patch.showcase === null) {
        mode = prev?.slides?.url ? 'slides' : 'game';
      } else if (patch.slides !== undefined && patch.slides) {
        mode = 'slides';
      } else if (patch.currentGame !== undefined) {
        mode = 'game';
      } else {
        mode = prev?.mode ?? 'game';
      }

      const next: ClassroomState = {
        active: patch.active ?? prev?.active ?? true,
        teacherId,
        currentGame: patch.currentGame !== undefined ? patch.currentGame : prev?.currentGame ?? null,
        students: patch.students !== undefined ? patch.students : prev?.students ?? [],
        mode,
        slides: patch.slides !== undefined ? patch.slides : prev?.slides ?? null,
        showcase,
        startedAt: prev?.startedAt ?? now,
        updatedAt: now,
      };
      return this.writeState(CLASSROOM_KEY, next);
    });
  }

  async clearClassroom(): Promise<{ ok: true }> {
    return this.clearState(CLASSROOM_KEY);
  }

  // ---- 「来取消续费吧」课堂游戏 ----

  async getCancelSub(): Promise<CancelSubSession | null> {
    return this.readState<CancelSubSession>(CANCEL_SUB_KEY);
  }

  async startCancelSub(teacherId: string): Promise<CancelSubSession> {
    const session: CancelSubSession = {
      id: `cs${Date.now()}`,
      teacherId,
      active: true,
      createdAt: Date.now(),
      records: {},
    };
    return this.runExclusive(CANCEL_SUB_KEY, () => this.writeState(CANCEL_SUB_KEY, session));
  }

  async reportCancelSubEvent(
    studentId: string,
    displayName: string,
    event: CancelSubEvent,
  ): Promise<CancelSubSession> {
    return this.runExclusive(CANCEL_SUB_KEY, async () => {
      const session = await this.readState<CancelSubSession>(CANCEL_SUB_KEY, { fresh: true });
      if (!session?.active) throw new BadRequestException('游戏未开始或已结束');

      const prev = session.records[studentId] ?? {
        studentId,
        displayName,
        page1Errors: 0,
        page2Errors: 0,
        completed: false,
        stage: 'page1' as CancelSubStage,
      };

      const next = { ...prev, displayName: displayName || prev.displayName };

      if (event === 'page1_wrong') {
        if (next.stage === 'page1') next.page1Errors += 1;
      } else if (event === 'page1_correct') {
        if (next.stage === 'page1') next.stage = 'page2';
      } else if (event === 'page2_wrong') {
        if (next.stage === 'page2') next.page2Errors += 1;
      } else if (event === 'page2_correct') {
        if (next.stage === 'page2') {
          next.stage = 'done';
          next.completed = true;
          next.completedAt = Date.now();
        }
      }

      session.records[studentId] = next;
      return this.writeState(CANCEL_SUB_KEY, session);
    });
  }

  async clearCancelSub(): Promise<{ ok: true }> {
    return this.clearState(CANCEL_SUB_KEY);
  }

  // ---- 第 1 课 · 抢组活动 ----

  async getGroupGrab(): Promise<GroupGrabSession | null> {
    return this.readState<GroupGrabSession>(GROUP_GRAB_KEY);
  }

  private async saveGroupGrab(session: GroupGrabSession): Promise<GroupGrabSession> {
    session.updatedAt = Date.now();
    return this.writeState(GROUP_GRAB_KEY, session);
  }

  async setupGroupGrab(
    teacherId: string,
    input: { classId?: string; groups: Array<{ name: string; capacity?: number; emoji?: string }> },
  ): Promise<GroupGrabSession> {
    const names = input.groups.map((g) => g.name.trim()).filter(Boolean);
    if (names.length < 2) throw new BadRequestException('请至少设置 2 个小组名称');
    if (new Set(names).size !== names.length) throw new BadRequestException('小组名称不能重复');

    const now = Date.now();
    const session: GroupGrabSession = {
      id: `gg${now}`,
      teacherId,
      classId: input.classId,
      active: false,
      phase: 'setup',
      groups: input.groups.map((g, i) => ({
        id: `slot${i + 1}`,
        name: g.name.trim(),
        emoji: g.emoji || GROUP_EMOJIS[i % GROUP_EMOJIS.length],
        capacity: Math.max(1, g.capacity ?? 6),
        members: [],
      })),
      createdAt: now,
      updatedAt: now,
    };
    return this.runExclusive(GROUP_GRAB_KEY, () => this.saveGroupGrab(session));
  }

  async startGroupGrab(): Promise<GroupGrabSession> {
    return this.runExclusive(GROUP_GRAB_KEY, async () => {
      const session = await this.readState<GroupGrabSession>(GROUP_GRAB_KEY, { fresh: true });
      if (!session) throw new NotFoundException('请先配置小组名称');
      session.active = true;
      session.phase = 'open';
      return this.saveGroupGrab(session);
    });
  }

  async grabGroup(studentId: string, displayName: string, groupId: string): Promise<GroupGrabSession> {
    // 全班同时点「抢位」是最典型的并发场景，必须串行化保证容量判断准确
    return this.runExclusive(GROUP_GRAB_KEY, async () => {
      const session = await this.readState<GroupGrabSession>(GROUP_GRAB_KEY, { fresh: true });
      if (!session?.active || session.phase !== 'open') {
        throw new BadRequestException('抢组还没开始或已结束');
      }

      const existing = this.findStudentGroup(session, studentId);
      if (existing) return session;

      const slot = session.groups.find((g) => g.id === groupId);
      if (!slot) throw new NotFoundException('找不到这个小组');

      if (slot.members.length >= slot.capacity) {
        throw new ConflictException('该组已满，请选其他小组');
      }

      slot.members.push({
        studentId,
        displayName: displayName || studentId,
        joinedAt: Date.now(),
        autoAssigned: false,
      });
      return this.saveGroupGrab(session);
    });
  }

  async reassignGroupGrab(studentIds?: string[]): Promise<GroupGrabSession> {
    return this.runExclusive(GROUP_GRAB_KEY, async () => {
      const session = await this.readState<GroupGrabSession>(GROUP_GRAB_KEY, { fresh: true });
      if (!session) throw new NotFoundException('抢组活动未配置');

      const targets = studentIds?.length
        ? studentIds
        : await this.resolveUnassignedStudentIds(session);

      const unassigned = targets.filter((id) => !this.findStudentGroup(session, id));
      if (unassigned.length === 0) return session;

      const users = await this.prisma.user.findMany({
        where: { id: { in: unassigned } },
        select: { id: true, displayName: true, username: true },
      });
      const nameMap = Object.fromEntries(
        users.map((u) => [u.id, u.displayName || u.username || u.id]),
      );

      for (const studentId of unassigned) {
        const slot = session.groups
          .filter((g) => g.members.length < g.capacity)
          .sort((a, b) => a.members.length - b.members.length)[0];
        if (!slot) break;
        slot.members.push({
          studentId,
          displayName: nameMap[studentId] || studentId,
          joinedAt: Date.now(),
          autoAssigned: true,
        });
      }

      return this.saveGroupGrab(session);
    });
  }

  async manualAssignGroupGrab(studentId: string, groupId: string, displayName?: string): Promise<GroupGrabSession> {
    return this.runExclusive(GROUP_GRAB_KEY, async () => {
      const session = await this.readState<GroupGrabSession>(GROUP_GRAB_KEY, { fresh: true });
      if (!session) throw new NotFoundException('抢组活动未配置');

      const slot = session.groups.find((g) => g.id === groupId);
      if (!slot) throw new NotFoundException('找不到这个小组');

      for (const g of session.groups) {
        g.members = g.members.filter((m) => m.studentId !== studentId);
      }

      if (slot.members.length >= slot.capacity) {
        throw new ConflictException('该组已满');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: studentId },
        select: { displayName: true, username: true },
      });

      slot.members.push({
        studentId,
        displayName: displayName || user?.displayName || user?.username || studentId,
        joinedAt: Date.now(),
        autoAssigned: true,
      });
      return this.saveGroupGrab(session);
    });
  }

  async closeGroupGrab(): Promise<GroupGrabSession> {
    return this.runExclusive(GROUP_GRAB_KEY, async () => {
      const session = await this.readState<GroupGrabSession>(GROUP_GRAB_KEY, { fresh: true });
      if (!session) throw new NotFoundException('抢组活动未配置');
      session.active = false;
      session.phase = 'closed';
      return this.saveGroupGrab(session);
    });
  }

  async syncGroupGrabToDb(): Promise<{ ok: true; groupIds: string[] }> {
    const session = await this.getGroupGrab();
    if (!session?.classId) throw new BadRequestException('请先选择班级后再同步到小组管理');

    const groupIds: string[] = [];
    for (const slot of session.groups) {
      let group = await this.prisma.group.findFirst({
        where: { classId: session.classId, name: slot.name },
      });
      if (!group) {
        group = await this.prisma.group.create({
          data: { classId: session.classId, name: slot.name, description: `第1课抢组 · ${slot.emoji}` },
        });
      }
      groupIds.push(group.id);

      await this.prisma.groupMember.deleteMany({ where: { groupId: group.id } });
      for (const m of slot.members) {
        await this.prisma.groupMember.upsert({
          where: { groupId_userId: { groupId: group.id, userId: m.studentId } },
          create: { groupId: group.id, userId: m.studentId },
          update: {},
        });
      }
    }
    return { ok: true, groupIds };
  }

  async clearGroupGrab(): Promise<{ ok: true }> {
    return this.clearState(GROUP_GRAB_KEY);
  }

  private findStudentGroup(session: GroupGrabSession, studentId: string): GroupGrabSlot | undefined {
    return session.groups.find((g) => g.members.some((m) => m.studentId === studentId));
  }

  private async resolveUnassignedStudentIds(session: GroupGrabSession): Promise<string[]> {
    const classroom = await this.getClassroom();
    let studentIds: string[];

    if (classroom?.active && classroom.students.length > 0) {
      studentIds = classroom.students;
    } else if (session.classId) {
      const members = await this.prisma.classMember.findMany({
        where: { classId: session.classId },
        select: { userId: true },
      });
      studentIds = members.map((m) => m.userId);
    } else {
      const students = await this.prisma.user.findMany({
        where: { role: 'student' },
        select: { id: true },
      });
      studentIds = students.map((s) => s.id);
    }

    const assigned = new Set(
      session.groups.flatMap((g) => g.members.map((m) => m.studentId)),
    );
    return studentIds.filter((id) => !assigned.has(id));
  }

  // ---- 课堂创作游戏进度（生图 / 装修 / 生视频） ----

  /** 支持单个 slug 或多个 slug（教师聚合面板一次取回多个游戏的进度） */
  async getGameProgress(gameSlug?: string | string[]): Promise<GameProgressSession | null> {
    const session = await this.readState<GameProgressSession>(GAME_PROGRESS_KEY);
    if (!session) return null;
    const slugs = (Array.isArray(gameSlug) ? gameSlug : gameSlug ? [gameSlug] : []).filter(Boolean);
    if (slugs.length === 0) return session;
    const wanted = new Set(slugs);
    const records: Record<string, GameProgressRecord> = {};
    for (const [key, rec] of Object.entries(session.records || {})) {
      if (wanted.has(rec.gameSlug)) records[key] = rec;
    }
    return { ...session, records };
  }

  async reportGameProgress(
    studentId: string,
    displayName: string,
    input: GameProgressReportInput,
  ): Promise<GameProgressSession> {
    // 学生并发上报最频繁的写路径：串行化避免整包 JSON 互相覆盖丢记录
    return this.runExclusive(GAME_PROGRESS_KEY, async () => {
      const prev =
        (await this.readState<GameProgressSession>(GAME_PROGRESS_KEY, { fresh: true }))
        ?? this.emptyGameProgressSession();
      const key = `${studentId}:${input.gameSlug}`;
      const prevRecord = prev.records[key];
      const items = this.mergeGameProgressItems(prevRecord, input);
      const record: GameProgressRecord = {
        studentId,
        displayName: displayName || studentId,
        gameSlug: input.gameSlug,
        status: input.status,
        title: input.title?.slice(0, 100),
        text: input.text?.slice(0, 3000),
        prompt: input.prompt?.slice(0, 500),
        imageUrls: input.imageUrls?.slice(0, 12),
        videoUrl: input.videoUrl,
        thumbnailUrl: input.thumbnailUrl || input.imageUrls?.[0] || input.videoUrl,
        items,
        roundCount: input.roundCount ?? (items && items.length > 0 ? items.length : prevRecord?.roundCount),
        summary: input.summary?.slice(0, 200),
        error: input.error?.slice(0, 300),
        themeId: input.themeId,
        themes: input.themes
          ? { ...(prevRecord?.themes || {}), ...input.themes }
          : prevRecord?.themes,
        updatedAt: Date.now(),
      };
      prev.records[key] = record;
      prev.active = true;
      return this.saveGameProgress(prev);
    });
  }

  async resetGameProgress(gameSlug?: string): Promise<GameProgressSession> {
    return this.runExclusive(GAME_PROGRESS_KEY, async () => {
      const prev = await this.readState<GameProgressSession>(GAME_PROGRESS_KEY, { fresh: true });
      if (!prev || !gameSlug) return this.saveGameProgress(this.emptyGameProgressSession());

      const records: Record<string, GameProgressRecord> = {};
      for (const [key, rec] of Object.entries(prev.records || {})) {
        if (rec.gameSlug !== gameSlug) records[key] = rec;
      }
      return this.saveGameProgress({ ...prev, records, updatedAt: Date.now() });
    });
  }

  async clearGameProgress(): Promise<{ ok: true }> {
    return this.clearState(GAME_PROGRESS_KEY);
  }

  /** 合并学生在同一环节多次创作的作品历史（最多保留 20 条） */
  private mergeGameProgressItems(
    prevRecord: GameProgressRecord | undefined,
    input: GameProgressReportInput,
  ): GameProgressItem[] | undefined {
    if (input.items?.length) return input.items.slice(0, 20);

    const prev = [...(prevRecord?.items || [])];

    if (input.status !== 'done') {
      return prev.length > 0 ? prev : undefined;
    }

    const urls = [
      ...(input.imageUrls || []),
      ...(input.videoUrl ? [input.videoUrl] : []),
      ...(input.thumbnailUrl && !input.imageUrls?.length && !input.videoUrl ? [input.thumbnailUrl] : []),
    ];

    for (const url of urls) {
      if (!url || prev.some((item) => item.url === url)) continue;
      prev.push({
        url,
        prompt: input.prompt?.slice(0, 500),
        label: `第 ${prev.length + 1} 件`,
        status: 'done',
      });
    }

    if (urls.length === 0 && input.text?.trim()) {
      const textSig = input.text.trim().slice(0, 120);
      const dup = prev.some((item) => !item.url && item.prompt === textSig);
      if (!dup) {
        prev.push({
          prompt: textSig,
          label: input.title?.slice(0, 100) || `第 ${prev.length + 1} 件`,
          status: 'done',
        });
      }
    }

    return prev.length > 0 ? prev.slice(-20) : undefined;
  }

  private emptyGameProgressSession(): GameProgressSession {
    const now = Date.now();
    return { id: `gp${now}`, active: true, createdAt: now, updatedAt: now, records: {} };
  }

  private async saveGameProgress(session: GameProgressSession): Promise<GameProgressSession> {
    session.updatedAt = Date.now();
    return this.writeState(GAME_PROGRESS_KEY, session);
  }

  // ---- 大侦探总结分享 · 问答 ----

  async getSummary(): Promise<SummarySession | null> {
    return this.readState<SummarySession>(SUMMARY_KEY);
  }

  async reportSummaryAnswers(
    studentId: string,
    displayName: string,
    answers: SummaryAnswerInput[],
    done?: boolean,
  ): Promise<SummarySession> {
    return this.runExclusive(SUMMARY_KEY, async () => {
      const session =
        (await this.readState<SummarySession>(SUMMARY_KEY, { fresh: true }))
        ?? this.emptySummarySession();
      const prev = session.records[studentId];
      const record: SummaryStudentRecord = {
        studentId,
        displayName: displayName || prev?.displayName || studentId,
        answers: {},
        done: !!done,
        updatedAt: Date.now(),
      };
      for (const a of answers) {
        if (!a.questionId) continue;
        record.answers[a.questionId] = {
          optionId: a.optionId,
          optionLabel: a.optionLabel?.slice(0, 100),
          text: a.text?.slice(0, 500),
        };
      }
      session.records[studentId] = record;
      session.active = true;
      return this.saveSummary(session);
    });
  }

  async resetSummary(): Promise<SummarySession> {
    return this.runExclusive(SUMMARY_KEY, () => this.saveSummary(this.emptySummarySession()));
  }

  async clearSummary(): Promise<{ ok: true }> {
    return this.clearState(SUMMARY_KEY);
  }

  private emptySummarySession(): SummarySession {
    const now = Date.now();
    return { id: `sum${now}`, active: true, createdAt: now, updatedAt: now, records: {} };
  }

  private async saveSummary(session: SummarySession): Promise<SummarySession> {
    session.updatedAt = Date.now();
    return this.writeState(SUMMARY_KEY, session);
  }

  // ---- AI 视频识别 · 课堂问答 ----

  async getVideoRecognition(): Promise<VideoRecognitionSession | null> {
    return this.readState<VideoRecognitionSession>(VIDEO_RECOGNITION_KEY);
  }

  async reportVideoRecognitionAnswers(
    studentId: string,
    displayName: string,
    answers: VideoRecognitionAnswerInput[],
    done?: boolean,
  ): Promise<VideoRecognitionSession> {
    return this.runExclusive(VIDEO_RECOGNITION_KEY, async () => {
      const session =
        (await this.readState<VideoRecognitionSession>(VIDEO_RECOGNITION_KEY, { fresh: true }))
        ?? this.emptyVideoRecognitionSession();
      const prev = session.records[studentId];
      const record: VideoRecognitionStudentRecord = {
        studentId,
        displayName: displayName || prev?.displayName || studentId,
        answers: { ...(prev?.answers || {}) },
        done: !!done,
        updatedAt: Date.now(),
      };
      for (const a of answers) {
        if (!a.questionId) continue;
        record.answers[a.questionId] = {
          optionId: a.optionId,
          optionLabel: a.optionLabel?.slice(0, 100),
        };
      }
      session.records[studentId] = record;
      session.active = true;
      return this.saveVideoRecognition(session);
    });
  }

  async setVideoRecognitionCurrentQuestion(question: number): Promise<VideoRecognitionSession> {
    return this.runExclusive(VIDEO_RECOGNITION_KEY, async () => {
      const session =
        (await this.readState<VideoRecognitionSession>(VIDEO_RECOGNITION_KEY, { fresh: true }))
        ?? this.emptyVideoRecognitionSession();
      session.currentQuestion = Math.max(1, Math.min(10, Math.floor(question)));
      return this.saveVideoRecognition(session);
    });
  }

  async resetVideoRecognition(): Promise<VideoRecognitionSession> {
    return this.runExclusive(VIDEO_RECOGNITION_KEY, () => this.saveVideoRecognition(this.emptyVideoRecognitionSession()));
  }

  async clearVideoRecognition(): Promise<{ ok: true }> {
    return this.clearState(VIDEO_RECOGNITION_KEY);
  }

  private emptyVideoRecognitionSession(): VideoRecognitionSession {
    const now = Date.now();
    return { id: `vr${now}`, active: true, currentQuestion: 1, createdAt: now, updatedAt: now, records: {} };
  }

  private async saveVideoRecognition(session: VideoRecognitionSession): Promise<VideoRecognitionSession> {
    session.updatedAt = Date.now();
    return this.writeState(VIDEO_RECOGNITION_KEY, session);
  }

  // ---- 游戏草稿（学生端跨主题 / 刷新恢复） ----

  private gameDraftKey(userId: string, gameSlug: string) {
    return `game.draft.${userId}.${gameSlug}`;
  }

  async getGameDraft(userId: string, gameSlug: string): Promise<GameDraft | null> {
    return this.readState<GameDraft>(this.gameDraftKey(userId, gameSlug));
  }

  async saveGameDraft(userId: string, gameSlug: string, input: SaveGameDraftInput): Promise<GameDraft> {
    const key = this.gameDraftKey(userId, gameSlug);
    return this.runExclusive(key, async () => {
      const prev =
        (await this.readState<GameDraft>(key, { fresh: true }))
        ?? this.emptyGameDraft();
      if (input.themes) {
        prev.themes = { ...prev.themes, ...input.themes };
      }
      if (input.themeId && input.theme) {
        prev.themes[input.themeId] = input.theme;
      }
      if (input.activeThemeId) prev.activeThemeId = input.activeThemeId;
      prev.updatedAt = Date.now();
      return this.writeState(key, prev);
    });
  }

  private emptyGameDraft(): GameDraft {
    return { version: 1, themes: {}, activeThemeId: 'nailong', updatedAt: Date.now() };
  }
}

/** 教师中控台一次轮询取回的聚合状态 */
export interface ConsoleState {
  classroom: ClassroomState | null;
  cancelSub: CancelSubSession | null;
  groupGrab: GroupGrabSession | null;
  gameProgress: GameProgressSession | null;
  summary: SummarySession | null;
  videoRecognition: VideoRecognitionSession | null;
  now: number;
}

/** 单个主题的装修草稿 */
export interface DecorateRoomThemeDraft {
  nodes: Array<{ id: string; parentId: string | null; request: string; url: string }>;
  currentId: string;
  savedAssetId?: string | null;
  nodeSeq?: number;
}

export interface GameDraft {
  version: 1;
  themes: Record<string, DecorateRoomThemeDraft>;
  activeThemeId: string;
  updatedAt: number;
}

export interface SaveGameDraftInput {
  themeId?: string;
  theme?: DecorateRoomThemeDraft;
  themes?: Record<string, DecorateRoomThemeDraft>;
  activeThemeId?: string;
}

export type ClassroomMode = 'game' | 'slides' | 'showcase';

export interface ClassroomShowcase {
  studentId: string;
  displayName: string;
  gameSlug?: string;
  gameTitle?: string;
  title?: string;
  prompt?: string;
  imageUrls?: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
  text?: string;
  summary?: string;
  source: 'game-progress' | 'summary';
  pushedAt: number;
}

export interface SlidesState {
  url: string;
  name: string;
  page: number;
  /** pdf = 上传的 PDF；deck = 内置互动 HTML 课件 */
  kind?: 'pdf' | 'deck';
}

export interface ClassroomState {
  active: boolean;
  teacherId: string;
  /** 当前模式：游戏 / 课件播放 */
  mode: ClassroomMode;
  /** 当前推送给学生的游戏 slug；null = 课程大厅 */
  currentGame: string | null;
  /** 当前播放的课件（PDF）及页码 */
  slides: SlidesState | null;
  /** 老师推送给全班展示的优秀作品（邀请同学分享） */
  showcase: ClassroomShowcase | null;
  /** 参与的学生 id 列表；空数组 = 所有学生 */
  students: string[];
  startedAt: number;
  updatedAt: number;
}

export type CancelSubStage = 'page1' | 'page2' | 'done';
export type CancelSubEvent = 'page1_wrong' | 'page1_correct' | 'page2_wrong' | 'page2_correct';

export interface CancelSubStudentRecord {
  studentId: string;
  displayName: string;
  page1Errors: number;
  page2Errors: number;
  completed: boolean;
  completedAt?: number;
  stage: CancelSubStage;
}

export interface CancelSubSession {
  id: string;
  teacherId: string;
  active: boolean;
  createdAt: number;
  records: Record<string, CancelSubStudentRecord>;
}

export type GroupGrabPhase = 'setup' | 'open' | 'closed';

export interface GroupGrabMember {
  studentId: string;
  displayName: string;
  joinedAt: number;
  autoAssigned?: boolean;
}

export interface GroupGrabSlot {
  id: string;
  name: string;
  emoji: string;
  capacity: number;
  members: GroupGrabMember[];
}

export interface GroupGrabSession {
  id: string;
  teacherId: string;
  classId?: string;
  active: boolean;
  phase: GroupGrabPhase;
  groups: GroupGrabSlot[];
  createdAt: number;
  updatedAt: number;
}

export type GameProgressStatus = 'idle' | 'generating' | 'done' | 'failed';

export interface GameProgressItem {
  url?: string;
  prompt?: string;
  label?: string;
  status?: string;
}

export interface DecorateRoomThemeProgress {
  themeId: string;
  status: GameProgressStatus;
  prompt?: string;
  imageUrls?: string[];
  thumbnailUrl?: string;
  items?: GameProgressItem[];
  roundCount?: number;
  summary?: string;
  error?: string;
}

export interface GameProgressRecord {
  studentId: string;
  displayName: string;
  gameSlug: string;
  status: GameProgressStatus;
  title?: string;
  text?: string;
  prompt?: string;
  imageUrls?: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
  items?: GameProgressItem[];
  roundCount?: number;
  summary?: string;
  error?: string;
  themeId?: string;
  themes?: Record<string, DecorateRoomThemeProgress>;
  updatedAt: number;
}

export interface GameProgressSession {
  id: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  records: Record<string, GameProgressRecord>;
}

export interface GameProgressReportInput {
  gameSlug: string;
  status: GameProgressStatus;
  title?: string;
  text?: string;
  prompt?: string;
  imageUrls?: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
  items?: GameProgressItem[];
  roundCount?: number;
  summary?: string;
  error?: string;
  themeId?: string;
  themes?: Record<string, DecorateRoomThemeProgress>;
}

// ---- 大侦探总结分享 ----

export interface SummaryAnswerInput {
  questionId: string;
  optionId?: string;
  optionLabel?: string;
  text?: string;
}

export interface SummaryAnswerRecord {
  optionId?: string;
  optionLabel?: string;
  text?: string;
}

export interface SummaryStudentRecord {
  studentId: string;
  displayName: string;
  answers: Record<string, SummaryAnswerRecord>;
  done: boolean;
  updatedAt: number;
}

export interface SummarySession {
  id: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  records: Record<string, SummaryStudentRecord>;
}

// ---- AI 视频识别 ----

export interface VideoRecognitionAnswerInput {
  questionId: string;
  optionId?: string;
  optionLabel?: string;
}

export interface VideoRecognitionAnswerRecord {
  optionId?: string;
  optionLabel?: string;
}

export interface VideoRecognitionStudentRecord {
  studentId: string;
  displayName: string;
  answers: Record<string, VideoRecognitionAnswerRecord>;
  done: boolean;
  updatedAt: number;
}

export interface VideoRecognitionSession {
  id: string;
  active: boolean;
  currentQuestion: number;
  createdAt: number;
  updatedAt: number;
  records: Record<string, VideoRecognitionStudentRecord>;
}
