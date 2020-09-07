import  {
    runWorker
}  from './worker/index';
function getFunctionData (func:Function):string {
    if(!(func instanceof Function)) {throw `${func} is not Function!`}
    return func.toString();
}
export class NCPU {
    static pick(func:Function):Function {
        const functionData = getFunctionData(func);
        return (...params:Array<any>)=>{
            return runWorker ({
                workerData:{
                    functionData,
                    params
                }
            })
        }
    }
    static run (func:Function,params:Array<any>=[]):Promise<any> {
        return runWorker ({
            workerData:{
                functionData:getFunctionData(func),
                params
            }
        })
    };
}
