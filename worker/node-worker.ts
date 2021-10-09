import {
    parentPort
} from 'worker_threads';
type NcpuParams = {
    key:number,
    functionData:string,
    params:Array<any>,
    injectList:Array<string>,
}
type NcpuResult = {
    key:number,
    error:any,
    res:any
}
global['require'] = require;
parentPort.on('message', async (ncpuParams:NcpuParams) => {
    const result:NcpuResult = {key:ncpuParams.key, error:undefined, res:undefined}
    try {
        const runFunction = new Function(
            'params',...ncpuParams.injectList,
            `const func = ${ncpuParams.functionData};return func(...params);`
        );
        result.res = await runFunction(ncpuParams.params,...ncpuParams.injectList.map(key=>global[key]));
    } catch(err) {
        result.error = err;
    } finally {
        parentPort.postMessage(result);
    }
})
