import  {
    WorkerOptions
}  from 'worker_threads';
import { cpus } from 'os';
import {
    NcpuWorker
} from './index';

export interface NcpuWorkerPoolOptions {
    /**
     * 最大工作线程数，默认为 CPU 核心数
     */
    maxWorkers?: number;
    /**
     * 单个任务超时时间（毫秒），默认无超时
     */
    timeout?: number;
    /**
     * Worker 线程的额外选项
     */
    workerOptions?: WorkerOptions;
    /**
     * 任务最大重试次数，默认0次（不重试）
     */
    maxRetries?: number;
    /**
     * 空闲时间（毫秒）后自动终止线程池，默认3000ms
     */
    autoTerminateTimeout?: number;
    /**
     * 健康检查间隔（毫秒），如果提供则启动健康检查
     */
    healthCheckInterval?: number;
    /**
     * 重试任务时使用的延迟策略，默认为指数退避
     * 'none': 立即重试
     * 'fixed': 固定延迟
     * 'exponential': 指数退避
     */
    retryDelayStrategy?: 'none' | 'fixed' | 'exponential';
    /**
     * 重试延迟基础时间（毫秒），默认100ms
     */
    retryDelayBase?: number;
}

interface WorkerTask<T = any> {
    func: Function;
    params: Array<any>;
    resolve: (value: T) => void;
    reject: (reason: any) => void;
    timeoutId?: NodeJS.Timeout;
    assignedWorker?: NcpuWorker; // 跟踪分配给任务的工作线程
    retries: number; // 任务已重试次数
    error?: Error; // 最后一次执行的错误
    createdAt: number; // 任务创建时间戳
    retryDelayTimer?: NodeJS.Timeout; // 重试延迟定时器
}

export class NcpuWorkerPool {
    private workers: NcpuWorker[] = [];
    private idleWorkers: NcpuWorker[] = [];
    private taskQueue: WorkerTask[] = [];
    private maxWorkers: number;
    private timeout: number | null;
    private workerOptions: WorkerOptions | undefined;
    private isTerminated: boolean = false;
    private autoTerminateTimeout: number = 3000; // 空闲3秒后自动终止线程
    private terminateTimer: NodeJS.Timeout | null = null;
    private maxRetries: number = 0; // 任务最大重试次数，默认0次
    private healthCheckTimer: NodeJS.Timeout | null = null; // 健康检查定时器
    private retryDelayStrategy: 'none' | 'fixed' | 'exponential' = 'exponential'; // 重试延迟策略
    private retryDelayBase: number = 100; // 重试延迟基础时间（毫秒）

    /**
     * 创建一个 NcpuWorkerPool 实例
     * @param options 线程池配置选项
     */
    constructor(options?: NcpuWorkerPoolOptions) {
        this.maxWorkers = options?.maxWorkers || cpus().length;
        this.timeout = options?.timeout || null;
        this.workerOptions = options?.workerOptions;
        this.maxRetries = options?.maxRetries || 0;
        this.autoTerminateTimeout = options?.autoTerminateTimeout || 3000;
        this.retryDelayStrategy = options?.retryDelayStrategy || 'exponential';
        this.retryDelayBase = options?.retryDelayBase || 100;
        
        // 如果配置了健康检查间隔，启动健康检查
        if (options?.healthCheckInterval) {
            this.startHealthCheck(options.healthCheckInterval);
        }
    }

