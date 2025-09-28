import { parentPort } from 'worker_threads';

parentPort.on('message', async (ncpuParams: {key: number, functionData: string, params: any[]}) => {
    const result = { key: ncpuParams.key, error: undefined, res: undefined };
    try {
        const runFunction = new Function('params', `const func = ${ncpuParams.functionData};return func(...params);`);
        result.res = await runFunction(ncpuParams.params);
    }
    catch (err) {
        // 确保错误可以被序列化
        result.error = {
            message: err.message,
            name: err.name,
            stack: err.stack
        };
    }
    finally {
        parentPort.postMessage(result);
    }
});