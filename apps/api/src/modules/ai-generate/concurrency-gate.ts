/**
 * 进程内并发闸门：限制同一时刻允许"占用外部 AI 服务名额"的任务数量。
 *
 * 背景：火山方舟等供应商对图片/视频模型有账号级的并发数上限（例如视频常见 5~10 个并发任务）。
 * 一个教室里 30 个学生几乎同一时间提交时，如果全部直接转发给供应商，超出的部分会直接收到
 * 429 / 并发超限报错。这个闸门把超出上限的请求放进先进先出的本地排队队列，等前面的任务
 * 释放名额后再继续，从而把"报错"变成"排队等待"。
 */
export class ConcurrencyGate {
  private running = 0;
  private readonly waiters: Array<{ jobId: string; resolve: () => void }> = [];

  constructor(private readonly limit: number) {}

  /** 尝试立即占用一个名额；成功返回 true（调用方无需排队，可直接执行）。 */
  tryAcquire(): boolean {
    if (this.running < this.limit) {
      this.running += 1;
      return true;
    }
    return false;
  }

  /**
   * 名额已满时调用：把 jobId 加入排队队列。
   * 返回排在它前面、还未拿到名额的任务数（0 表示排在队首，名额一空出就是它）；
   * 以及一个 Promise，在轮到它、名额被预留后 resolve。
   */
  enqueue(jobId: string): { position: number; wait: Promise<void> } {
    let resolveFn!: () => void;
    const wait = new Promise<void>((resolve) => {
      resolveFn = resolve;
    });
    this.waiters.push({
      jobId,
      resolve: () => {
        this.running += 1;
        resolveFn();
      },
    });
    return { position: this.waiters.length - 1, wait };
  }

  /** 释放一个名额；如果有人在排队，自动把名额交给队首的下一个任务。 */
  release(): void {
    this.running = Math.max(0, this.running - 1);
    const next = this.waiters.shift();
    if (next) next.resolve();
  }

  /** 从本地排队队列中移除任务（用户取消排队时）；成功移除返回 true。 */
  remove(jobId: string): boolean {
    const idx = this.waiters.findIndex((w) => w.jobId === jobId);
    if (idx === -1) return false;
    this.waiters.splice(idx, 1);
    return true;
  }

  /** 实时查询某个仍在排队中的任务前面还有多少人；查不到（已开始执行/未排队）返回 null。 */
  positionOf(jobId: string): number | null {
    const idx = this.waiters.findIndex((w) => w.jobId === jobId);
    return idx === -1 ? null : idx;
  }

  get runningCount(): number {
    return this.running;
  }

  get waitingCount(): number {
    return this.waiters.length;
  }
}

/** 读取正整数环境变量，非法或缺省时回退到默认值。 */
export function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