    /**
     * 执行任务
     * @param func 要执行的函数
     * @param params 函数参数
     * @returns Promise 包含函数执行结果
     */
    public run<T = any>(func: Function, params: Array<any>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const task: WorkerTask<T> = { 
                func, 
                params, 
                resolve, 
                reject,
                retries: 0, // 初始化重试次数
                createdAt: Date.now() // 记录任务创建时间
            };
            
            // 如果设置了超时时间，创建超时处理
            if (this.timeout) {
                task.timeoutId = setTimeout(() => {
                    // 从队列中移除任务
                    const index = this.taskQueue.indexOf(task);
                    if (index !== -1) {
                        this.taskQueue.splice(index, 1);
                    } else if (task.assignedWorker) {
                        // 任务已经在执行中，需要中止对应的工作线程
                        this.terminateWorker(task.assignedWorker);
                    }
                    reject(new Error(`Task execution timed out after ${this.timeout}ms`));
                }, this.timeout);
            }

            // 将任务添加到队列
            this.taskQueue.push(task);
            
            // 如果线程池已终止，重新初始化
            if (this.isTerminated) {
                this.isTerminated = false;
            }
            
            // 取消自动终止计时器（如果存在）
            if (this.terminateTimer) {
                clearTimeout(this.terminateTimer);
                this.terminateTimer = null;
            }
            
            // 尝试处理队列中的任务
            this.processQueue();
        });
    }

    /**
     * 处理任务队列
     */
    private processQueue(): void {
        // 如果没有待处理的任务，直接返回
        if (this.taskQueue.length === 0) {
            return;
        }

        // 如果有空闲的工作线程，使用它
        if (this.idleWorkers.length > 0) {
            const worker = this.idleWorkers.pop()!;
            const task = this.taskQueue.shift()!;
            this.executeTask(worker, task);
        }
        // 如果可以创建新的工作线程，创建它
        else if (this.workers.length < this.maxWorkers) {
            const worker = new NcpuWorker({workerOptions: this.workerOptions});
            this.workers.push(worker);
            const task = this.taskQueue.shift()!;
            this.executeTask(worker, task);
        }
        // 否则任务将保留在队列中等待工作线程变为可用
    }

    /**
     * 在工作线程上执行任务
     * @param worker 工作线程
     * @param task 任务
     */
    private executeTask(worker: NcpuWorker, task: WorkerTask): void {
        // 记录任务分配的工作线程
        task.assignedWorker = worker;
        
        // 不要清除超时定时器，让它继续计时以便能够中止长时间运行的任务

        worker.run(task.func, task.params)
            .then((result) => {
                // 清除超时定时器（如果有）
                if (task.timeoutId) {
                    clearTimeout(task.timeoutId);
                }
                task.resolve(result);
                // 将工作线程标记为空闲
                this.idleWorkers.push(worker);
                
                // 如果没有待处理的任务，启动自动终止计时器
                if (this.taskQueue.length === 0) {
                    this.scheduleAutoTerminate();
                }
                
                // 处理下一个任务
                this.processQueue();
            })
            .catch((error) => {
                // 清除超时定时器（如果有）
                if (task.timeoutId) {
                    clearTimeout(task.timeoutId);
                }
                
                // 记录错误
                task.error = error;
                
                // 检查是否可以重试任务
                if (task.retries < this.maxRetries) {
                    task.retries++;
                    
                    // 判断是否是worker相关的错误
                    const isWorkerError = error instanceof Error && (
                        error.message.includes('Worker') || 
                        error.message.includes('thread') || 
                        error.message.includes('terminated') ||
                        error.message.includes('execution') ||
                        error.name === 'AbortError'
                    );
                    
                    // 无论什么错误，都替换worker，避免同一个worker反复执行同一个失败的任务
                    this.terminateWorker(worker);
                    
                    // 根据重试策略计算延迟时间
                    let delayTime = 0;
                    if (this.retryDelayStrategy === 'none') {
                        delayTime = 0;
                    } else if (this.retryDelayStrategy === 'fixed') {
                        delayTime = this.retryDelayBase;
                    } else if (this.retryDelayStrategy === 'exponential') {
                        // 指数退避策略: 基础时间 * 2^(重试次数-1)，最大不超过30秒
                        delayTime = Math.min(this.retryDelayBase * Math.pow(2, task.retries - 1), 30000);
                    }
                    
                    // 使用延迟重试
                    if (delayTime > 0) {
                        task.retryDelayTimer = setTimeout(() => {
                            // 清除定时器引用
                            task.retryDelayTimer = undefined;
                            // 将任务加入队列
                            this.taskQueue.push(task);
                            this.processQueue();
                        }, delayTime);
                    } else {
                        // 立即重试
                        this.taskQueue.push(task);
                    }
                } else {
                    // 超过重试次数，拒绝Promise
                    task.reject(error);
                    // 更换worker，因为可能存在问题
                    this.terminateWorker(worker);
                }

                // 如果没有待处理的任务，启动自动终止计时器
                if (this.taskQueue.length === 0) {
                    this.scheduleAutoTerminate();
                }
                
                // 处理下一个任务
                this.processQueue();
            });
    }

    /**
     * 关闭所有工作线程
     */
    public async terminate(): Promise<void> {
        // 停止健康检查
        this.stopHealthCheck();
        
        // 取消自动终止计时器（如果存在）
        if (this.terminateTimer) {
            clearTimeout(this.terminateTimer);
            this.terminateTimer = null;
        }
        
        // 清空任务队列并拒绝所有待处理的任务
        while (this.taskQueue.length > 0) {
            const task = this.taskQueue.shift()!;
            if (task.timeoutId) {
                clearTimeout(task.timeoutId);
            }
            task.reject(new Error('Worker pool is terminating'));
        }

        // 终止所有工作线程
        const terminationPromises = this.workers.map(async (worker) => {
            try {
                await worker.end();
            } catch (error) {
                console.error('Error terminating worker:', error);
            }
        });
        
        // 等待所有工作线程终止
        await Promise.all(terminationPromises);

        // 清空工作线程数组
        this.workers = [];
        this.idleWorkers = [];
        
        // 标记线程池为已终止
        this.isTerminated = true;
    }
    
    /**
     * 安排自动终止
     * 如果没有任务和活跃工作线程，在指定时间后自动终止线程池
     */
    private scheduleAutoTerminate(): void {
        // 如果已经有计时器，先清除它
        if (this.terminateTimer) {
            clearTimeout(this.terminateTimer);
        }
        
        // 设置新的计时器
        this.terminateTimer = setTimeout(async () => {
            // 再次检查是否没有任务且所有worker都是空闲的
            if (this.taskQueue.length === 0 && this.idleWorkers.length === this.workers.length) {
                await this.terminate();
            }
            this.terminateTimer = null;
        }, this.autoTerminateTimeout);
    }
    
    /**
     * 检查worker的健康状态
     * @param worker 要检查的工作线程
     * @returns Promise<boolean> 工作线程是否健康
     */
    private async checkWorkerHealth(worker: NcpuWorker): Promise<boolean> {
        try {
            // 执行一个简单的健康检查函数
            const result = await worker.run(() => true, []);
            return result === true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * 开始定期检查所有worker的健康状态
     * @param interval 健康检查间隔（毫秒），默认60000ms（1分钟）
     */
    public startHealthCheck(interval: number = 60000): void {
        // 先停止现有的健康检查
        this.stopHealthCheck();
        
        this.healthCheckTimer = setInterval(async () => {
            for (let i = 0; i < this.workers.length; i++) {
                const worker = this.workers[i];
                // 只检查空闲的worker，避免干扰正在执行的任务
                if (this.idleWorkers.includes(worker)) {
                    const isHealthy = await this.checkWorkerHealth(worker);
                    if (!isHealthy) {
                        this.terminateWorker(worker);
                        i--; // 调整索引，因为数组长度已经改变
                    }
                }
            }
        }, interval);
    }
    
    /**
     * 停止健康检查
     */
    public stopHealthCheck(): void {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    }

    /**
     * 获取当前活跃的工作线程数量
     */
    public get activeWorkersCount(): number {
        return this.workers.length - this.idleWorkers.length;
    }

    /**
     * 获取当前等待中的任务数量
     */
    public get pendingTasksCount(): number {
        return this.taskQueue.length;
    }

    /**
     * 获取线程池的最大工作线程数
     */
    public get maxWorkersCount(): number {
        return this.maxWorkers;
    }

    private moveOutWorker(workerList:NcpuWorker[],worker: NcpuWorker): void {
        const workerIndex = workerList.indexOf(worker);
        if (workerIndex !== -1) {
            workerList.splice(workerIndex, 1);
        }
    }
    
    /**
     * 重置线程池，终止所有工作线程并创建新的
     */
    public async reset(): Promise<void> {
        await this.terminate();
        // 重新初始化
        this.isTerminated = false;
        this.processQueue();
    }
    
    /**
     * 调整线程池大小
     * @param newSize 新的线程池大小
     */
    public async resize(newSize: number): Promise<void> {
        if (newSize < 1) {
            throw new Error('Worker pool size must be at least 1');
        }
        
        this.maxWorkers = newSize;
        
        // 如果当前工作线程数超过新的最大值，终止多余的工作线程
        if (this.workers.length > this.maxWorkers) {
            const excessWorkers = this.workers.length - this.maxWorkers;
            const workersToTerminate = [];
            
            // 优先从空闲工作线程中选择要终止的工作线程
            for (let i = 0; i < excessWorkers && this.idleWorkers.length > 0; i++) {
                const worker = this.idleWorkers.pop()!;
                workersToTerminate.push(worker);
                this.moveOutWorker(this.workers, worker);
            }
            
            // 终止选定的工作线程
            await Promise.all(workersToTerminate.map(async (worker) => {
                if (worker.worker) {
                    try {
                        await worker.end();
                    } catch (error) {
                        console.error('Error terminating worker during resize:', error);
                    }
                }
            }));
        }
        
        // 处理队列中的任务，如果需要会创建新的工作线程
        this.processQueue();
    }
    
    /**
     * 设置最大重试次数
     * @param retries 新的最大重试次数
     */
    public setMaxRetries(retries: number): void {
        if (retries < 0) {
            throw new Error('Max retries cannot be negative');
        }
        this.maxRetries = retries;
    }
    
    /**
     * 终止工作线程并创建一个新的替代它
     * @param worker 要终止的工作线程
     */
    private terminateWorker(worker: NcpuWorker): void {
        // 从工作线程数组和空闲工作线程数组中移除
        this.moveOutWorker(this.workers, worker);
        this.moveOutWorker(this.idleWorkers, worker);
        
        // 终止工作线程
        try {
            worker.end()
        } catch (error) {
            console.error('Error during worker cleanup:', error);
        }
        
        // 创建一个新的工作线程来替代它
        const newWorker = new NcpuWorker({workerOptions: this.workerOptions});
        this.workers.push(newWorker);
        
        // 如果有待处理的任务，立即处理
        if (this.taskQueue.length > 0) {
            const task = this.taskQueue.shift()!;
            this.executeTask(newWorker, task);
        } else {
            // 否则将新工作线程标记为空闲
            this.idleWorkers.push(newWorker);
        }
    }
}