import  {
    Worker
}  from 'worker_threads';
import  {
    join as pathJoin
}  from 'path';
const workerPath = pathJoin(__dirname, 'node-worker.js');

export function runWorker (options:Object):Promise<any> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(workerPath, options);
        worker.on('message', resolve);
        worker.on('error', reject);
    });
}