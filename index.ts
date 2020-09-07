import  {
    runWorker
}  from './worker/index';
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
