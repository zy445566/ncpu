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
    error:any,
    res:any
}

parentPort.on('message', async (ncpuParams:NcpuParams) => {
    const result:NcpuResult = {key:ncpuParams.key, error:undefined, res:undefined}
    try {
        const runFunction = new Function(
            'params',
            `const func = ${ncpuParams.functionData};return func(...params);`
        );
        result.res = runFunction(ncpuParams.params);
        if(result.res instanceof Promise) {result.res = await result.res;}
    } catch(err) {
        result.error = err;
    } finally {
        parentPort.postMessage(result);
    }
})
