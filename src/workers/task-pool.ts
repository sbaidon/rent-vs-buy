export class TaskPool<Input, Output> {
  private poolSize: number;
  private queue: Array<{
    data: Input;
    resolve: (value: Output) => void;
    reject: (reason: any) => void;
    index: number;
  } | null> = [];
  private activeCount = 0;
  private abortController: AbortController;
  private activeTasks = new Set<number>();

  constructor(poolSize: number) {
    this.poolSize = poolSize;
    this.abortController = new AbortController();
  }

  private async processTask(
    taskIndex: number,
    processor: (input: Input, signal: AbortSignal) => Output
  ) {
    const task = this.queue[taskIndex];
    if (!task) return;

    try {
      const result = await processor(task.data, this.abortController.signal);
      if (!this.abortController.signal.aborted) {
        task.resolve(result);
      }
    } catch (error) {
      task.reject(error);
    } finally {
      this.activeCount--;
      this.activeTasks.delete(taskIndex);
      this.queue[taskIndex] = null;
      this.processNextTask(processor);
    }
  }

  private processNextTask(
    processor: (input: Input, signal: AbortSignal) => Output
  ) {
    if (this.abortController.signal.aborted) return;

    // Find next available task
    const nextTaskIndex = this.queue.findIndex(
      (task, index) => task !== null && !this.activeTasks.has(index)
    );

    if (nextTaskIndex >= 0 && this.activeCount < this.poolSize) {
      this.activeCount++;
      this.activeTasks.add(nextTaskIndex);
      this.processTask(nextTaskIndex, processor);
    }
  }

  execute(
    data: Input,
    processor: (input: Input, signal: AbortSignal) => Output
  ): Promise<Output> {
    if (this.abortController.signal.aborted) {
      return Promise.reject(new Error("TaskPool has been terminated"));
    }

    return new Promise((resolve, reject) => {
      const taskIndex = this.queue.length;
      const task = { data, resolve, reject, index: taskIndex };
      this.queue.push(task);

      if (this.activeCount < this.poolSize) {
        this.activeCount++;
        this.activeTasks.add(taskIndex);
        this.processTask(taskIndex, processor);
      }
    });
  }

  terminate() {
    this.abortController.abort();
    this.queue = [];
    this.activeCount = 0;
    this.activeTasks.clear();
    this.abortController = new AbortController();
  }
}
