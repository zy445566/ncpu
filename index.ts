import  {
    NcpuWorkerPool,
    NcpuWorkerPoolOptions
}  from './worker/pool';

export type NCPUOPTION  = {ncpuWorkerPool?:NcpuWorkerPool}

// 创建一个默认的共享工作池
const defaultWorkerPool = new NcpuWorkerPool();
const DefaultNCPUOption = {ncpuWorkerPool: defaultWorkerPool};

export class NCPU {
    /**
     * 获取一个新的工作池实例
     * @param options 工作池配置选项
     * @returns 新的工作池实例
     */
    static getWorkerPool(options?: NcpuWorkerPoolOptions): NcpuWorkerPool {
        return new NcpuWorkerPool(options);
    }

    /**
     * 获取默认的共享工作池
     * @returns 默认工作池实例
     */
    static getDefaultWorkerPool(): NcpuWorkerPool {
        return defaultWorkerPool;
    }

    /**
     * 创建一个函数，该函数在工作线程中执行指定的函数
     * @param func 要在工作线程中执行的函数
     * @param options 配置选项，包括要使用的工作池
     * @returns 一个函数，调用时会在工作线程中执行指定的函数
     */
    static pick<T extends (...args: any[]) => any>(
        func: T, 
        {ncpuWorkerPool = defaultWorkerPool}: NCPUOPTION = DefaultNCPUOption
    ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
        return (...params: Parameters<T>) => {
            return ncpuWorkerPool.run(func, params) as Promise<ReturnType<T>>;
        }
    }

    /**
     * 在工作线程中执行指定的函数
     * @param func 要在工作线程中执行的函数
     * @param params 函数的参数
     * @param options 配置选项，包括要使用的工作池
     * @returns Promise，包含函数执行的结果
     */
    static run<T extends (...args: any[]) => any>(
        func: T,
        params: Parameters<T> = [] as unknown as Parameters<T>, 
        {ncpuWorkerPool = defaultWorkerPool}: NCPUOPTION = DefaultNCPUOption
    ): Promise<ReturnType<T>> {
        return ncpuWorkerPool.run(func, params) as Promise<ReturnType<T>>;
    }

    /**
     * 终止所有工作线程
     * @returns Promise，在所有工作线程终止后解析
     */
    static async terminateAll(): Promise<void> {
        await defaultWorkerPool.terminate();
    }
}
