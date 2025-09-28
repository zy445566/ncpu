import  {
    Worker,
    WorkerOptions
}  from 'worker_threads';
import  {
    join as pathJoin
}  from 'path';
const workerPath = pathJoin(__dirname, 'node-worker.js');

function getFunctionData (func:Function):string {
    if(!(func instanceof Function)) {throw `${func} is not Function!`}
    return func.toString();
}

export class NcpuWorker {
    private worker:Worker;
    private index:number;
    private workerOptions: WorkerOptions | undefined;

    constructor(options?: {workerOptions: WorkerOptions | undefined}) {
        this.workerOptions = options?.workerOptions;
    }
    
    public start() {
        if(!this.worker) {
            this.worker = new Worker(workerPath, this.workerOptions);
            this.resetIndex();
        }
    }

    public end() {
        if(this.worker) {
            this.worker.terminate();
            this.worker = undefined;
            this.resetIndex();
        }
    }

    private resetIndex() {
        this.index = 0;
    }

    public run(func:Function, params:Array<any>) {
        const functionData = getFunctionData (func);
        this.start();
        return new Promise((resolve, reject) => {
            this.index++;
            const key = this.index;
            let isTaskComplete = false;
            
            // 创建命名的事件处理函数，以便后续可以移除
            const messageHandler = (res) => {
                if(res.key === key && (!isTaskComplete)) {
                    // 移除事件监听器
                    this.worker.removeListener('message', messageHandler);
                    this.worker.removeListener('error', errorHandler);

                    isTaskComplete = true;
                    if(res.error) {return reject(res.error);}
                    return resolve(res.res);
                }
            };
            
            const errorHandler = (err) => {
                // 移除事件监听器
                this.worker.removeListener('message', messageHandler);
                this.worker.removeListener('error', errorHandler);
                
                this.end();
                return reject(err);
            };
            
            this.worker.on('message', messageHandler);
            this.worker.on('error', errorHandler);
            
            this.worker.postMessage({
                key, functionData, params
            });
        });
    }
}