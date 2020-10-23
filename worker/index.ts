import  {
    Worker
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
    worker:Worker;
    index:number;
    completeIndex:number;
    private start() {
        this.worker = new Worker(workerPath);
        this.resetIndex();
    }
    private end() {
        this.worker.terminate();
        this.worker = undefined;
        this.resetIndex();
    }
    private resetIndex() {
        this.index = 0;
        this.completeIndex = 0;
    }
    public run(func:Function,params:Array<any>) {
        const functionData = getFunctionData (func);
        if(!this.worker) { 
            this.start();
        }
        return new Promise((resolve, reject) => {
            this.index++;
            const key = this.index;
            this.worker.postMessage({
                key,functionData,params
            });
            this.worker.on('message', (res)=>{
                if(res.key===key) {
                    this.completeIndex++;
                    if(this.index===this.completeIndex) {this.end();}
                    return resolve(res.res);
                }
            });
            this.worker.on('error', (err)=>{
                this.end();
                return reject(err);
            });
        });
    }
}