import  {
    Worker
}  from 'worker_threads';
import  {
    join as pathJoin
}  from 'path';
const workerPath = pathJoin(__dirname, 'worker.js')

function runWorker (options:Object):Promise<any> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(workerPath, options);
        worker.on('message', resolve);
        worker.on('error', reject);
    });
}
export class NCPU {
    static pick(func:Function):Function {
        const functionString = func.toString();
        return (...params:Array<any>)=>{
            return runWorker ({
                workerData:{
                    functionString,
                    params
                }
            })
        }
    }
    static run (func:Function,params:Array<any>=[]):Promise<any> {
        return runWorker ({
            workerData:{
                functionString:func.toString(),
                params
            }
        })
    };
}
