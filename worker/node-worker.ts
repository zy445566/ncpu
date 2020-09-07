import  {
    parentPort, workerData
}  from 'worker_threads';
const {functionData,params} = workerData;
async function run() {
    const runFunction = new Function(
        'params',
        `const func = ${functionData};return func(...params);`
    );
    let res = runFunction(params);
    if(res instanceof Promise) {res = await res;}
    parentPort.postMessage(res);
}
run();
