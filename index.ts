import  {
    NcpuWorker
}  from './worker/index';

export type NCPUOPTION  = {ncpuWorker?:NcpuWorker,injectList?:Array<string>,timeout?:number}

const DefaultNCPUOption = {ncpuWorker:new NcpuWorker(),injectList:[],timeout:-1}

export class NCPU {
    static getWorker():NcpuWorker {
        return new NcpuWorker();
    }
    static pick(func:Function, {ncpuWorker=new NcpuWorker(),injectList=[],timeout=-1}:NCPUOPTION=DefaultNCPUOption):Function {
        return (...params:Array<any>)=>{
            return ncpuWorker.run(func, params, {timeout,injectList});
        }
    }
    static run (func:Function,params:Array<any>=[], {ncpuWorker=new NcpuWorker(),injectList=[],timeout=-1}:NCPUOPTION=DefaultNCPUOption):Promise<any> {
        return ncpuWorker.run(func, params, {timeout,injectList});
    };
}
