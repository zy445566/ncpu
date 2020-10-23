import {
    parentPort
} from 'worker_threads';
type NcpuParams = {
    key:number,
    functionData:string,
    params:Array<any>
}
type NcpuResult = {
    key:number,
    res:any
}

parentPort.on('message', async (ncpuParams:NcpuParams) => {
    const runFunction = new Function(
        'params',
        `const func = ${ncpuParams.functionData};return func(...params);`
    );
    const result:NcpuResult = {key:ncpuParams.key,res:undefined}
    result.res = runFunction(ncpuParams.params);
    if(result.res instanceof Promise) {result.res = await result.res;}
    parentPort.postMessage(result);
})
