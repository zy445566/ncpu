import  {
    parentPort, workerData
}  from 'worker_threads';
const {functionString,params} = workerData;
const runFunction = new Function(
    'params',
    `const func = ${functionString};return func(...params);`
);
parentPort.postMessage(runFunction(params));