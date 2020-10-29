import  {
    NcpuWorker
}  from './worker/index';

export class NCPU {
    static getWorker():NcpuWorker {
        return new NcpuWorker();
    }
    static pick(func:Function, ncpuWorker:NcpuWorker=new NcpuWorker(), timeout=-1):Function {
        return (...params:Array<any>)=>{
            return ncpuWorker.run(func, params, timeout);
        }
    }
    static run (func:Function,params:Array<any>=[], ncpuWorker:NcpuWorker=new NcpuWorker(), timeout=-1):Promise<any> {
        return ncpuWorker.run(func, params, timeout);
    };
}
