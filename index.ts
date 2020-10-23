import  {
    NcpuWorker
}  from './worker/index';

export class NCPU {
    static getWorker():NcpuWorker {
        return new NcpuWorker();
    }
    static pick(func:Function, ncpuWorker:NcpuWorker=new NcpuWorker()):Function {
        return (...params:Array<any>)=>{
            return ncpuWorker.run(func, params);
        }
    }
    static run (func:Function,params:Array<any>=[], ncpuWorker:NcpuWorker=new NcpuWorker()):Promise<any> {
        return ncpuWorker.run(func, params);
    };
}
