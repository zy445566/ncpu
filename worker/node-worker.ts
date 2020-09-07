import  {
    parentPort, workerData
}  from 'worker_threads';
const {functionString,params} = workerData;
async function run() {
    const runFunction = new Function(
        'params',
        `const func = ${functionString};return func(...params);`
    );
    let res = runFunction(params);
    if(res instanceof Promise) {res = await res;}
    parentPort.postMessage(res);
}
run();
